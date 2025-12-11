import { Injectable, Logger } from '@nestjs/common';
import { OrchestrationPlanner } from './planner/orchestration.planner';
import { RosterWorker } from './workers/roster.worker';
import { ComplianceWorker } from './workers/compliance.worker';
import {
  OptimizationWorker,
  type ComplianceValidator,
  type OptimizationResultWithQueries,
} from './workers/optimization.worker';
import { storeTools } from './tools/store.tools';
import { employeeTools } from './tools/employee.tools';
import { loadPenaltyRulesFromDb } from './tools/fairwork.tools';
import type { IOrchestrator } from '../shared/types/orchestrator';
import type { Roster } from '../shared/types/roster';
import type { ComplianceResult } from '../shared/types/compliance';
import type { EmployeeContract } from '../shared/types/employee';

export interface AgentMessage {
  timestamp: string;
  from: string;
  to: string;
  action: string;
  data?: unknown;
}

export interface OrchestrationResult {
  status: 'ok' | 'requires_human_review' | 'optimization_failed' | 'partial';
  roster: Roster;
  compliance: ComplianceResult;
  optimization?: OptimizationResultWithQueries;
  agentTrace: AgentMessage[];
  metrics?: {
    totalDurationMs: number;
    costSavingsPercent?: number;
    suggestionsApplied?: number;
    validationQueriesCount?: number;
  };
}

@Injectable()
export class SchedulingOrchestrator {
  private readonly logger = new Logger(SchedulingOrchestrator.name);
  private orchestrator: IOrchestrator<unknown, Roster> | null = null;

  constructor() {
    this.logger.log('SchedulingOrchestrator initialized with 3 workers (Strict Compliance Pattern)');
    try {
      const OrchestratorClass = require('@openai/agents')?.Orchestrator;
      const planner = new OrchestrationPlanner();
      const workers = [
        new RosterWorker(),
        new ComplianceWorker(),
        new OptimizationWorker(),
      ];
      if (OrchestratorClass) {
        this.orchestrator = new OrchestratorClass({
          planner,
          workers,
          config: { maxSteps: 30, timeout: 90_000 },
        });
      }
    } catch {
      this.logger.warn('OpenAI agents Orchestrator not initialized, running in fallback mode');
      this.orchestrator = null;
    }
  }

  /**
   * Executes a tool function with retry logic and strict return typing.
   * Retries up to 3 times with exponential backoff if execution fails.
   */
  private async executeToolWithRetry<T>(
    toolName: string,
    executeFn: (args: unknown) => Promise<unknown>,
    args: unknown,
    retries = 3,
    delayMs = 1000,
  ): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i < retries; i++) {
      try {
        return (await executeFn(args)) as T;
      } catch (error) {
        lastError = error;
        this.logger.warn(`Tool ${toolName} failed (attempt ${i + 1}/${retries})`, error);
        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, i)));
        }
      }
    }
    throw lastError;
  }

  private createComplianceValidator(
    complianceTool: any,
    addTrace: (from: string, to: string, action: string, data?: unknown) => void,
    employeeContracts: EmployeeContract[],
  ): ComplianceValidator {
    return async (roster: Roster): Promise<ComplianceResult> => {
      addTrace('OptimizationWorker', 'ComplianceWorker', 'validate_proposed_change', {
        shiftsCount: roster.roster.length,
      });

      // Use retry for validation calls as well to ensure robustness
      const result = await this.executeToolWithRetry<ComplianceResult>(
        'validate_fair_work_compliance',
        (args) => complianceTool.function.execute(args),
        {
          roster,
          employeeContracts,
        },
      );

      addTrace('ComplianceWorker', 'OptimizationWorker', 'validation_response', {
        passed: result.passed,
        criticalIssues: result.issues?.filter((i: any) => i.severity === 'CRITICAL').length ?? 0,
      });

      return result;
    };
  }

  /**
   * Coordinates the scheduling process enforcing strict compliance.
   * Flow: Roster Generation -> Initial Compliance Check -> Optimization (with strict validation) -> Safety Net Compliance Check.
   * Handles context loading, worker coordination, and trace logging.
   */
  async generateRoster(storeId: string, weekStart: Date): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const agentTrace: AgentMessage[] = [];
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const addTrace = (from: string, to: string, action: string, data?: unknown) => {
      agentTrace.push({
        timestamp: new Date().toISOString(),
        from,
        to,
        action,
        data: data ? this.sanitizeTraceData(data) : undefined,
      });
    };

    try {
      this.logger.log(`Starting orchestration for store ${storeId}, week ${weekStart.toISOString()}`);

      addTrace('Orchestrator', 'Context', 'load_context');

      addTrace('Orchestrator', 'RosterWorker', 'generate_initial_roster');
      const rosterWorker = new RosterWorker();
      const rosterTool = rosterWorker.tools?.find(
        (t) => t.function?.name === 'generate_initial_roster',
      );
      if (!rosterTool) throw new Error('generate_initial_roster tool not found');

      const initialRosterResult = await this.executeToolWithRetry<Roster & { metrics?: { warnings?: string[] } }>(
        'generate_initial_roster',
        (args) => rosterTool.function!.execute(args),
        {
          storeId,
          weekStart: weekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
        },
      );

      let workingRoster: Roster = initialRosterResult;

      addTrace('RosterWorker', 'Orchestrator', 'roster_generated', {
        shiftsCount: workingRoster.roster.length,
        warningsCount: initialRosterResult.metrics?.warnings?.length ?? 0,
      });

      const employeeIds = [...new Set(workingRoster.roster.map((s) => s.employeeId))];
      let employeeContracts: EmployeeContract[] = [];
      try {
        if (employeeIds.length > 0) {
          employeeContracts = await this.executeToolWithRetry<EmployeeContract[]>(
            'getEmployeeContracts',
            (args) => employeeTools.getEmployeeContracts.execute(args as { storeId: string; employeeIds: string[] }),
            {
              storeId,
              employeeIds,
            },
          );
        }
      } catch (e) {
        this.logger.warn('Failed to load contracts', e);
      }

      const complianceWorker = new ComplianceWorker();
      const complianceTool = complianceWorker.tools?.find(
        (t) => t.function?.name === 'validate_fair_work_compliance',
      );
      if (!complianceTool) throw new Error('validate_fair_work_compliance tool not found');

      addTrace('Orchestrator', 'ComplianceWorker', 'validate_initial_roster');
      const initialCompliance = await this.executeToolWithRetry<ComplianceResult>(
        'validate_fair_work_compliance',
        (args) => complianceTool.function!.execute(args),
        {
          roster: workingRoster,
          employeeContracts,
        },
      );

      addTrace('ComplianceWorker', 'Orchestrator', 'initial_compliance_result', {
        passed: initialCompliance.passed,
        issues: initialCompliance.issues?.length ?? 0,
        critical: initialCompliance.issues?.filter(i => i.severity === 'CRITICAL').length ?? 0
      });

      addTrace('Orchestrator', 'OptimizationWorker', 'optimize_roster');
      const optimizationWorker = new OptimizationWorker();
      const optimizationTool = optimizationWorker.tools?.find(t => t.function?.name === 'optimize_roster');

      let optimizationResult: OptimizationResultWithQueries | undefined;

      const hasCriticalIssues = initialCompliance.issues?.some(i => i.severity === 'CRITICAL');

      if (!hasCriticalIssues && optimizationTool) {
        const penaltyRules = await loadPenaltyRulesFromDb(storeId);
        let constraints = { minHoursBetweenShifts: 10, minShiftHours: 3, maxShiftHours: 12 };
        try {
          // Attempt to load policy with retry
          const policy = await this.executeToolWithRetry<{ minHoursBetweenShifts?: number } | null>(
            'getStorePolicy',
            (args) => storeTools.getStorePolicy.execute(args as { storeId: string }),
            { storeId }
          );
          if (policy) constraints.minHoursBetweenShifts = policy.minHoursBetweenShifts ?? 10;
        } catch { }

        const validator = this.createComplianceValidator(complianceTool, addTrace, employeeContracts);

        optimizationResult = await this.executeToolWithRetry<OptimizationResultWithQueries>(
          'optimize_roster',
          (args) => optimizationTool.function!.execute(args),
          {
            roster: workingRoster,
            complianceFeedback: {
              issues: initialCompliance.issues,
              suggestions: initialCompliance.suggestions
            },
            constraints,
            penaltyRules,
            complianceValidator: validator
          },
        );

        workingRoster = optimizationResult.roster;

        addTrace('OptimizationWorker', 'Orchestrator', 'optimization_complete', {
          score: optimizationResult.score,
          savings: optimizationResult.metrics.savingsPercent,
          suggestionsApplied: optimizationResult.metrics.suggestionsApplied,
          validatedQueries: optimizationResult.validationQueries?.length
        });
      } else {
        addTrace('Orchestrator', 'OptimizationWorker', 'skipped_optimization', {
          reason: hasCriticalIssues ? 'Critical compliance issues present' : 'Optimization tool not found or not applicable'
        });
      }

      // Final Check (Safety Net)
      addTrace('Orchestrator', 'ComplianceWorker', 'final_safety_check');
      const finalCompliance = await this.executeToolWithRetry<ComplianceResult>(
        'validate_fair_work_compliance',
        (args) => complianceTool.function!.execute(args),
        {
          roster: workingRoster,
          employeeContracts,
        },
      );

      const finalHasCritical = finalCompliance.issues?.some((i) => i.severity === 'CRITICAL');
      addTrace('ComplianceWorker', 'Orchestrator', 'final_result', {
        passed: finalCompliance.passed,
        critical: finalHasCritical,
        summary: finalCompliance.summary
      });

      let status: OrchestrationResult['status'] = 'ok';
      if (finalHasCritical) {
        status = 'requires_human_review';
      } else if (optimizationResult?.metrics.suggestionsApplied === 0 && initialCompliance.suggestions?.length && initialCompliance.suggestions.length > 0) {
        status = 'partial';
      }

      return {
        status,
        roster: workingRoster,
        compliance: finalCompliance,
        optimization: optimizationResult,
        agentTrace,
        metrics: {
          totalDurationMs: Date.now() - startTime,
          costSavingsPercent: optimizationResult?.metrics.savingsPercent,
          suggestionsApplied: optimizationResult?.metrics.suggestionsApplied ?? 0,
          validationQueriesCount: optimizationResult?.validationQueries?.length ?? 0,
        },
      };

    } catch (error) {
      this.logger.error('Orchestration failed', error);
      addTrace('Orchestrator', 'Error', 'orchestration_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private sanitizeTraceData(data: unknown): unknown {
    if (data === null || data === undefined) return data;
    if (typeof data !== 'object') return data;

    try {
      const str = JSON.stringify(data);
      if (str.length > 500) {
        return { _truncated: true, preview: str.substring(0, 200) + '...' };
      }
      return data;
    } catch {
      return '[Circular/Unserializable]';
    }
  }
}
