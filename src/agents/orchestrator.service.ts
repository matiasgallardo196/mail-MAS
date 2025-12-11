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
  agentTrace: AgentMessage[];
  metrics?: {
    totalDurationMs: number;
    costSavingsPercent?: number;
    suggestionsApplied?: number;
    validationQueriesCount?: number;
  };
}

/**
 * SchedulingOrchestrator - Coordina la colaboración entre agents
 *
 * Flujo de colaboración (DRY):
 * 1. RosterWorker → genera roster inicial
 * 2. ComplianceWorker → valida y genera suggestions
 * 3. OptimizationWorker → aplica suggestions + optimiza (consultando a ComplianceWorker)
 * 4. ComplianceWorker → validación final (confirmación)
 *
 * La clave es que OptimizationWorker CONSULTA a ComplianceWorker para cada
 * optimización adicional, respetando DRY y mostrando colaboración real.
 */
@Injectable()
export class SchedulingOrchestrator {
  private readonly logger = new Logger(SchedulingOrchestrator.name);
  private orchestrator: IOrchestrator<unknown, Roster> | null = null;

  constructor() {
    this.logger.log('SchedulingOrchestrator initialized');
    try {
      const OrchestratorClass = require('@openai/agents')?.Orchestrator;
      const planner = new OrchestrationPlanner();
      const workers = [new RosterWorker(), new ComplianceWorker(), new OptimizationWorker()];
      if (OrchestratorClass) {
        this.orchestrator = new OrchestratorClass({
          planner,
          workers,
          config: { maxSteps: 20, timeout: 60_000 },
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
   * Genera un roster optimizado con validación de compliance
   * Implementa el flujo de colaboración entre agents
   */
  async generateRoster(storeId: string, weekStart: Date): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const agentTrace: AgentMessage[] = [];

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

      // --- FALLBACK: Flujo de colaboración manual ---

      // 1️⃣ Roster Generation
      addTrace('Orchestrator', 'RosterWorker', 'generate_initial_roster');
      const rosterWorker = new RosterWorker();
      const rosterTool = rosterWorker.tools?.find(
        (t) => t.function?.name === 'generate_initial_roster',
      );
      if (!rosterTool) {
        throw new Error('generate_initial_roster tool not found');
      }

      const initialRoster = (await rosterTool.function.execute({
        storeId,
        weekStart: weekStart.toISOString(),
        employeeIds: [],
      })) as Roster;

      addTrace('RosterWorker', 'Orchestrator', 'roster_generated', {
        shiftsCount: initialRoster.roster.length,
      });

      // 1.5️⃣ Cargar contratos de empleados del roster
      const employeeIds = [...new Set(initialRoster.roster.map((s) => s.employeeId))];
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
          // Si falla, ComplianceWorker intentará cargarlos internamente
          addTrace('EmployeeTools', 'Orchestrator', 'contracts_load_failed', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // 2️⃣ Initial Compliance Check
      addTrace('Orchestrator', 'ComplianceWorker', 'validate_fair_work_compliance');
      const complianceWorker = new ComplianceWorker();
      const complianceTool = complianceWorker.tools?.find(
        (t) => t.function?.name === 'validate_fair_work_compliance',
      );
      if (!complianceTool) {
        throw new Error('validate_fair_work_compliance tool not found');
      }

      const initialCompliance = (await complianceTool.function.execute({
        roster: initialRoster,
        employeeContracts,
      })) as ComplianceResult;

      addTrace('ComplianceWorker', 'Orchestrator', 'compliance_validated', {
        passed: initialCompliance.passed,
        issuesCount: initialCompliance.issues?.length ?? 0,
        suggestionsCount: initialCompliance.suggestions?.length ?? 0,
      });

      // Check for CRITICAL issues sin sugerencias → human review
      const hasCritical = initialCompliance.issues?.some((i) => i.severity === 'CRITICAL');
      if (hasCritical && !initialCompliance.suggestions?.length) {
        addTrace('Orchestrator', 'HumanReview', 'critical_compliance_violation', {
          issues: initialCompliance.issues?.filter((i) => i.severity === 'CRITICAL'),
        });

        return {
          status: 'requires_human_review',
          roster: initialRoster,
          compliance: initialCompliance,
          agentTrace,
          metrics: { totalDurationMs: Date.now() - startTime },
        };
      }

      // 3️⃣ Optimization con validación colaborativa
      addTrace('ComplianceWorker', 'OptimizationWorker', 'compliance_feedback', {
        suggestions: initialCompliance.suggestions?.map((s) => ({
          type: s.type,
          employeeId: s.employeeId,
          reason: s.reason,
        })),
      });

      const optimizationWorker = new OptimizationWorker();
      const optimizationTool = optimizationWorker.tools?.find(
        (t) => t.function?.name === 'optimize_roster',
      );

      if (!optimizationTool) {
        return {
          status: 'ok',
          roster: initialRoster,
          compliance: initialCompliance,
          agentTrace,
          metrics: { totalDurationMs: Date.now() - startTime },
        };
      }

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

      // Crear validador que el OptimizationWorker usará para consultar a ComplianceWorker
      const complianceValidator = this.createComplianceValidator(complianceTool, addTrace);

      addTrace('Orchestrator', 'OptimizationWorker', 'optimize_roster', {
        note: 'OptimizationWorker consultará a ComplianceWorker para cada optimización',
      });

      const optimizationResult = (await optimizationTool.function.execute({
        roster: initialRoster,
        complianceFeedback: {
          issues: initialCompliance.issues,
          suggestions: initialCompliance.suggestions,
        },
        constraints,
        penaltyRules,
        complianceValidator, // ← Inyección del validador
      })) as OptimizationResultWithQueries;

      addTrace('OptimizationWorker', 'Orchestrator', 'optimization_complete', {
        score: optimizationResult.score,
        suggestionsApplied: optimizationResult.metrics.suggestionsApplied,
        savingsPercent: optimizationResult.metrics.savingsPercent,
        validationQueries: optimizationResult.validationQueries?.length ?? 0,
        queriesPassed: optimizationResult.validationQueries?.filter((q) => q.passed).length ?? 0,
      });

      // 4️⃣ Final Compliance Verification (confirmación)
      addTrace('Orchestrator', 'ComplianceWorker', 'final_validation');
      const finalCompliance = (await complianceTool.function.execute({
        roster: optimizationResult.roster,
        employeeContracts: [],
      })) as ComplianceResult;

      addTrace('ComplianceWorker', 'Orchestrator', 'final_compliance_result', {
        passed: finalCompliance.passed,
        issuesCount: finalCompliance.issues?.length ?? 0,
      });

      // Ya no necesitamos retry porque cada cambio fue validado antes de aplicar
      // Si hay CRITICAL aquí, algo muy raro pasó (bug en las suggestions de compliance)
      const finalHasCritical = finalCompliance.issues?.some((i) => i.severity === 'CRITICAL');

      return {
        status: finalHasCritical ? 'partial' : 'ok',
        roster: optimizationResult.roster,
        compliance: finalCompliance,
        optimization: optimizationResult,
        agentTrace,
        metrics: {
          totalDurationMs: Date.now() - startTime,
          costSavingsPercent: optimizationResult.metrics.savingsPercent,
          suggestionsApplied: optimizationResult.metrics.suggestionsApplied,
          validationQueriesCount: optimizationResult.validationQueries?.length ?? 0,
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
