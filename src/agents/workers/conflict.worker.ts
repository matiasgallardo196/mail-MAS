import { z } from 'zod';
import type { ToolDef } from '../../shared/types/tool';
import type { WorkerOptions } from '../../shared/types/agent';
import { RosterSchema } from '../../shared/schemas/roster.schema';
import type { Roster } from '../../shared/types/roster';
import type { Shift } from '../../shared/types/shift';
import type { ComplianceSuggestion } from '../../shared/types/compliance';
import { employeeTools } from '../tools/employee.tools';
import { hoursBetween, addHoursToIso } from '../../shared/utils/time.utils';
import { SHIFT_CODE_TIMES, isAvailableShiftCode } from '../../shared/constants/shift-codes';
import type { EmployeeAvailability, EmployeeSkill } from '../../shared/types/employee';

// WorkerBase fallback - @openai/agents SDK doesn't export a Worker class
// We use a local implementation that mimics the expected interface
const WorkerBase = class {
  name?: string;
  instructions?: string;
  tools?: ToolDef[];
  constructor(opts: WorkerOptions = { name: 'fallback' }) {
    this.name = opts.name;
    this.instructions = opts.instructions;
    this.tools = opts.tools as ToolDef[];
  }
};


// --- Input/Output Schemas ---

export const CoverageGapSchema = z.object({
  date: z.string(),
  stationId: z.string(),
  stationCode: z.string().optional(),
  periodType: z.enum(['NORMAL', 'PEAK']),
  required: z.number(),
  assigned: z.number(),
  gap: z.number(),
});

export type CoverageGap = z.infer<typeof CoverageGapSchema>;

export const ResolveCoverageGapsInputSchema = z.object({
  roster: RosterSchema,
  gaps: z.array(CoverageGapSchema),
  storeId: z.string(),
  weekStart: z.string(),
  weekEnd: z.string(),
});

export const ApplySuggestionsInputSchema = z.object({
  roster: RosterSchema,
  suggestions: z.array(
    z.object({
      type: z.string(),
      employeeId: z.string().optional(),
      shiftIndex: z.number().optional(),
      reason: z.string().optional(),
      suggestedChange: z
        .object({
          newStart: z.string().optional(),
          newEnd: z.string().optional(),
          newEmployeeId: z.string().optional(),
        })
        .optional(),
      relatedIssue: z.string().optional(),
    })
  ),
});

export const ConflictResolutionResultSchema = z.object({
  roster: RosterSchema,
  resolved: z.number(),
  unresolved: z.number(),
  actions: z.array(
    z.object({
      type: z.string(),
      description: z.string(),
      success: z.boolean(),
      employeeId: z.string().optional(),
      shiftIndex: z.number().optional(),
    })
  ),
  warnings: z.array(z.string()),
  requiresHumanReview: z.boolean(),
});

export type ConflictResolutionResult = z.infer<typeof ConflictResolutionResultSchema>;

// --- Shift Code Definitions ---
// SHIFT_CODE_TIMES imported from shared/constants/shift-codes.ts

// --- Helper Functions ---
// hoursBetween and addHoursToIso imported from shared/utils/time.utils

function createShiftFromAvailability(
  availability: EmployeeAvailability,
  stationId: string,
  stationCode?: string,
): Shift | null {
  const shiftCode = availability.shiftCode;
  if (!shiftCode || !isAvailableShiftCode(shiftCode)) {
    return null;
  }

  const shiftTimes = SHIFT_CODE_TIMES[shiftCode];
  if (!shiftTimes) {
    if (availability.startTime && availability.endTime) {
      return {
        employeeId: availability.employeeId,
        start: `${availability.date}T${availability.startTime}`,
        end: `${availability.date}T${availability.endTime}`,
        station: stationCode || 'general',
        isPeak: false,
      };
    }
    return null;
  }

  return {
    employeeId: availability.employeeId,
    start: `${availability.date}T${shiftTimes.startTime}:00`,
    end: `${availability.date}T${shiftTimes.endTime}:00`,
    station: stationCode || 'general',
    isPeak: false,
  };
}

/**
 * Aplica una sugerencia de ComplianceWorker al roster
 * 
 * AUTONOMOUS BEHAVIOR:
 * - For REMOVE_SHIFT without shiftIndex: finds and removes the employee's last shift
 * - For ASSIGN_MORE_SHIFTS: delegates to resolve_coverage_gaps tool
 */
function applySuggestion(
  roster: Roster,
  suggestion: ComplianceSuggestion,
): { applied: boolean; description: string } {
  const shifts = roster.roster;
  let shiftIndex = suggestion.shiftIndex;

  // AUTONOMOUS: For REMOVE_SHIFT without shiftIndex, find the employee's last shift
  if (suggestion.type === 'REMOVE_SHIFT' && shiftIndex === undefined && suggestion.employeeId) {
    const employeeShiftIndices = shifts
      .map((s, idx) => ({ shift: s, idx }))
      .filter(entry => entry.shift.employeeId === suggestion.employeeId)
      .map(entry => entry.idx);
    
    if (employeeShiftIndices.length === 0) {
      return { applied: false, description: `No se encontraron turnos para ${suggestion.employeeId}` };
    }
    // Pick the last shift (most likely to be the excess that pushed over the limit)
    shiftIndex = employeeShiftIndices[employeeShiftIndices.length - 1];
  }

  // ASSIGN_MORE_SHIFTS is handled by resolve_coverage_gaps, not here
  if (suggestion.type === 'ASSIGN_MORE_SHIFTS') {
    return { 
      applied: false, 
      description: `ASSIGN_MORE_SHIFTS para ${suggestion.employeeId} debe resolverse via resolve_coverage_gaps` 
    };
  }

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
        description: `Sugerencia de agregar día de descanso para ${suggestion.employeeId} (requiere review manual)`,
      };
  }

  return { applied: false, description: `No se pudo aplicar sugerencia: ${suggestion.type}` };
}

// --- Main Worker Class ---

/**
 * ConflictWorker - Resuelve conflictos de cobertura y aplica correcciones
 *
 * Responsabilidades:
 * - Aplicar sugerencias de ComplianceWorker/OptimizationWorker
 * - Resolver gaps de cobertura buscando empleados alternativos
 * - Reasignar turnos cuando hay conflictos
 * - Marcar situaciones irresolubles para revisión humana
 *
 * Colaboración con otros agents:
 * - Recibe gaps de cobertura de RosterWorker
 * - Recibe suggestions de ComplianceWorker
 * - Consulta employee.tools para buscar empleados disponibles
 * - Reporta a Orchestrator situaciones que requieren intervención humana
 */
export class ConflictWorker extends WorkerBase {
  constructor() {
    super({
      name: 'ConflictWorker',
      instructions: `
        Eres un experto en resolución de conflictos de scheduling. Tu tarea es:

        1. APLICAR CORRECCIONES:
           - Procesar sugerencias de ComplianceWorker (EXTEND_SHIFT, MOVE_SHIFT, etc.)
           - Aplicar cambios respetando constraints
           - Registrar cada acción tomada

        2. RESOLVER GAPS DE COBERTURA:
           - Analizar estaciones con insuficiente staff
           - Buscar empleados disponibles que matcheen con la estación
           - Crear nuevos turnos para cubrir gaps
           - Priorizar empleados con menos horas asignadas (balance)

        3. MANEJAR CONFLICTOS IRRESOLUBLES:
           - Si no hay empleados disponibles → marcar para revisión humana
           - Si la sugerencia no se puede aplicar → reportar razón
           - Generar reporte de situaciones que requieren intervención

        4. COLABORAR CON OTROS AGENTS:
           - Recibir feedback estructurado
           - Devolver roster corregido con trace de acciones
           - Proporcionar métricas de resolución

        PRIORIDADES:
        1. Primero aplicar suggestions de compliance (son obligatorias)
        2. Luego resolver gaps de cobertura
        3. Finalmente balancear carga de trabajo
      `,
      tools: [
        // Tool 1: Aplicar sugerencias de otros workers
        {
          type: 'function',
          function: {
            name: 'apply_suggestions',
            description:
              'Aplica sugerencias de ComplianceWorker u OptimizationWorker al roster. Devuelve roster modificado con trace de cambios.',
            parameters: ApplySuggestionsInputSchema,
            execute: async (args: unknown): Promise<ConflictResolutionResult> => {
              const input = ApplySuggestionsInputSchema.parse(args);
              const workingRoster: Roster = JSON.parse(JSON.stringify(input.roster));
              const actions: ConflictResolutionResult['actions'] = [];
              const warnings: string[] = [];
              let resolved = 0;
              let unresolved = 0;

              // Aplicar cada sugerencia
              for (const suggestion of input.suggestions) {
                const result = applySuggestion(workingRoster, suggestion as ComplianceSuggestion);
                actions.push({
                  type: suggestion.type,
                  description: result.description,
                  success: result.applied,
                  employeeId: suggestion.employeeId,
                  shiftIndex: suggestion.shiftIndex,
                });

                if (result.applied) {
                  resolved++;
                } else {
                  unresolved++;
                  warnings.push(`No se pudo aplicar: ${suggestion.reason || suggestion.type}`);
                }
              }

              // Remover turnos marcados para eliminación
              workingRoster.roster = workingRoster.roster.filter((s: any) => !s.__toRemove);

              // Actualizar timestamp
              workingRoster.generatedAt = new Date().toISOString();

              return ConflictResolutionResultSchema.parse({
                roster: workingRoster,
                resolved,
                unresolved,
                actions,
                warnings,
                requiresHumanReview: unresolved > 0,
              });
            },
          },
        },
        // Tool 2: Resolver gaps de cobertura
        {
          type: 'function',
          function: {
            name: 'resolve_coverage_gaps',
            description:
              'Busca empleados disponibles para cubrir gaps de cobertura en estaciones. Crea nuevos turnos según disponibilidad.',
            parameters: ResolveCoverageGapsInputSchema,
            execute: async (args: unknown): Promise<ConflictResolutionResult> => {
              const input = ResolveCoverageGapsInputSchema.parse(args);
              const workingRoster: Roster = JSON.parse(JSON.stringify(input.roster));
              const actions: ConflictResolutionResult['actions'] = [];
              const warnings: string[] = [];
              let resolved = 0;
              let unresolved = 0;

              // === PREVENTIVE: Limit hours per employee per week by employment type ===
              const MAX_HOURS_BY_TYPE: Record<string, number> = {
                FULL_TIME: 38,
                PART_TIME: 32,
                CASUAL: 24,
              };

              // Helper to calculate shift hours from shift code
              const getShiftHours = (shiftCode: string | null | undefined): number => {
                switch (shiftCode) {
                  case '1F': return 9;  // 06:30-15:30
                  case '2F': return 9;  // 14:00-23:00
                  case '3F': return 12; // 08:00-20:00
                  case 'S': return 8.5; // 06:30-15:00 (manager)
                  case 'SC': return 9;  // 11:00-20:00 (shift change)
                  default: return 9;    // Default to 9h
                }
              };

              // Calculate hours worked per employee across the entire week
              const hoursPerEmployee: Map<string, number> = new Map();
              for (const shift of workingRoster.roster) {
                const hours = getShiftHours(shift.shiftCode);
                const current = hoursPerEmployee.get(shift.employeeId) || 0;
                hoursPerEmployee.set(shift.employeeId, current + hours);
              }

              // Get employment types for all employees in the roster
              const uniqueEmployeeIds = [...new Set(workingRoster.roster.map(s => s.employeeId))];
              const contracts = uniqueEmployeeIds.length > 0
                ? await employeeTools.getEmployeeContracts.execute({
                    storeId: input.storeId,
                    employeeIds: uniqueEmployeeIds,
                  })
                : [];
              
              // Map employeeId -> employmentType
              const employeeTypes: Map<string, string> = new Map();
              for (const contract of contracts) {
                employeeTypes.set(contract.employeeId, contract.employmentType);
              }

              // Set de empleados ya asignados por fecha (to avoid same-day duplicates)
              const assignedByDate: Map<string, Set<string>> = new Map();
              for (const shift of workingRoster.roster) {
                const date = shift.start.split('T')[0];
                if (!assignedByDate.has(date)) {
                  assignedByDate.set(date, new Set());
                }
                assignedByDate.get(date)!.add(shift.employeeId);
              }

              // Procesar cada gap
              for (const gap of input.gaps) {
                if (gap.gap <= 0) continue;

                try {
                  // Buscar empleados disponibles para esa fecha
                  const availability = await employeeTools.getEmployeeAvailability.execute({
                    storeId: input.storeId,
                    startDate: gap.date,
                    endDate: gap.date,
                    employeeIds: [], // Todos los empleados
                  });

                  // Buscar skills para matching
                  const employeeIds = [...new Set(availability.map((a) => a.employeeId))];
                  const skills =
                    employeeIds.length > 0
                      ? await employeeTools.getEmployeeSkills.execute({ employeeIds })
                      : [];

                  // Get contracts for available employees (to know their type)
                  const availContracts = employeeIds.length > 0
                    ? await employeeTools.getEmployeeContracts.execute({
                        storeId: input.storeId,
                        employeeIds,
                      })
                    : [];
                  
                  // Map available employees to their types
                  for (const contract of availContracts) {
                    if (!employeeTypes.has(contract.employeeId)) {
                      employeeTypes.set(contract.employeeId, contract.employmentType);
                    }
                  }

                  // Filtrar empleados que:
                  // 1. Estén disponibles ese día
                  // 2. No estén ya asignados ese día
                  // 3. No excedan el límite de HORAS semanales según su tipo de contrato
                  // 4. Matcheen con la estación (si es posible)
                  const assigned = assignedByDate.get(gap.date) || new Set();

                  const candidatos = availability.filter((avail) => {
                    // Check if already assigned today
                    if (assigned.has(avail.employeeId)) return false;
                    
                    // Check if exceeds weekly hours limit
                    const empType = employeeTypes.get(avail.employeeId) || 'CASUAL';
                    const maxHours = MAX_HOURS_BY_TYPE[empType] || 24;
                    const currentHours = hoursPerEmployee.get(avail.employeeId) || 0;
                    const shiftHours = getShiftHours(avail.shiftCode);
                    
                    if (currentHours + shiftHours > maxHours) return false;
                    
                    if (!avail.shiftCode || avail.shiftCode === '/' || avail.shiftCode === 'NA')
                      return false;

                    // Verificar skill match (with CREW/MANAGER fallback)
                    const empSkills = skills.find((s) => s.employeeId === avail.employeeId);
                    if (empSkills) {
                      const hasMatch = empSkills.skills.some(
                        (skill) =>
                          skill.toUpperCase() === gap.stationCode?.toUpperCase() ||
                          skill.toUpperCase().includes(gap.stationCode?.toUpperCase() || '') ||
                          skill.toUpperCase() === 'CREW' ||
                          skill.toUpperCase() === 'MANAGER',
                      );
                      if (hasMatch) return true;
                    }

                    // Si no hay match de skills pero hay disponibilidad, considerar
                    return avail.stationId === gap.stationId;
                  });

                  // Asignar hasta cubrir el gap
                  let gapRemaining = gap.gap;
                  for (const candidato of candidatos) {
                    if (gapRemaining <= 0) break;

                    const newShift = createShiftFromAvailability(
                      candidato,
                      gap.stationId,
                      gap.stationCode,
                    );

                    if (newShift) {
                      workingRoster.roster.push(newShift);
                      assigned.add(candidato.employeeId);
                      
                      // Update weekly hours tracking
                      const currentHrs = hoursPerEmployee.get(candidato.employeeId) || 0;
                      hoursPerEmployee.set(candidato.employeeId, currentHrs + getShiftHours(candidato.shiftCode));
                      
                      gapRemaining--;
                      resolved++;

                      actions.push({
                        type: 'ADD_SHIFT',
                        description: `Agregado turno para ${candidato.employeeId} en ${gap.stationCode || gap.stationId} el ${gap.date}`,
                        success: true,
                        employeeId: candidato.employeeId,
                      });
                    }
                  }

                  if (gapRemaining > 0) {
                    unresolved += gapRemaining;
                    warnings.push(
                      `Gap parcialmente resuelto para ${gap.stationCode || gap.stationId} el ${gap.date}: faltan ${gapRemaining} empleados (límite semanal puede estar afectando)`,
                    );
                  }
                } catch (error) {
                  unresolved += gap.gap;
                  warnings.push(
                    `Error al resolver gap para ${gap.stationCode || gap.stationId} el ${gap.date}: ${error instanceof Error ? error.message : String(error)}`,
                  );
                }
              }

              // Actualizar timestamp
              workingRoster.generatedAt = new Date().toISOString();

              return ConflictResolutionResultSchema.parse({
                roster: workingRoster,
                resolved,
                unresolved,
                actions,
                warnings,
                requiresHumanReview: unresolved > 0,
              });
            },
          },
        },
        // Tool 3: Marcar para revisión humana
        {
          type: 'function',
          function: {
            name: 'request_human_review',
            description:
              'Marca situaciones que no pueden resolverse automáticamente para revisión humana.',
            parameters: z.object({
              roster: RosterSchema,
              issues: z.array(
                z.object({
                  type: z.string(),
                  description: z.string(),
                  severity: z.enum(['CRITICAL', 'MAJOR', 'MINOR']),
                  affectedShiftIndices: z.array(z.number()).optional(),
                  affectedEmployeeIds: z.array(z.string()).optional(),
                })
              ),
            }),
            execute: async (args: unknown): Promise<ConflictResolutionResult> => {
              const input = z
                .object({
                  roster: RosterSchema,
                  issues: z.array(
                    z.object({
                      type: z.string(),
                      description: z.string(),
                      severity: z.enum(['CRITICAL', 'MAJOR', 'MINOR']),
                      affectedShiftIndices: z.array(z.number()).optional(),
                      affectedEmployeeIds: z.array(z.string()).optional(),
                    })
                  ),
                })
                .parse(args);

              const warnings = input.issues.map(
                (issue) =>
                  `[${issue.severity}] ${issue.type}: ${issue.description}` +
                  (issue.affectedEmployeeIds
                    ? ` (empleados: ${issue.affectedEmployeeIds.join(', ')})`
                    : ''),
              );

              return ConflictResolutionResultSchema.parse({
                roster: input.roster,
                resolved: 0,
                unresolved: input.issues.length,
                actions: input.issues.map((issue) => ({
                  type: 'HUMAN_REVIEW_REQUESTED',
                  description: issue.description,
                  success: false,
                  employeeId: issue.affectedEmployeeIds?.[0],
                })),
                warnings,
                requiresHumanReview: true,
              });
            },
          },
        },
      ] as ToolDef[],
    });
  }
}
