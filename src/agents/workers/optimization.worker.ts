import { z } from 'zod';
import type { ToolDef } from '../../shared/types/tool';
import type { WorkerOptions } from '../../shared/types/agent';
import { RosterSchema } from '../../shared/schemas/roster.schema';
import {
  OptimizationInputSchema,
  OptimizationResultSchema,
  type OptimizationResult,
  type AppliedOptimization,
  type OptimizationMetrics,
} from '../../shared/schemas/optimization.schema';
import type { Roster } from '../../shared/types/roster';
import type { Shift } from '../../shared/types/shift';
import type { ComplianceSuggestion, ComplianceResult } from '../../shared/types/compliance';
import {
  loadPenaltyRulesFromDb,
  calculatePenaltyRates,
  type PenaltyRule,
} from '../tools/fairwork.tools';
import { isAustralianPublicHoliday } from '../tools/australian-holidays';

// Fallback Worker base class
const WorkerBase = (() => {
  try {
    return require('@openai/agents').Worker;
  } catch {
    return class {
      name?: string;
      instructions?: string;
      tools?: ToolDef[];
      constructor(opts: WorkerOptions = { name: 'fallback' }) {
        this.name = opts.name;
        this.instructions = opts.instructions;
        this.tools = opts.tools as ToolDef[];
      }
    };
  }
})();

// --- Types for agent collaboration ---

/**
 * Función validadora que el Orchestrator inyecta
 * Permite a OptimizationWorker consultar a ComplianceWorker sin duplicar lógica
 */
export type ComplianceValidator = (roster: Roster) => Promise<ComplianceResult>;

/**
 * Registro de una consulta al ComplianceWorker
 */
export interface ValidationQuery {
  proposedChange: string;
  passed: boolean;
  reason?: string;
}

/**
 * Input extendido que incluye el validador
 */
export interface OptimizationInputWithValidator {
  roster: Roster;
  forecast?: { hour: string; demand: number }[];
  complianceFeedback?: {
    issues?: { employeeId: string; issue: string; severity: 'CRITICAL' | 'MAJOR' | 'MINOR' }[];
    suggestions?: ComplianceSuggestion[];
  };
  constraints?: {
    minHoursBetweenShifts: number;
    minShiftHours: number;
    maxShiftHours: number;
    maxHoursPerWeek?: Record<string, number>;
  };
  penaltyRules?: PenaltyRule[];
  // Función validadora inyectada por el Orchestrator
  complianceValidator?: ComplianceValidator;
}

/**
 * Resultado extendido con queries de validación
 */
export interface OptimizationResultWithQueries extends OptimizationResult {
  validationQueries: ValidationQuery[];
}

// --- Utility functions ---

function hoursBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.max(0, (end - start) / 3_600_000);
}

function addHoursToIso(isoString: string, hours: number): string {
  const date = new Date(isoString);
  date.setTime(date.getTime() + hours * 3_600_000);
  return date.toISOString();
}

function getDayOfWeek(isoString: string): number {
  return new Date(isoString).getUTCDay();
}

function getTimeString(isoString: string): string {
  return isoString.split('T')[1]?.split('.')[0] ?? '00:00:00';
}

function getDateString(isoString: string): string {
  return isoString.split('T')[0];
}

/**
 * Calcula el costo relativo de un turno basado en su duración y multiplier de penalty
 */
async function calculateShiftRelativeCost(
  shift: Shift,
  penaltyRules: PenaltyRule[],
  employmentType: string = 'CASUAL',
  australianState: string = 'VIC',
): Promise<{ cost: number; multiplier: number; reason?: string }> {
  const hours = hoursBetween(shift.start, shift.end);
  const shiftDate = getDateString(shift.start);
  const holidayInfo = isAustralianPublicHoliday(shiftDate, australianState);
  const isHoliday = !!holidayInfo;

  if (penaltyRules.length === 0) {
    return { cost: hours * 1, multiplier: 1 };
  }

  try {
    const penalty = await calculatePenaltyRates({
      shiftDate,
      startTime: getTimeString(shift.start),
      endTime: getTimeString(shift.end),
      employmentType,
      penaltyRules,
      isPublicHoliday: isHoliday,
    });

    return {
      cost: hours * penalty.multiplier,
      multiplier: penalty.multiplier,
      reason: penalty.reason,
    };
  } catch {
    return { cost: hours * 1, multiplier: 1 };
  }
}

/**
 * Calcula el costo relativo total del roster
 */
async function calculateRosterRelativeCost(
  roster: Roster,
  penaltyRules: PenaltyRule[],
  australianState: string = 'VIC',
): Promise<number> {
  let totalCost = 0;
  for (const shift of roster.roster) {
    const { cost } = await calculateShiftRelativeCost(shift, penaltyRules, 'CASUAL', australianState);
    totalCost += cost;
  }
  return totalCost;
}

/**
 * Aplica una sugerencia de ComplianceWorker al roster
 * Las sugerencias de compliance ya fueron validadas, se aplican directamente
 */
function applySuggestion(
  roster: Roster,
  suggestion: ComplianceSuggestion,
): { applied: boolean; description: string } {
  const shifts = roster.roster;
  const shiftIndex = suggestion.shiftIndex;

  if (shiftIndex === undefined || shiftIndex < 0 || shiftIndex >= shifts.length) {
    return { applied: false, description: `Índice de turno inválido: ${shiftIndex}` };
  }

  const shift = shifts[shiftIndex];
  const change = suggestion.suggestedChange;

  switch (suggestion.type) {
    case 'EXTEND_SHIFT':
      if (change?.newEnd) {
        shift.end = change.newEnd;
        return {
          applied: true,
          description: `Extendido turno de ${suggestion.employeeId} hasta ${change.newEnd}`,
        };
      }
      break;

    case 'SHORTEN_SHIFT':
      if (change?.newEnd) {
        shift.end = change.newEnd;
        return {
          applied: true,
          description: `Acortado turno de ${suggestion.employeeId} hasta ${change.newEnd}`,
        };
      }
      break;

    case 'MOVE_SHIFT':
      if (change?.newStart && change?.newEnd) {
        shift.start = change.newStart;
        shift.end = change.newEnd;
        return {
          applied: true,
          description: `Movido turno de ${suggestion.employeeId} a ${change.newStart}`,
        };
      }
      break;

    case 'REASSIGN_SHIFT':
      if (change?.newEmployeeId) {
        shift.employeeId = change.newEmployeeId;
        return {
          applied: true,
          description: `Reasignado turno a empleado ${change.newEmployeeId}`,
        };
      }
      break;

    case 'REMOVE_SHIFT':
      (shift as any).__toRemove = true;
      return {
        applied: true,
        description: `Marcado para eliminar turno de ${suggestion.employeeId}`,
      };

    case 'ADD_REST_DAY':
      return {
        applied: false,
        description: `Sugerencia de agregar día de descanso para ${suggestion.employeeId}`,
      };
  }

  return { applied: false, description: `No se pudo aplicar sugerencia: ${suggestion.type}` };
}

/**
 * Propone una optimización y la valida con ComplianceWorker antes de aplicar
 * Esta es la función clave que implementa la colaboración entre agents
 */
async function tryOptimizationWithValidation(
  currentRoster: Roster,
  shiftIndex: number,
  proposedChange: { newStart?: string; newEnd?: string; newEmployeeId?: string },
  changeDescription: string,
  validator: ComplianceValidator,
): Promise<{
  applied: boolean;
  roster: Roster;
  query: ValidationQuery;
}> {
  // 1. Crear copia del roster con el cambio propuesto
  const tempRoster: Roster = JSON.parse(JSON.stringify(currentRoster));
  const shift = tempRoster.roster[shiftIndex];

  if (!shift) {
    return {
      applied: false,
      roster: currentRoster,
      query: {
        proposedChange: changeDescription,
        passed: false,
        reason: 'Shift index inválido',
      },
    };
  }

  // Aplicar cambio propuesto
  if (proposedChange.newStart) shift.start = proposedChange.newStart;
  if (proposedChange.newEnd) shift.end = proposedChange.newEnd;
  if (proposedChange.newEmployeeId) shift.employeeId = proposedChange.newEmployeeId;

  // 2. Consultar a ComplianceWorker (DRY - usa la misma lógica)
  const compliance = await validator(tempRoster);

  // 3. Verificar si pasa
  const hasCritical = compliance.issues?.some((i) => i.severity === 'CRITICAL');

  if (!hasCritical) {
    return {
      applied: true,
      roster: tempRoster,
      query: {
        proposedChange: changeDescription,
        passed: true,
      },
    };
  }

  // 4. No pasa - devolver roster original
  const criticalIssues = compliance.issues?.filter((i) => i.severity === 'CRITICAL') ?? [];
  return {
    applied: false,
    roster: currentRoster,
    query: {
      proposedChange: changeDescription,
      passed: false,
      reason: criticalIssues.map((i) => i.issue).join(', '),
    },
  };
}

/**
 * Identifica oportunidades de optimización por costo
 */
function findCostOptimizationOpportunities(
  roster: Roster,
  penaltyRules: PenaltyRule[],
): Array<{
  shiftIndex: number;
  description: string;
  proposedChange: { newStart?: string; newEnd?: string };
  estimatedSavings: number;
}> {
  const opportunities: Array<{
    shiftIndex: number;
    description: string;
    proposedChange: { newStart?: string; newEnd?: string };
    estimatedSavings: number;
  }> = [];

  for (let i = 0; i < roster.roster.length; i++) {
    const shift = roster.roster[i];
    const dayOfWeek = getDayOfWeek(shift.start);

    // Oportunidad: Turno en domingo (multiplier alto) podría moverse a sábado
    if (dayOfWeek === 0) {
      // Mover 1 día antes (sábado)
      const newStart = addHoursToIso(shift.start, -24);
      const newEnd = addHoursToIso(shift.end, -24);

      opportunities.push({
        shiftIndex: i,
        description: `Mover turno de ${shift.employeeId} de domingo a sábado`,
        proposedChange: { newStart, newEnd },
        estimatedSavings: 0.25, // Diferencia entre 1.5 y 1.25 multiplier
      });
    }

    // Oportunidad: Turno en sábado podría moverse a viernes
    if (dayOfWeek === 6) {
      const newStart = addHoursToIso(shift.start, -24);
      const newEnd = addHoursToIso(shift.end, -24);

      opportunities.push({
        shiftIndex: i,
        description: `Mover turno de ${shift.employeeId} de sábado a viernes`,
        proposedChange: { newStart, newEnd },
        estimatedSavings: 0.25,
      });
    }
  }

  // Ordenar por mayor ahorro potencial
  return opportunities.sort((a, b) => b.estimatedSavings - a.estimatedSavings);
}

/**
 * Balancea las horas entre empleados para distribución más equitativa
 */
function analyzeHoursBalance(roster: Roster): {
  imbalanced: boolean;
  details: string;
  employeeHours: Record<string, number>;
} {
  const hoursByEmployee: Record<string, number> = {};

  for (const shift of roster.roster) {
    const hours = hoursBetween(shift.start, shift.end);
    hoursByEmployee[shift.employeeId] = (hoursByEmployee[shift.employeeId] ?? 0) + hours;
  }

  const hoursValues = Object.values(hoursByEmployee);
  if (hoursValues.length < 2) {
    return { imbalanced: false, details: '', employeeHours: hoursByEmployee };
  }

  const maxHours = Math.max(...hoursValues);
  const minHours = Math.min(...hoursValues);
  const variance = maxHours - minHours;

  if (variance > 10) {
    return {
      imbalanced: true,
      details: `Desbalance de ${variance.toFixed(1)}h entre empleados (max: ${maxHours.toFixed(1)}h, min: ${minHours.toFixed(1)}h)`,
      employeeHours: hoursByEmployee,
    };
  }

  return { imbalanced: false, details: '', employeeHours: hoursByEmployee };
}

/**
 * Calcula el score de optimización (0-100)
 *
 * FÓRMULA DE CÁLCULO:
 * ==================
 * Score Base: 50 puntos
 *
 * BONIFICACIONES:
 * - Ahorro de costos:         +2 puntos por cada 1% de ahorro (máx +30)
 *                             Ejemplo: 15% ahorro = +30 puntos
 * - Sugerencias aplicadas:    +5 puntos por cada sugerencia (máx +15)
 *                             Ejemplo: 3 sugerencias = +15 puntos
 * - Optimizaciones exitosas:  +3 puntos por cada validación que pasó (máx +10)
 *                             Ejemplo: 3 optimizaciones = +9 puntos
 * - Balance de horas:         +5 puntos si las horas están balanceadas
 *
 * PENALIZACIONES:
 * - Sin mejoras:              -10 puntos si no se modificó ni aplicó nada
 *
 * RANGO FINAL: 0-100 (clamped)
 *
 * INTERPRETACIÓN:
 * - 0-40:   Optimización fallida o sin mejoras
 * - 41-60:  Optimización básica (solo suggestions)
 * - 61-80:  Buena optimización (suggestions + ahorro)
 * - 81-100: Optimización excelente (ahorro significativo + balance)
 */
function calculateOptimizationScore(
  metrics: OptimizationMetrics,
  hoursBalance: { imbalanced: boolean },
  validationQueries: ValidationQuery[],
): number {
  // Score base: punto de partida neutral
  let score = 50;

  // Bonus por ahorro de costos (hasta +30 puntos)
  // 2 puntos por cada 1% de ahorro
  if (metrics.savingsPercent > 0) {
    score += Math.min(30, metrics.savingsPercent * 2);
  }

  // Bonus por aplicar sugerencias de compliance (hasta +15 puntos)
  // 5 puntos por cada sugerencia aplicada exitosamente
  score += Math.min(15, metrics.suggestionsApplied * 5);

  // Bonus por optimizaciones adicionales validadas (hasta +10 puntos)
  // 3 puntos por cada optimización que pasó validación de ComplianceWorker
  const successfulOptimizations = validationQueries.filter((q) => q.passed).length;
  score += Math.min(10, successfulOptimizations * 3);

  // Bonus por balance de horas entre empleados (+5 puntos)
  if (!hoursBalance.imbalanced) {
    score += 5;
  }

  // Penalización si no hubo ninguna mejora (-10 puntos)
  if (metrics.shiftsModified === 0 && metrics.suggestionsApplied === 0) {
    score -= 10;
  }

  // Clamp al rango 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Validador por defecto que siempre pasa
 * En producción, el Orchestrator SIEMPRE debe proporcionar un validador real
 * Este fallback solo se usa para tests aislados
 */
function createPassthroughValidator(): ComplianceValidator {
  return async (): Promise<ComplianceResult> => {
    return { passed: true, issues: [] };
  };
}

// --- Main Worker Class ---

export class OptimizationWorker extends WorkerBase {
  constructor() {
    super({
      name: 'OptimizationWorker',
      instructions: `Optimiza roster para minimizar costos y equilibrar carga de trabajo.
      
RESPONSABILIDADES:
1. Aplicar sugerencias de ComplianceWorker para resolver violaciones
2. Proponer optimizaciones de costo y VALIDARLAS con ComplianceWorker antes de aplicar
3. Balancear horas entre empleados
4. Calcular costo relativo y reportar métricas

PROTOCOLO DE COLABORACIÓN (DRY):
- Recibe feedback de ComplianceWorker con issues y suggestions
- Aplica primero las suggestions (ya validadas por ComplianceWorker)
- Para cada optimización adicional:
  → Propone cambio
  → CONSULTA a ComplianceWorker para validar
  → Si pasa → aplica el cambio
  → Si falla → descarta y prueba otra optimización
- Devuelve roster optimizado + métricas + trace de consultas

BENEFICIOS:
- ComplianceWorker es ÚNICA fuente de verdad (DRY)
- Cada cambio validado ANTES de aplicar (robusto)
- Trace de consultas muestra colaboración real entre agents`,
      tools: [
        {
          type: 'function',
          function: {
            name: 'optimize_roster',
            description:
              'Optimiza un roster consultando a ComplianceWorker para validar cada cambio. Devuelve roster optimizado con trace de colaboración.',
            parameters: OptimizationInputSchema,
            execute: async (args: unknown): Promise<OptimizationResultWithQueries> => {
              const input = OptimizationInputSchema.parse(args) as OptimizationInputWithValidator;
              const appliedChanges: AppliedOptimization[] = [];
              const validationQueries: ValidationQuery[] = [];

              // Deep clone del roster
              let workingRoster: Roster = JSON.parse(JSON.stringify(input.roster));

              // Obtener validador (el Orchestrator debe proporcionar uno real)
              // Si no hay validador, usamos passthrough (solo para tests aislados)
              const validator: ComplianceValidator =
                input.complianceValidator ?? createPassthroughValidator();

              // Estado australiano para feriados (default: VIC)
              const australianState = (input as any).australianState ?? 'VIC';

              // Cargar penalty rules
              let penaltyRules: PenaltyRule[] = (input.penaltyRules as PenaltyRule[]) ?? [];
              if (penaltyRules.length === 0) {
                penaltyRules = await loadPenaltyRulesFromDb(input.roster.storeId);
              }

              // Calcular costo inicial
              const costBefore = await calculateRosterRelativeCost(workingRoster, penaltyRules, australianState);

              // --- PASO 1: Aplicar sugerencias de ComplianceWorker ---
              // Estas ya fueron validadas, se aplican directamente
              let suggestionsApplied = 0;
              if (input.complianceFeedback?.suggestions?.length) {
                for (const suggestion of input.complianceFeedback.suggestions) {
                  const result = applySuggestion(workingRoster, suggestion);
                  if (result.applied) {
                    suggestionsApplied++;
                    appliedChanges.push({
                      type: 'APPLIED_SUGGESTION',
                      description: result.description,
                      shiftIndex: suggestion.shiftIndex,
                      employeeId: suggestion.employeeId,
                      fromSuggestion: suggestion.relatedIssue,
                    });
                  }
                }

                // Remover turnos marcados para eliminación
                workingRoster.roster = workingRoster.roster.filter((s: any) => !s.__toRemove);
              }

              // --- PASO 2: Optimizaciones adicionales con validación ---
              // Cada cambio se valida con ComplianceWorker antes de aplicar
              let additionalOptimizations = 0;

              const opportunities = findCostOptimizationOpportunities(workingRoster, penaltyRules);

              for (const opportunity of opportunities) {
                // Consultar a ComplianceWorker antes de aplicar
                const result = await tryOptimizationWithValidation(
                  workingRoster,
                  opportunity.shiftIndex,
                  opportunity.proposedChange,
                  opportunity.description,
                  validator,
                );

                // Registrar la consulta (para el trace)
                validationQueries.push(result.query);

                if (result.applied) {
                  workingRoster = result.roster;
                  additionalOptimizations++;
                  appliedChanges.push({
                    type: 'MOVED_SHIFT',
                    description: `${opportunity.description} (validado por ComplianceWorker)`,
                    shiftIndex: opportunity.shiftIndex,
                    employeeId: workingRoster.roster[opportunity.shiftIndex]?.employeeId,
                    costImpact: opportunity.estimatedSavings,
                  });
                }
              }

              // --- PASO 3: Análisis de balance de horas ---
              const hoursBalance = analyzeHoursBalance(workingRoster);
              if (hoursBalance.imbalanced) {
                appliedChanges.push({
                  type: 'BALANCED_HOURS',
                  description: hoursBalance.details,
                  costImpact: 0,
                });
              }

              // --- PASO 4: Calcular métricas finales ---
              const costAfter = await calculateRosterRelativeCost(workingRoster, penaltyRules, australianState);
              const savingsPercent =
                costBefore > 0 ? ((costBefore - costAfter) / costBefore) * 100 : 0;

              const metrics: OptimizationMetrics = {
                relativeCostBefore: Math.round(costBefore * 100) / 100,
                relativeCostAfter: Math.round(costAfter * 100) / 100,
                savingsPercent: Math.round(savingsPercent * 100) / 100,
                totalShifts: workingRoster.roster.length,
                shiftsModified: additionalOptimizations,
                suggestionsApplied,
                additionalOptimizations,
              };

              const score = calculateOptimizationScore(metrics, hoursBalance, validationQueries);

              // Actualizar timestamp
              workingRoster.generatedAt = new Date().toISOString();

              const result: OptimizationResultWithQueries = {
                roster: RosterSchema.parse(workingRoster),
                appliedChanges,
                metrics,
                score,
                validationQueries,
              };

              return OptimizationResultSchema.extend({
                validationQueries: z.array(
                  z.object({
                    proposedChange: z.string(),
                    passed: z.boolean(),
                    reason: z.string().optional(),
                  }),
                ),
              }).parse(result);
            },
          },
        },
      ] as ToolDef[],
    });
  }
}
