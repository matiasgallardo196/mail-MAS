import { z } from 'zod';
import type { PlannerOptions } from '../../shared/types/agent';
import type { ToolDef } from '../../shared/types/tool';
import type { Roster } from '../../shared/types/roster';
import type { ComplianceResult, ComplianceIssue } from '../../shared/types/compliance';

const PlannerBase = (() => {
  try {
    return require('@openai/agents').Planner;
  } catch (err) {
    return class {
      name?: string;
      instructions?: string;
      tools?: ToolDef[];
      constructor(opts: PlannerOptions = { name: 'fallback' } as PlannerOptions) {
        this.name = opts.name;
        this.instructions = opts.instructions;
        this.tools = opts.tools as ToolDef[];
      }
    };
  }
})();

// ═══════════════════════════════════════════════════════════════════
// Estado del Flujo de Orquestación
// ═══════════════════════════════════════════════════════════════════

/**
 * Estados posibles del proceso de scheduling
 */
export type OrchestrationState =
  | 'INITIAL'                    // Estado inicial
  | 'ROSTER_GENERATED'           // Roster generado por RosterWorker
  | 'COMPLIANCE_VALIDATED'       // Validado por ComplianceWorker
  | 'COMPLIANCE_HAS_ISSUES'      // Tiene issues que resolver
  | 'CONFLICTS_RESOLVED'         // Conflictos resueltos por ConflictWorker
  | 'OPTIMIZED'                  // Optimizado por OptimizationWorker
  | 'FINAL_VALIDATION_PASSED'    // Validación final OK
  | 'FINAL_VALIDATION_FAILED'    // Validación final falló
  | 'REQUIRES_HUMAN_REVIEW'      // No se puede resolver automáticamente
  | 'COMPLETED';                 // Proceso terminado

/**
 * Workers disponibles en el sistema
 */
export type WorkerName = 
  | 'RosterWorker' 
  | 'ComplianceWorker' 
  | 'ConflictWorker' 
  | 'OptimizationWorker';

/**
 * Decisión del planner sobre qué hacer siguiente
 */
export interface PlannerDecision {
  nextWorker: WorkerName | 'DONE' | 'HUMAN_REVIEW';
  reason: string;
  shouldRetry?: boolean;
  maxRetries?: number;
}

/**
 * Contexto para tomar decisiones
 */
export interface PlannerContext {
  currentState: OrchestrationState;
  roster: Roster | null;
  compliance: ComplianceResult | null;
  iterationCount: number;
  maxIterations: number;
  hasCriticalIssues: boolean;
  hasSuggestions: boolean;
  hasUnresolvedGaps: boolean;
  optimizationAttempted: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// Input/Output Schemas para Tools
// ═══════════════════════════════════════════════════════════════════

const PlannerContextSchema = z.object({
  currentState: z.enum([
    'INITIAL',
    'ROSTER_GENERATED',
    'COMPLIANCE_VALIDATED',
    'COMPLIANCE_HAS_ISSUES',
    'CONFLICTS_RESOLVED',
    'OPTIMIZED',
    'FINAL_VALIDATION_PASSED',
    'FINAL_VALIDATION_FAILED',
    'REQUIRES_HUMAN_REVIEW',
    'COMPLETED',
  ]),
  hasRoster: z.boolean(),
  shiftsCount: z.number(),
  hasCriticalIssues: z.boolean(),
  hasMajorIssues: z.boolean(),
  hasSuggestions: z.boolean(),
  hasUnresolvedGaps: z.boolean(),
  optimizationAttempted: z.boolean(),
  iterationCount: z.number(),
  maxIterations: z.number(),
});

const PlannerDecisionSchema = z.object({
  nextWorker: z.enum(['RosterWorker', 'ComplianceWorker', 'ConflictWorker', 'OptimizationWorker', 'DONE', 'HUMAN_REVIEW']),
  reason: z.string(),
  shouldRetry: z.boolean().optional(),
  maxRetries: z.number().optional(),
});

// ═══════════════════════════════════════════════════════════════════
// Lógica del Planner
// ═══════════════════════════════════════════════════════════════════

/**
 * Decide qué worker ejecutar siguiente basándose en el estado
 */
function selectNextWorker(context: z.infer<typeof PlannerContextSchema>): PlannerDecision {
  const { 
    currentState, 
    hasRoster, 
    hasCriticalIssues, 
    hasSuggestions, 
    hasUnresolvedGaps,
    optimizationAttempted,
    iterationCount,
    maxIterations,
  } = context;

  // Guard: demasiadas iteraciones
  if (iterationCount >= maxIterations) {
    return {
      nextWorker: 'HUMAN_REVIEW',
      reason: `Máximo de ${maxIterations} iteraciones alcanzado sin resolver todos los issues`,
    };
  }

  // Máquina de estados
  switch (currentState) {
    case 'INITIAL':
      return {
        nextWorker: 'RosterWorker',
        reason: 'Estado inicial - generar roster',
      };

    case 'ROSTER_GENERATED':
      return {
        nextWorker: 'ComplianceWorker',
        reason: 'Roster generado - validar compliance',
      };

    case 'COMPLIANCE_VALIDATED':
      if (!hasCriticalIssues && !hasSuggestions && !hasUnresolvedGaps) {
        // Roster válido, pasar a optimización
        return {
          nextWorker: 'OptimizationWorker',
          reason: 'Compliance OK sin issues - optimizar costos',
        };
      }
      // Tiene issues, pasar a ConflictWorker
      return {
        nextWorker: 'ConflictWorker',
        reason: 'Compliance tiene issues/suggestions - resolver conflictos',
      };

    case 'COMPLIANCE_HAS_ISSUES':
      if (hasCriticalIssues && !hasSuggestions) {
        // Issues críticos sin sugerencias → human review
        return {
          nextWorker: 'HUMAN_REVIEW',
          reason: 'Issues críticos sin sugerencias automáticas',
        };
      }
      return {
        nextWorker: 'ConflictWorker',
        reason: 'Hay issues que resolver',
      };

    case 'CONFLICTS_RESOLVED':
      if (hasUnresolvedGaps || hasCriticalIssues) {
        // Aún hay problemas después de ConflictWorker
        return {
          nextWorker: 'HUMAN_REVIEW',
          reason: 'Conflictos no resueltos completamente',
        };
      }
      if (!optimizationAttempted) {
        return {
          nextWorker: 'OptimizationWorker',
          reason: 'Conflictos resueltos - optimizar costos',
        };
      }
      // Ya optimizado, validar final
      return {
        nextWorker: 'ComplianceWorker',
        reason: 'Post-optimización - validación final',
      };

    case 'OPTIMIZED':
      return {
        nextWorker: 'ComplianceWorker',
        reason: 'Optimización completa - validación final',
      };

    case 'FINAL_VALIDATION_PASSED':
      return {
        nextWorker: 'DONE',
        reason: 'Validación final exitosa',
      };

    case 'FINAL_VALIDATION_FAILED':
      if (hasCriticalIssues) {
        return {
          nextWorker: 'HUMAN_REVIEW',
          reason: 'Validación final falló con issues críticos',
        };
      }
      return {
        nextWorker: 'ConflictWorker',
        reason: 'Validación final falló - intentar resolver',
        shouldRetry: true,
        maxRetries: 2,
      };

    case 'REQUIRES_HUMAN_REVIEW':
    case 'COMPLETED':
      return {
        nextWorker: 'DONE',
        reason: 'Proceso terminado',
      };

    default:
      return {
        nextWorker: 'HUMAN_REVIEW',
        reason: `Estado desconocido: ${currentState}`,
      };
  }
}

/**
 * Evalúa la calidad del roster actual
 */
function evaluateRosterQuality(context: z.infer<typeof PlannerContextSchema>): {
  score: number;
  canProceed: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 100;

  if (!context.hasRoster) {
    return { score: 0, canProceed: false, issues: ['No hay roster generado'] };
  }

  if (context.shiftsCount === 0) {
    issues.push('Roster vacío - sin turnos asignados');
    score -= 50;
  }

  if (context.hasCriticalIssues) {
    issues.push('Tiene issues críticos de compliance');
    score -= 40;
  }

  if (context.hasMajorIssues) {
    issues.push('Tiene issues mayores de compliance');
    score -= 20;
  }

  if (context.hasUnresolvedGaps) {
    issues.push('Tiene gaps de cobertura sin resolver');
    score -= 30;
  }

  const canProceed = score >= 60 && !context.hasCriticalIssues;

  return { score: Math.max(0, score), canProceed, issues };
}

// ═══════════════════════════════════════════════════════════════════
// OrchestrationPlanner Class
// ═══════════════════════════════════════════════════════════════════

/**
 * OrchestrationPlanner - Decide dinámicamente el flujo de workers
 *
 * Responsabilidades:
 * - Evaluar el estado actual del proceso
 * - Decidir qué worker debe ejecutarse siguiente
 * - Determinar cuándo el proceso debe terminar
 * - Detectar situaciones que requieren intervención humana
 *
 * El planner actúa como el "cerebro" del orchestrator, tomando
 * decisiones basadas en el estado del roster y los resultados
 * de cada worker.
 */
export class OrchestrationPlanner extends PlannerBase {
  constructor() {
    super({
      name: 'OrchestrationPlanner',
      instructions: `
        Eres el planner del sistema de scheduling de McDonald's. Tu rol es coordinar
        la secuencia de ejecución de los workers para generar un roster óptimo.

        WORKERS DISPONIBLES:
        - RosterWorker: Genera turnos basados en disponibilidad y requerimientos
        - ComplianceWorker: Valida Fair Work Act y genera sugerencias
        - ConflictWorker: Resuelve conflictos y aplica correcciones
        - OptimizationWorker: Optimiza costos del roster

        FLUJO TÍPICO:
        1. RosterWorker → genera roster inicial
        2. ComplianceWorker → valida compliance
        3. Si hay issues → ConflictWorker → resuelve
        4. OptimizationWorker → optimiza costos
        5. ComplianceWorker → validación final
        6. DONE o HUMAN_REVIEW

        REGLAS:
        - Si hay issues CRITICAL sin sugerencias → HUMAN_REVIEW
        - Máximo 5 iteraciones antes de HUMAN_REVIEW
        - Siempre terminar con validación final de compliance
        - Priorizar resolver issues críticos sobre optimización

        EVALÚA la calidad del roster y DECIDE el siguiente paso.
      `,
      tools: [
        // Tool 1: Seleccionar siguiente worker
        {
          type: 'function',
          function: {
            name: 'select_next_worker',
            description: 'Decide qué worker debe ejecutarse siguiente basándose en el estado actual del proceso',
            parameters: PlannerContextSchema,
            execute: async (args: unknown): Promise<PlannerDecision> => {
              const context = PlannerContextSchema.parse(args);
              return selectNextWorker(context);
            },
          },
        },
        // Tool 2: Evaluar calidad del roster
        {
          type: 'function',
          function: {
            name: 'evaluate_roster_quality',
            description: 'Evalúa la calidad del roster actual y determina si puede proceder',
            parameters: PlannerContextSchema,
            execute: async (args: unknown): Promise<{ score: number; canProceed: boolean; issues: string[] }> => {
              const context = PlannerContextSchema.parse(args);
              return evaluateRosterQuality(context);
            },
          },
        },
        // Tool 3: Determinar si el proceso debe terminar
        {
          type: 'function',
          function: {
            name: 'should_terminate',
            description: 'Determina si el proceso de orchestration debe terminar',
            parameters: z.object({
              currentState: z.string(),
              iterationCount: z.number(),
              hasCriticalIssues: z.boolean(),
              qualityScore: z.number(),
            }),
            execute: async (args: unknown): Promise<{ terminate: boolean; reason: string; status: string }> => {
              const input = z.object({
                currentState: z.string(),
                iterationCount: z.number(),
                hasCriticalIssues: z.boolean(),
                qualityScore: z.number(),
              }).parse(args);

              // Condiciones de terminación
              if (input.currentState === 'COMPLETED' || input.currentState === 'FINAL_VALIDATION_PASSED') {
                return { terminate: true, reason: 'Proceso completado exitosamente', status: 'ok' };
              }

              if (input.currentState === 'REQUIRES_HUMAN_REVIEW') {
                return { terminate: true, reason: 'Requiere revisión humana', status: 'requires_human_review' };
              }

              if (input.iterationCount >= 5) {
                return { terminate: true, reason: 'Máximo de iteraciones alcanzado', status: 'partial' };
              }

              if (input.hasCriticalIssues && input.iterationCount >= 3) {
                return { terminate: true, reason: 'Issues críticos no resueltos', status: 'requires_human_review' };
              }

              return { terminate: false, reason: 'Continuar proceso', status: 'in_progress' };
            },
          },
        },
      ] as ToolDef[],
    });
  }

  /**
   * Método helper para obtener la decisión del siguiente paso
   * Puede ser usado directamente por el orchestrator
   */
  getNextStep(context: PlannerContext): PlannerDecision {
    return selectNextWorker({
      currentState: context.currentState,
      hasRoster: context.roster !== null,
      shiftsCount: context.roster?.roster.length ?? 0,
      hasCriticalIssues: context.hasCriticalIssues,
      hasMajorIssues: context.compliance?.issues?.some(i => i.severity === 'MAJOR') ?? false,
      hasSuggestions: context.hasSuggestions,
      hasUnresolvedGaps: context.hasUnresolvedGaps,
      optimizationAttempted: context.optimizationAttempted,
      iterationCount: context.iterationCount,
      maxIterations: context.maxIterations,
    });
  }

  /**
   * Evalúa si el proceso debe continuar o terminar
   */
  shouldContinue(context: PlannerContext): boolean {
    const decision = this.getNextStep(context);
    return decision.nextWorker !== 'DONE' && decision.nextWorker !== 'HUMAN_REVIEW';
  }
}
