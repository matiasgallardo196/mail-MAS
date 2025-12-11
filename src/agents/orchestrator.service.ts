import { Injectable, Logger } from '@nestjs/common';
import { OrchestrationPlanner } from './planner/orchestration.planner';
import { RosterWorker } from './workers/roster.worker';
import { ComplianceWorker } from './workers/compliance.worker';
import {
  OptimizationWorker,
  type ComplianceValidator,
  type OptimizationResultWithQueries,
} from './workers/optimization.worker';
import { ConflictWorker, type ConflictResolutionResult } from './workers/conflict.worker';
import { storeTools } from './tools/store.tools';
import { employeeTools } from './tools/employee.tools';
import { loadPenaltyRulesFromDb } from './tools/fairwork.tools';
import type { IOrchestrator } from '../shared/types/orchestrator';
import type { Roster } from '../shared/types/roster';
import type { ComplianceResult } from '../shared/types/compliance';
import type { EmployeeContract } from '../shared/types/employee';

/**
 * Mensaje del trace de comunicación entre agents
 */
export interface AgentMessage {
  timestamp: string;
  from: string;
  to: string;
  action: string;
  data?: unknown;
}

/**
 * Resultado final del orchestrator con trace de colaboración
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
  };
}

/**
 * SchedulingOrchestrator - Coordina la colaboración entre agents
 *
 * Flujo de colaboración (4 agents):
 * 1. RosterWorker → genera roster inicial + detecta coverage gaps
 * 2. ComplianceWorker → valida Fair Work y genera suggestions
 * 3. ConflictWorker → aplica suggestions + resuelve coverage gaps
 * 4. OptimizationWorker → optimiza costos (consultando a ComplianceWorker)
 * 5. ComplianceWorker → validación final (confirmación)
 *
 * La clave es que cada agent tiene una responsabilidad clara:
 * - RosterWorker: Generación inicial
 * - ComplianceWorker: Validación legal
 * - ConflictWorker: Resolución de problemas
 * - OptimizationWorker: Mejora de costos
 */
@Injectable()
export class SchedulingOrchestrator {
  private readonly logger = new Logger(SchedulingOrchestrator.name);
  private orchestrator: IOrchestrator<unknown, Roster> | null = null;

  constructor() {
    this.logger.log('SchedulingOrchestrator initialized with 4 workers');
    try {
      const OrchestratorClass = require('@openai/agents')?.Orchestrator;
      const planner = new OrchestrationPlanner();
      const workers = [
        new RosterWorker(),
        new ComplianceWorker(),
        new ConflictWorker(),
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
   * Crea un validador de compliance que puede ser inyectado al OptimizationWorker
   * Esto permite que OptimizationWorker consulte a ComplianceWorker sin duplicar lógica
   */
  private createComplianceValidator(
    complianceTool: any,
    addTrace: (from: string, to: string, action: string, data?: unknown) => void,
  ): ComplianceValidator {
    return async (roster: Roster): Promise<ComplianceResult> => {
      // Registrar la consulta en el trace
      addTrace('OptimizationWorker', 'ComplianceWorker', 'validate_proposed_change', {
        shiftsCount: roster.roster.length,
      });

      const result = await complianceTool.function.execute({
        roster,
        employeeContracts: [],
      });

      // Registrar la respuesta
      addTrace('ComplianceWorker', 'OptimizationWorker', 'validation_response', {
        passed: result.passed,
        criticalIssues: result.issues?.filter((i: any) => i.severity === 'CRITICAL').length ?? 0,
      });

      return result;
    };
  }

  /**
   * Genera un roster optimizado con validación de compliance y resolución de conflictos
   * Implementa el flujo de colaboración entre 4 agents
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
      // Si tenemos el SDK de OpenAI agents, usarlo
      if (this.orchestrator) {
        const result = await this.orchestrator.run({
          task: `Generar roster para store ${storeId} starting ${weekStart.toISOString()}`,
          context: { storeId, weekStart: weekStart.toISOString() },
        });
        return {
          status: 'ok',
          roster: result as Roster,
          compliance: { passed: true, issues: [] },
          agentTrace,
          metrics: { totalDurationMs: Date.now() - startTime },
        };
      }

      // --- FALLBACK: Flujo de colaboración manual (4 agents) ---

      // ═══════════════════════════════════════════════════════════════
      // PASO 1: RosterWorker - Generación inicial
      // ═══════════════════════════════════════════════════════════════
      addTrace('Orchestrator', 'RosterWorker', 'generate_initial_roster');
      const rosterWorker = new RosterWorker();
      const rosterTool = rosterWorker.tools?.find(
        (t) => t.function?.name === 'generate_initial_roster',
      );
      if (!rosterTool) {
        throw new Error('generate_initial_roster tool not found');
      }

      const initialRosterResult = (await rosterTool.function.execute({
        storeId,
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
      })) as Roster & { metrics?: { warnings?: string[] } };

      addTrace('RosterWorker', 'Orchestrator', 'roster_generated', {
        shiftsCount: initialRosterResult.roster.length,
        warningsCount: initialRosterResult.metrics?.warnings?.length ?? 0,
      });

      let workingRoster: Roster = initialRosterResult;

      // Detectar gaps de cobertura del roster inicial
      const coverageValidateTool = rosterWorker.tools?.find(
        (t) => t.function?.name === 'validate_coverage',
      );

      let coverageGaps: any[] = [];
      if (coverageValidateTool) {
        try {
          const staffRequirements = await storeTools.getStoreStaffRequirements.execute({ storeId });
          const coverage = await coverageValidateTool.function.execute({
            roster: workingRoster,
            staffRequirements,
          });
          coverageGaps = (coverage as any).uncoveredSlots || [];
          addTrace('RosterWorker', 'Orchestrator', 'coverage_validated', {
            score: (coverage as any).coverageScore,
            gapsCount: coverageGaps.length,
          });
        } catch (err) {
          addTrace('RosterWorker', 'Orchestrator', 'coverage_validation_failed', {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // Cargar contratos de empleados del roster
      const employeeIds = [...new Set(workingRoster.roster.map((s) => s.employeeId))];
      let employeeContracts: EmployeeContract[] = [];

      if (employeeIds.length > 0) {
        try {
          addTrace('Orchestrator', 'EmployeeTools', 'get_employee_contracts');
          employeeContracts = await employeeTools.getEmployeeContracts.execute({
            storeId,
            employeeIds,
          });
          addTrace('EmployeeTools', 'Orchestrator', 'contracts_loaded', {
            count: employeeContracts.length,
          });
        } catch (error) {
          addTrace('EmployeeTools', 'Orchestrator', 'contracts_load_failed', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // PASO 2: ComplianceWorker - Validación inicial
      // ═══════════════════════════════════════════════════════════════
      addTrace('Orchestrator', 'ComplianceWorker', 'validate_fair_work_compliance');
      const complianceWorker = new ComplianceWorker();
      const complianceTool = complianceWorker.tools?.find(
        (t) => t.function?.name === 'validate_fair_work_compliance',
      );
      if (!complianceTool) {
        throw new Error('validate_fair_work_compliance tool not found');
      }

      const initialCompliance = (await complianceTool.function.execute({
        roster: workingRoster,
        employeeContracts,
      })) as ComplianceResult;

      addTrace('ComplianceWorker', 'Orchestrator', 'compliance_validated', {
        passed: initialCompliance.passed,
        issuesCount: initialCompliance.issues?.length ?? 0,
        suggestionsCount: initialCompliance.suggestions?.length ?? 0,
      });

      // Check for CRITICAL issues sin sugerencias → human review inmediato
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
          metrics: { totalDurationMs: Date.now() - startTime },
        };
      }

      // ═══════════════════════════════════════════════════════════════
      // PASO 3: ConflictWorker - Aplicar correcciones y resolver gaps
      // ═══════════════════════════════════════════════════════════════
      const conflictWorker = new ConflictWorker();
      let conflictResolution: ConflictResolutionResult | undefined;
      let totalGapsResolved = 0;

      // 3.1: Aplicar sugerencias de ComplianceWorker
      if (initialCompliance.suggestions?.length) {
        addTrace('ComplianceWorker', 'ConflictWorker', 'apply_suggestions', {
          suggestionsCount: initialCompliance.suggestions.length,
        });

        const applySuggestionsTool = conflictWorker.tools?.find(
          (t) => t.function?.name === 'apply_suggestions',
        );

        if (applySuggestionsTool) {
          const result = (await applySuggestionsTool.function.execute({
            roster: workingRoster,
            suggestions: initialCompliance.suggestions,
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

      // 3.2: Resolver gaps de cobertura
      if (coverageGaps.length > 0) {
        addTrace('RosterWorker', 'ConflictWorker', 'resolve_coverage_gaps', {
          gapsCount: coverageGaps.length,
        });

        const resolveGapsTool = conflictWorker.tools?.find(
          (t) => t.function?.name === 'resolve_coverage_gaps',
        );

        if (resolveGapsTool) {
          const result = (await resolveGapsTool.function.execute({
            roster: workingRoster,
            gaps: coverageGaps,
            storeId,
            weekStart: weekStart.toISOString().split('T')[0],
            weekEnd: weekEnd.toISOString().split('T')[0],
          })) as ConflictResolutionResult;

          workingRoster = result.roster;
          totalGapsResolved = result.resolved;

          // Merge con conflictResolution anterior si existe
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

      // ═══════════════════════════════════════════════════════════════
      // PASO 4: OptimizationWorker - Optimización de costos
      // ═══════════════════════════════════════════════════════════════
      addTrace('Orchestrator', 'OptimizationWorker', 'optimize_roster');

      const optimizationWorker = new OptimizationWorker();
      const optimizationTool = optimizationWorker.tools?.find(
        (t) => t.function?.name === 'optimize_roster',
      );

      let optimizationResult: OptimizationResultWithQueries | undefined;

      if (optimizationTool) {
        // Cargar penalty rules para optimización
        const penaltyRules = await loadPenaltyRulesFromDb(storeId);

        // Cargar constraints de policy
        let constraints = { minHoursBetweenShifts: 10, minShiftHours: 3, maxShiftHours: 12 };
        try {
          const policy = await storeTools.getStorePolicy.execute({ storeId });
          if (policy) {
            constraints.minHoursBetweenShifts = policy.minHoursBetweenShifts ?? 10;
          }
        } catch {
          // Usar defaults
        }

        // Crear validador para que OptimizationWorker consulte a ComplianceWorker
        const complianceValidator = this.createComplianceValidator(complianceTool, addTrace);

        addTrace('Orchestrator', 'OptimizationWorker', 'inject_compliance_validator', {
          note: 'OptimizationWorker consultará a ComplianceWorker para cada optimización',
        });

        optimizationResult = (await optimizationTool.function.execute({
          roster: workingRoster,
          complianceFeedback: {
            issues: [],
            suggestions: [], // Ya fueron aplicadas por ConflictWorker
          },
          constraints,
          penaltyRules,
          complianceValidator,
        })) as OptimizationResultWithQueries;

        workingRoster = optimizationResult.roster;

        addTrace('OptimizationWorker', 'Orchestrator', 'optimization_complete', {
          score: optimizationResult.score,
          savingsPercent: optimizationResult.metrics.savingsPercent,
          validationQueries: optimizationResult.validationQueries?.length ?? 0,
          queriesPassed: optimizationResult.validationQueries?.filter((q) => q.passed).length ?? 0,
        });
      }

      // ═══════════════════════════════════════════════════════════════
      // PASO 5: ComplianceWorker - Validación final
      // ═══════════════════════════════════════════════════════════════
      addTrace('Orchestrator', 'ComplianceWorker', 'final_validation');

      const finalCompliance = (await complianceTool.function.execute({
        roster: workingRoster,
        employeeContracts: [],
      })) as ComplianceResult;

      addTrace('ComplianceWorker', 'Orchestrator', 'final_compliance_result', {
        passed: finalCompliance.passed,
        issuesCount: finalCompliance.issues?.length ?? 0,
      });

      // Determinar status final
      const finalHasCritical = finalCompliance.issues?.some((i) => i.severity === 'CRITICAL');
      const requiresReview = conflictResolution?.requiresHumanReview || finalHasCritical;

      let status: OrchestrationResult['status'] = 'ok';
      if (requiresReview) {
        status = finalHasCritical ? 'requires_human_review' : 'partial';
      }

      return {
        status,
        roster: workingRoster,
        compliance: finalCompliance,
        optimization: optimizationResult,
        conflictResolution,
        agentTrace,
        metrics: {
          totalDurationMs: Date.now() - startTime,
          costSavingsPercent: optimizationResult?.metrics.savingsPercent,
          suggestionsApplied:
            (conflictResolution?.resolved ?? 0) +
            (optimizationResult?.metrics.suggestionsApplied ?? 0),
          validationQueriesCount: optimizationResult?.validationQueries?.length ?? 0,
          coverageGapsResolved: totalGapsResolved,
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

  /**
   * Sanitiza datos para el trace (evita objetos muy grandes)
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
