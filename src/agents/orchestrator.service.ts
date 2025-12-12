import { Injectable, Logger } from '@nestjs/common';
import { OrchestrationPlanner } from './planner/orchestration.planner';
import { RosterWorker } from './workers/roster.worker';
import { ComplianceWorker } from './workers/compliance.worker';
import {
  OptimizationWorker,
  type ComplianceValidator,
  type OptimizationResultWithQueries,
} from './workers/optimization.worker';
import { ConflictWorker, type ConflictResolutionResult, type CoverageGap } from './workers/conflict.worker';
import { storeTools } from './tools/store.tools';
import { employeeTools } from './tools/employee.tools';
import { loadPenaltyRulesFromDb } from './tools/fairwork.tools';
import type { IOrchestrator } from '../shared/types/orchestrator';
import type { Roster } from '../shared/types/roster';
import type { ComplianceResult, ComplianceSuggestion } from '../shared/types/compliance';
import type { EmployeeContract } from '../shared/types/employee';
import type { CoverageMetrics } from '../shared/schemas/roster-context.schema';
import type { ToolDef } from '../shared/types/tool';
import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Agent, run, tool } = require('@openai/agents');
/**
 * Communication trace message between agents
 */
export interface AgentMessage {
  timestamp: string;
  from: string;
  to: string;
  action: string;
  data?: unknown;
}

/**
 * Function to add entries to the trace
 */
type TraceFunction = (from: string, to: string, action: string, data?: unknown) => void;

/**
 * Final result from orchestrator with collaboration trace
 */
export interface OrchestrationResult {
  status: 'ok' | 'requires_human_review' | 'optimization_failed' | 'partial';
  roster: Roster;
  compliance: ComplianceResult;
  optimization?: OptimizationResultWithQueries;
  conflictResolution?: ConflictResolutionResult;
  agentTrace: AgentMessage[];
  metrics?: {
    totalDurationMs: number;
    costSavingsPercent?: number;
    suggestionsApplied?: number;
    validationQueriesCount?: number;
    coverageGapsResolved?: number;
    lastSuccessfulPhase?: string;
    error?: string;
  };
}

/**
 * Constraints for optimization
 */
interface OptimizationConstraints {
  minHoursBetweenShifts: number;
  minShiftHours: number;
  maxShiftHours: number;
}

/**
 * SchedulingOrchestrator - Coordinates collaboration between agents
 *
 * Collaboration flow (4 agents):
 * 1. RosterWorker → generates initial roster + detects coverage gaps
 * 2. ComplianceWorker → validates Fair Work and generates suggestions
 * 3. ConflictWorker → applies suggestions + resolves coverage gaps
 * 4. OptimizationWorker → optimizes costs (querying ComplianceWorker)
 * 5. ComplianceWorker → final validation (confirmation)
 *
 * The key is that each agent has a clear responsibility:
 * - RosterWorker: Initial generation
 * - ComplianceWorker: Legal validation
 * - ConflictWorker: Problem resolution
 * - OptimizationWorker: Cost improvement
 */
@Injectable()
export class SchedulingOrchestrator {
  private readonly logger = new Logger(SchedulingOrchestrator.name);
  private orchestrator: IOrchestrator<unknown, Roster> | null = null;

  // Singleton instances of workers (reused across calls)
  private readonly rosterWorker = new RosterWorker();
  private readonly complianceWorker = new ComplianceWorker();
  private readonly conflictWorker = new ConflictWorker();
  private readonly optimizationWorker = new OptimizationWorker();

  constructor() {
    this.logger.log('SchedulingOrchestrator initialized with 4 singleton workers');
    this.logger.log('Dynamic mode uses @openai/agents SDK (reads OPENAI_API_KEY from env)');
  }

  /**
   * Generates an optimized roster with compliance validation and conflict resolution
   * Implements the collaboration flow between 4 agents
   */
  async generateRoster(storeId: string, weekStart: Date): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const agentTrace: AgentMessage[] = [];
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const addTrace: TraceFunction = (from, to, action, data) => {
      agentTrace.push({
        timestamp: new Date().toISOString(),
        from,
        to,
        action,
        data: data ? this.sanitizeTraceData(data) : undefined,
      });
    };

    // Variables for partial recovery
    let workingRoster: Roster | null = null;
    let employeeContracts: EmployeeContract[] = [];
    let lastSuccessfulPhase = 'none';
    let lastError: string | undefined;

    try {
      // If we have the OpenAI agents SDK, we use it but with logging
      // TODO: When SDK is integrated, implement adapter for trace
      if (this.orchestrator) {
        this.logger.log('SDK available but using fallback for complete agent trace');
      }

      // --- FALLBACK: Manual collaboration flow (5 steps) ---

      // ═══════════════════════════════════════════════════════════════
      // STEP 1: RosterWorker - Initial generation
      // ═══════════════════════════════════════════════════════════════
      const rosterResult = await this.executeRosterGeneration(
        storeId,
        weekStart.toISOString().split('T')[0],
        weekEnd.toISOString().split('T')[0],
        addTrace,
      );
      workingRoster = rosterResult.roster;
      const coverageGaps = rosterResult.coverageGaps;
      lastSuccessfulPhase = 'roster_generation';

      // Load employee contracts
      employeeContracts = await this.loadEmployeeContracts(storeId, workingRoster, addTrace);

      // ═══════════════════════════════════════════════════════════════
      // STEP 2: ComplianceWorker - Initial validation
      // ═══════════════════════════════════════════════════════════════
      const initialCompliance = await this.executeComplianceValidation(
        workingRoster,
        employeeContracts,
        addTrace,
      );
      lastSuccessfulPhase = 'initial_compliance';

      // Check for CRITICAL issues without suggestions → immediate human review
      const hasCriticalWithoutFix =
        initialCompliance.issues?.some((i) => i.severity === 'CRITICAL') &&
        !initialCompliance.suggestions?.length;

      if (hasCriticalWithoutFix) {
        addTrace('Orchestrator', 'HumanReview', 'critical_compliance_violation', {
          issues: initialCompliance.issues?.filter((i) => i.severity === 'CRITICAL'),
        });

        return {
          status: 'requires_human_review',
          roster: workingRoster,
          compliance: initialCompliance,
          agentTrace,
          metrics: {
            totalDurationMs: Date.now() - startTime,
            lastSuccessfulPhase,
          },
        };
      }

      // ═══════════════════════════════════════════════════════════════
      // STEP 3: ConflictWorker - Apply corrections and resolve gaps
      // ═══════════════════════════════════════════════════════════════
      const conflictResult = await this.executeConflictResolution(
        workingRoster,
        initialCompliance.suggestions || [],
        coverageGaps,
        storeId,
        weekStart.toISOString().split('T')[0],
        weekEnd.toISOString().split('T')[0],
        addTrace,
      );
      workingRoster = conflictResult.roster;
      const totalGapsResolved = conflictResult.gapsResolved;
      lastSuccessfulPhase = 'conflict_resolution';

      // ═══════════════════════════════════════════════════════════════
      // STEP 4: OptimizationWorker - Cost optimization
      // ═══════════════════════════════════════════════════════════════
      const optimizationResult = await this.executeOptimization(
        workingRoster,
        storeId,
        addTrace,
      );
      workingRoster = optimizationResult.roster;
      lastSuccessfulPhase = 'optimization';

      // ═══════════════════════════════════════════════════════════════
      // STEP 5: ComplianceWorker - Final validation
      // ═══════════════════════════════════════════════════════════════
      const finalCompliance = await this.executeFinalValidation(
        workingRoster,
        employeeContracts,
        addTrace,
      );
      lastSuccessfulPhase = 'final_validation';

      // Determine final status
      const finalHasCritical = finalCompliance.issues?.some((i) => i.severity === 'CRITICAL');
      const requiresReview = conflictResult.resolution?.requiresHumanReview || finalHasCritical;

      let status: OrchestrationResult['status'] = 'ok';
      if (requiresReview) {
        status = finalHasCritical ? 'requires_human_review' : 'partial';
      }

      return {
        status,
        roster: workingRoster,
        compliance: finalCompliance,
        optimization: optimizationResult.result,
        conflictResolution: conflictResult.resolution,
        agentTrace,
        metrics: {
          totalDurationMs: Date.now() - startTime,
          costSavingsPercent: optimizationResult.result?.metrics.savingsPercent,
          suggestionsApplied:
            (conflictResult.resolution?.resolved ?? 0) +
            (optimizationResult.result?.metrics.suggestionsApplied ?? 0),
          validationQueriesCount: optimizationResult.result?.validationQueries?.length ?? 0,
          coverageGapsResolved: totalGapsResolved,
          lastSuccessfulPhase,
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      this.logger.error('Orchestration failed', error);
      addTrace('Orchestrator', 'Error', 'orchestration_failed', { error: lastError });

      // If we have a partial roster, return it with error status
      if (workingRoster) {
        return {
          status: 'partial',
          roster: workingRoster,
          compliance: { passed: false, issues: [] },
          agentTrace,
          metrics: {
            totalDurationMs: Date.now() - startTime,
            lastSuccessfulPhase,
            error: lastError,
          },
        };
      }

      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // PRIVATE METHODS - Each step of the flow
  // ═══════════════════════════════════════════════════════════════════

  /**
   * STEP 1: Generates the initial roster and validates coverage
   */
  private async executeRosterGeneration(
    storeId: string,
    weekStart: string,
    weekEnd: string,
    addTrace: TraceFunction,
  ): Promise<{ roster: Roster; coverageGaps: CoverageGap[] }> {
    addTrace('Orchestrator', 'RosterWorker', 'generate_initial_roster', { storeId, weekStart });

    const rosterTool = this.rosterWorker.tools?.find(
      (t) => t.function?.name === 'generate_initial_roster',
    );
    if (!rosterTool) {
      throw new Error('generate_initial_roster tool not found');
    }

    const initialRosterResult = (await rosterTool.function.execute({
      storeId,
      weekStart,
      weekEnd,
    })) as Roster & { metrics?: { warnings?: string[] } };

    addTrace('RosterWorker', 'Orchestrator', 'roster_generated', {
      shiftsCount: initialRosterResult.roster.length,
      warningsCount: initialRosterResult.metrics?.warnings?.length ?? 0,
    });

    // Detect coverage gaps
    let coverageGaps: CoverageGap[] = [];
    const coverageValidateTool = this.rosterWorker.tools?.find(
      (t) => t.function?.name === 'validate_coverage',
    );

    if (coverageValidateTool) {
      try {
        const staffRequirements = await storeTools.getStoreStaffRequirements.execute({ storeId });
        const coverage = (await coverageValidateTool.function.execute({
          roster: initialRosterResult,
          staffRequirements,
        })) as CoverageMetrics;

        coverageGaps = (coverage.uncoveredSlots as CoverageGap[]) || [];
        addTrace('RosterWorker', 'Orchestrator', 'coverage_validated', {
          score: coverage.coverageScore,
          gapsCount: coverageGaps.length,
        });
      } catch (err) {
        addTrace('RosterWorker', 'Orchestrator', 'coverage_validation_failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { roster: initialRosterResult, coverageGaps };
  }

  /**
   * Loads employee contracts from the roster
   */
  private async loadEmployeeContracts(
    storeId: string,
    roster: Roster,
    addTrace: TraceFunction,
  ): Promise<EmployeeContract[]> {
    const employeeIds = [...new Set(roster.roster.map((s) => s.employeeId))];

    if (employeeIds.length === 0) {
      return [];
    }

    try {
      addTrace('Orchestrator', 'EmployeeTools', 'get_employee_contracts', {
        employeeCount: employeeIds.length,
      });
      const contracts = await employeeTools.getEmployeeContracts.execute({
        storeId,
        employeeIds,
      });
      addTrace('EmployeeTools', 'Orchestrator', 'contracts_loaded', {
        count: contracts.length,
        withDefaultStation: contracts.filter((c: any) => c.defaultStationCode).length,
      });
      return contracts;
    } catch (error) {
      addTrace('EmployeeTools', 'Orchestrator', 'contracts_load_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * STEP 2: Validates initial compliance
   */
  private async executeComplianceValidation(
    roster: Roster,
    employeeContracts: EmployeeContract[],
    addTrace: TraceFunction,
  ): Promise<ComplianceResult> {
    addTrace('Orchestrator', 'ComplianceWorker', 'validate_fair_work_compliance', {
      shiftsCount: roster.roster.length,
      contractsCount: employeeContracts.length,
    });

    const complianceTool = this.complianceWorker.tools?.find(
      (t) => t.function?.name === 'validate_fair_work_compliance',
    );
    if (!complianceTool) {
      throw new Error('validate_fair_work_compliance tool not found');
    }

    const compliance = (await complianceTool.function.execute({
      roster,
      employeeContracts,
    })) as ComplianceResult;

    addTrace('ComplianceWorker', 'Orchestrator', 'compliance_validated', {
      passed: compliance.passed,
      issuesCount: compliance.issues?.length ?? 0,
      suggestionsCount: compliance.suggestions?.length ?? 0,
    });

    return compliance;
  }

  /**
   * STEP 3: Applies suggestions and resolves gaps
   * Includes iterative compliance validation to fix MIN_REST_VIOLATION issues
   */
  private async executeConflictResolution(
    roster: Roster,
    suggestions: ComplianceSuggestion[],
    coverageGaps: CoverageGap[],
    storeId: string,
    weekStart: string,
    weekEnd: string,
    addTrace: TraceFunction,
  ): Promise<{
    roster: Roster;
    resolution: ConflictResolutionResult | undefined;
    gapsResolved: number;
  }> {
    let workingRoster = roster;
    let conflictResolution: ConflictResolutionResult | undefined;
    let totalGapsResolved = 0;

    // 3.1: Apply ComplianceWorker suggestions
    if (suggestions.length > 0) {
      addTrace('Orchestrator', 'ConflictWorker', 'apply_suggestions', {
        suggestionsCount: suggestions.length,
      });

      const applySuggestionsTool = this.conflictWorker.tools?.find(
        (t) => t.function?.name === 'apply_suggestions',
      );

      if (applySuggestionsTool) {
        const result = (await applySuggestionsTool.function.execute({
          roster: workingRoster,
          suggestions,
        })) as ConflictResolutionResult;

        workingRoster = result.roster;
        conflictResolution = result;

        addTrace('ConflictWorker', 'Orchestrator', 'suggestions_applied', {
          resolved: result.resolved,
          unresolved: result.unresolved,
          actionsCount: result.actions.length,
        });
      }
    }

    // 3.2: Resolve coverage gaps
    if (coverageGaps.length > 0) {
      addTrace('Orchestrator', 'ConflictWorker', 'resolve_coverage_gaps', {
        gapsCount: coverageGaps.length,
      });

      const resolveGapsTool = this.conflictWorker.tools?.find(
        (t) => t.function?.name === 'resolve_coverage_gaps',
      );

      if (resolveGapsTool) {
        const result = (await resolveGapsTool.function.execute({
          roster: workingRoster,
          gaps: coverageGaps,
          storeId,
          weekStart,
          weekEnd,
        })) as ConflictResolutionResult;

        workingRoster = result.roster;
        totalGapsResolved = result.resolved;

        // Merge with previous conflictResolution if exists
        if (conflictResolution) {
          conflictResolution = {
            ...conflictResolution,
            roster: result.roster,
            resolved: conflictResolution.resolved + result.resolved,
            unresolved: conflictResolution.unresolved + result.unresolved,
            actions: [...conflictResolution.actions, ...result.actions],
            warnings: [...conflictResolution.warnings, ...result.warnings],
            requiresHumanReview:
              conflictResolution.requiresHumanReview || result.requiresHumanReview,
          };
        } else {
          conflictResolution = result;
        }

        addTrace('ConflictWorker', 'Orchestrator', 'gaps_resolved', {
          resolved: result.resolved,
          unresolved: result.unresolved,
          newShiftsCount: workingRoster.roster.length,
        });
      }
    }

    // 3.3: Iterative compliance validation - ConflictWorker ↔ ComplianceWorker collaboration
    // After resolving gaps, validate compliance and fix any MIN_REST_VIOLATION issues
    const MAX_COMPLIANCE_ITERATIONS = 3;
    const complianceTool = this.complianceWorker.tools?.find(
      (t) => t.function?.name === 'validate_fair_work_compliance',
    );
    const applySuggestionsTool = this.conflictWorker.tools?.find(
      (t) => t.function?.name === 'apply_suggestions',
    );

    if (complianceTool && applySuggestionsTool && workingRoster.roster.length > 0) {
      for (let iteration = 0; iteration < MAX_COMPLIANCE_ITERATIONS; iteration++) {
        addTrace('Orchestrator', 'ComplianceWorker', 'iterative_compliance_check', {
          iteration: iteration + 1,
          shiftsCount: workingRoster.roster.length,
        });

        // Validate compliance
        const compliance = (await complianceTool.function.execute({
          roster: workingRoster,
          employeeContracts: [], // No contracts needed for rest period validation
        })) as ComplianceResult;

        // Count critical issues (especially MIN_REST_VIOLATION)
        const criticalIssues = compliance.issues?.filter(
          (i) => i.severity === 'CRITICAL' && i.issue === 'MIN_REST_VIOLATION',
        ) || [];

        addTrace('ComplianceWorker', 'ConflictWorker', 'compliance_feedback', {
          iteration: iteration + 1,
          passed: compliance.passed,
          criticalRestViolations: criticalIssues.length,
          suggestionsCount: compliance.suggestions?.length || 0,
        });

        // If no critical rest violations, we're done
        if (criticalIssues.length === 0 || !compliance.suggestions?.length) {
          addTrace('Orchestrator', 'ConflictWorker', 'compliance_converged', {
            iteration: iteration + 1,
            finalShiftsCount: workingRoster.roster.length,
          });
          break;
        }

        // Apply suggestions to fix rest violations
        addTrace('ConflictWorker', 'ComplianceWorker', 'applying_rest_fixes', {
          iteration: iteration + 1,
          suggestionsToApply: Math.min(compliance.suggestions.length, 50), // Limit per iteration
        });

        // Only apply suggestions related to MIN_REST_VIOLATION (MOVE_SHIFT type)
        const restFixSuggestions = compliance.suggestions.filter(
          (s) => s.relatedIssue === 'MIN_REST_VIOLATION' && s.type === 'MOVE_SHIFT',
        ).slice(0, 50); // Limit to avoid too many changes at once

        if (restFixSuggestions.length === 0) {
          // No actionable suggestions, break
          break;
        }

        const fixResult = (await applySuggestionsTool.function.execute({
          roster: workingRoster,
          suggestions: restFixSuggestions,
        })) as ConflictResolutionResult;

        workingRoster = fixResult.roster;

        // Update resolution stats
        if (conflictResolution) {
          conflictResolution = {
            ...conflictResolution,
            roster: workingRoster,
            resolved: conflictResolution.resolved + fixResult.resolved,
            actions: [...conflictResolution.actions, ...fixResult.actions],
            warnings: [...conflictResolution.warnings, ...fixResult.warnings],
          };
        }

        addTrace('ConflictWorker', 'Orchestrator', 'rest_fixes_applied', {
          iteration: iteration + 1,
          fixesApplied: fixResult.resolved,
          remainingShifts: workingRoster.roster.length,
        });
      }

      // === CORRECTIVE ELIMINATION: Remove shifts causing persistent violations ===
      // After 3 iterations of trying to move shifts, remove any that still cause violations
      addTrace('Orchestrator', 'ComplianceWorker', 'final_violation_check', {
        shiftsCount: workingRoster.roster.length,
      });

      const finalCompliance = (await complianceTool.function.execute({
        roster: workingRoster,
        employeeContracts: [],
      })) as ComplianceResult;

      const remainingViolations = finalCompliance.issues?.filter(
        (i) => i.severity === 'CRITICAL' && i.issue === 'MIN_REST_VIOLATION',
      ) || [];

      if (remainingViolations.length > 0) {
        addTrace('ConflictWorker', 'Orchestrator', 'removing_violating_shifts', {
          violationsToRemove: Math.min(remainingViolations.length, 50),
        });

        // Get unique shift indices that cause violations (remove duplicates, sort descending)
        const shiftIndicesToRemove = [...new Set(
          remainingViolations.map((v) => v.details?.shiftIndex).filter((i): i is number => typeof i === 'number'),
        )].sort((a, b) => b - a); // Sort descending to remove from end first

        // Remove up to 50 violating shifts (to avoid removing too many)
        let removed = 0;
        for (const index of shiftIndicesToRemove.slice(0, 50)) {
          if (index >= 0 && index < workingRoster.roster.length) {
            const removedShift = workingRoster.roster[index];
            workingRoster.roster.splice(index, 1);
            removed++;

            if (conflictResolution) {
              conflictResolution.actions.push({
                type: 'REMOVE_SHIFT',
                description: `Removed shift for ${removedShift.employeeId} on ${removedShift.start.split('T')[0]} due to rest violation`,
                success: true,
                employeeId: removedShift.employeeId,
              });
            }
          }
        }

        addTrace('ConflictWorker', 'Orchestrator', 'violating_shifts_removed', {
          removed,
          finalShiftsCount: workingRoster.roster.length,
        });

        if (conflictResolution) {
          conflictResolution.warnings.push(
            `Removed ${removed} shifts to comply with minimum rest requirements`,
          );
        }
      }
    }

    return { roster: workingRoster, resolution: conflictResolution, gapsResolved: totalGapsResolved };
  }

  /**
   * STEP 4: Optimizes roster costs
   */
  private async executeOptimization(
    roster: Roster,
    storeId: string,
    addTrace: TraceFunction,
  ): Promise<{ roster: Roster; result: OptimizationResultWithQueries | undefined }> {
    addTrace('Orchestrator', 'OptimizationWorker', 'optimize_roster', {
      shiftsCount: roster.roster.length,
    });

    const optimizationTool = this.optimizationWorker.tools?.find(
      (t) => t.function?.name === 'optimize_roster',
    );

    if (!optimizationTool) {
      return { roster, result: undefined };
    }

    // Load penalty rules for optimization
    const penaltyRules = await loadPenaltyRulesFromDb(storeId);

    // Load policy constraints
    let constraints: OptimizationConstraints = {
      minHoursBetweenShifts: 10,
      minShiftHours: 3,
      maxShiftHours: 12,
    };
    try {
      const policy = await storeTools.getStorePolicy.execute({ storeId });
      if (policy) {
        constraints.minHoursBetweenShifts = policy.minHoursBetweenShifts ?? 10;
      }
    } catch {
      // Use defaults
    }

    // Create validator so OptimizationWorker can query ComplianceWorker
    const complianceValidator = this.createComplianceValidator(addTrace);

    addTrace('Orchestrator', 'OptimizationWorker', 'inject_compliance_validator', {
      note: 'OptimizationWorker will query ComplianceWorker for each optimization',
    });

    const optimizationResult = (await optimizationTool.function.execute({
      roster,
      complianceFeedback: {
        issues: [],
        suggestions: [], // Ya fueron aplicadas por ConflictWorker
      },
      constraints,
      penaltyRules,
      complianceValidator,
    })) as OptimizationResultWithQueries;

    addTrace('OptimizationWorker', 'Orchestrator', 'optimization_complete', {
      score: optimizationResult.score,
      savingsPercent: optimizationResult.metrics.savingsPercent,
      validationQueries: optimizationResult.validationQueries?.length ?? 0,
      queriesPassed: optimizationResult.validationQueries?.filter((q) => q.passed).length ?? 0,
    });

    return { roster: optimizationResult.roster, result: optimizationResult };
  }

  /**
   * STEP 5: Final compliance validation
   */
  private async executeFinalValidation(
    roster: Roster,
    employeeContracts: EmployeeContract[],
    addTrace: TraceFunction,
  ): Promise<ComplianceResult> {
    addTrace('Orchestrator', 'ComplianceWorker', 'final_validation', {
      shiftsCount: roster.roster.length,
    });

    const complianceTool = this.complianceWorker.tools?.find(
      (t) => t.function?.name === 'validate_fair_work_compliance',
    );
    if (!complianceTool) {
      throw new Error('validate_fair_work_compliance tool not found');
    }

    const finalCompliance = (await complianceTool.function.execute({
      roster,
      employeeContracts, // Usar los contratos cargados
    })) as ComplianceResult;

    addTrace('ComplianceWorker', 'Orchestrator', 'final_compliance_result', {
      passed: finalCompliance.passed,
      issuesCount: finalCompliance.issues?.length ?? 0,
    });

    return finalCompliance;
  }

  /**
   * Creates a compliance validator that can be injected into OptimizationWorker
   * This allows OptimizationWorker to query ComplianceWorker without duplicating logic
   */
  private createComplianceValidator(addTrace: TraceFunction): ComplianceValidator {
    const complianceTool = this.complianceWorker.tools?.find(
      (t) => t.function?.name === 'validate_fair_work_compliance',
    );

    return async (roster: Roster): Promise<ComplianceResult> => {
      // Record the query in the trace
      addTrace('OptimizationWorker', 'ComplianceWorker', 'validate_proposed_change', {
        shiftsCount: roster.roster.length,
      });

      if (!complianceTool) {
        return { passed: true, issues: [] };
      }

      const result = (await complianceTool.function.execute({
        roster,
        employeeContracts: [],
      })) as ComplianceResult;

      // Record the response
      addTrace('ComplianceWorker', 'OptimizationWorker', 'validation_response', {
        passed: result.passed,
        criticalIssues: result.issues?.filter((i) => i.severity === 'CRITICAL').length ?? 0,
      });

      return result;
    };
  }

  /**
   * Generates a roster using the official @openai/agents SDK (dynamic mode)
   * The agent decides which tools to execute based on context
   */
  async generateRosterDynamic(storeId: string, weekStart: Date): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const agentTrace: AgentMessage[] = [];
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const addTrace: TraceFunction = (from, to, action, data) => {
      agentTrace.push({
        timestamp: new Date().toISOString(),
        from,
        to,
        action,
        data: data ? this.sanitizeTraceData(data) : undefined,
      });
    };

    // Shared state between tools
    let workingRoster: Roster | null = null;
    let employeeContracts: EmployeeContract[] = [];
    let complianceResult: ComplianceResult = { passed: true, issues: [], summary: 'Not yet validated' };
    let conflictResult: ConflictResolutionResult | undefined;
    let optimizationResult: OptimizationResultWithQueries | undefined;

    // References needed for closures
    const self = this;

    // Create tools using the SDK
    const generateRosterTool = tool({
      name: 'generate_roster',
      description: 'Generate initial roster based on employee availability, store requirements, and shift codes. Call this first.',
      parameters: z.object({}),
      execute: async () => {
        addTrace('Agent', 'RosterWorker', 'generate_roster', { storeId });
        const result = await self.executeRosterGeneration(
          storeId,
          weekStart.toISOString().split('T')[0],
          weekEnd.toISOString().split('T')[0],
          addTrace,
        );
        workingRoster = result.roster;
        employeeContracts = await self.loadEmployeeContracts(storeId, workingRoster, addTrace);
        return JSON.stringify({
          success: true,
          shiftsGenerated: workingRoster.roster.length,
          coverageGapsCount: result.coverageGaps.length,
        });
      },
    });

    const validateComplianceTool = tool({
      name: 'validate_compliance',
      description: 'Validate the roster against Australian Fair Work Act. Checks rest periods, max hours, and penalty rates.',
      parameters: z.object({}),
      execute: async () => {
        if (!workingRoster) {
          return JSON.stringify({ error: 'No roster generated yet. Call generate_roster first.' });
        }
        addTrace('Agent', 'ComplianceWorker', 'validate_compliance', {});
        complianceResult = await self.executeComplianceValidation(
          workingRoster,
          employeeContracts,
          addTrace,
        );
        return JSON.stringify({
          passed: complianceResult.passed,
          issuesCount: complianceResult.issues.length,
          criticalCount: complianceResult.issues.filter(i => i.severity === 'CRITICAL').length,
          suggestions: complianceResult.suggestions?.length || 0,
        });
      },
    });

    const resolveConflictsTool = tool({
      name: 'resolve_conflicts',
      description: 'Resolve coverage gaps and apply compliance suggestions. Call after validation if there are issues.',
      parameters: z.object({}),
      execute: async () => {
        if (!workingRoster) {
          return JSON.stringify({ error: 'No roster generated yet.' });
        }
        addTrace('Agent', 'ConflictWorker', 'resolve_conflicts', {});
        const rosterResult = await self.executeRosterGeneration(
          storeId,
          weekStart.toISOString().split('T')[0],
          weekEnd.toISOString().split('T')[0],
          addTrace,
        );
        const conflictResultData = await self.executeConflictResolution(
          workingRoster,
          complianceResult.suggestions || [],
          rosterResult.coverageGaps,
          storeId,
          weekStart.toISOString().split('T')[0],
          weekEnd.toISOString().split('T')[0],
          addTrace,
        );
        workingRoster = conflictResultData.roster;
        conflictResult = conflictResultData.resolution;
        return JSON.stringify({
          resolved: conflictResultData.gapsResolved,
          unresolved: conflictResult?.unresolved ?? 0,
          requiresHumanReview: conflictResult?.requiresHumanReview ?? false,
        });
      },
    });

    const optimizeRosterTool = tool({
      name: 'optimize_roster',
      description: 'Optimize the roster to minimize costs while maintaining compliance. Call after conflicts are resolved.',
      parameters: z.object({}),
      execute: async () => {
        if (!workingRoster) {
          return JSON.stringify({ error: 'No roster generated yet.' });
        }
        addTrace('Agent', 'OptimizationWorker', 'optimize_roster', {});
        const optResult = await self.executeOptimization(
          workingRoster,
          storeId,
          addTrace,
        );
        workingRoster = optResult.roster;
        optimizationResult = optResult.result;
        return JSON.stringify({
          score: optimizationResult?.score ?? 0,
          savingsPercent: optimizationResult?.metrics.savingsPercent ?? 0,
          shiftsModified: optimizationResult?.metrics.shiftsModified ?? 0,
        });
      },
    });

    // Create the orchestrator agent
    const orchestratorAgent = new Agent({
      name: 'SchedulingOrchestrator',
      instructions: `You are the Scheduling Orchestrator for McDonald's Australia restaurant ${storeId}.

Your goal is to generate an optimized staff roster for the week ${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}.

AVAILABLE TOOLS:
1. generate_roster - Creates initial roster from employee availability. Returns shiftsGenerated and coverageGapsCount.
2. validate_compliance - Checks Australian Fair Work Act compliance
3. resolve_conflicts - CRITICAL: Fills coverage gaps and applies suggestions. MUST be called if coverageGapsCount > 0.
4. optimize_roster - Minimizes labor costs while maintaining compliance

MANDATORY WORKFLOW (execute ALL steps in order):
1. Call generate_roster to create the initial schedule
2. Call validate_compliance to check for labor law issues
3. Call resolve_conflicts - THIS IS REQUIRED to fill coverage gaps and generate actual shifts!
4. Call optimize_roster to reduce costs
5. Call validate_compliance again as final check

IMPORTANT:
- The initial roster may have 0 shifts and many coverage gaps - this is NORMAL!
- resolve_conflicts is the step that FILLS the gaps and CREATES the actual shifts
- You MUST call resolve_conflicts even if compliance passes, because it generates the actual shifts
- Only skip resolve_conflicts if coverageGapsCount is 0 AND shiftsGenerated > 0

Respond with a brief summary when complete.`,
      tools: [generateRosterTool, validateComplianceTool, resolveConflictsTool, optimizeRosterTool],
    });

    addTrace('Orchestrator', 'Agent', 'sdk_orchestration_started', {
      storeId,
      weekStart: weekStart.toISOString().split('T')[0],
    });

    try {
      // Execute the agent using the SDK
      const result = await run(
        orchestratorAgent,
        `Generate an optimized roster for store ${storeId} for the week starting ${weekStart.toISOString().split('T')[0]}. Execute the full workflow: generate roster, validate compliance, resolve any conflicts, optimize costs, and perform final validation.`
      );

      addTrace('Agent', 'Orchestrator', 'sdk_orchestration_complete', {
        finalOutput: result.finalOutput?.substring(0, 200),
      });

      this.logger.log(`SDK orchestration complete: ${result.finalOutput?.substring(0, 100)}`);
    } catch (error) {
      this.logger.error('SDK orchestration failed:', error);
      addTrace('Orchestrator', 'Error', 'sdk_orchestration_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Build final result
    const endTime = Date.now();
    const status: OrchestrationResult['status'] = 
      !workingRoster ? 'optimization_failed' :
      complianceResult.issues.some(i => i.severity === 'CRITICAL') ? 'requires_human_review' :
      'ok';

    return {
      status,
      roster: workingRoster || this.createEmptyRoster(storeId, weekStart),
      compliance: complianceResult,
      optimization: optimizationResult,
      conflictResolution: conflictResult,
      agentTrace,
      metrics: {
        totalDurationMs: endTime - startTime,
        costSavingsPercent: optimizationResult?.metrics.savingsPercent,
        coverageGapsResolved: conflictResult?.resolved,
        lastSuccessfulPhase: 'sdk_dynamic_orchestration',
      },
    };
  }


  /**
   * Creates an empty roster for error cases
   */
  private createEmptyRoster(storeId: string, weekStart: Date): Roster {
    return {
      storeId,
      weekStart: weekStart.toISOString().split('T')[0],
      roster: [],
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Sanitizes data for the trace (avoids very large objects)
   */
  private sanitizeTraceData(data: unknown): unknown {
    if (data === null || data === undefined) return data;
    if (typeof data !== 'object') return data;

    const str = JSON.stringify(data);
    if (str.length > 500) {
      return { _truncated: true, preview: str.substring(0, 200) + '...' };
    }
    return data;
  }
}
