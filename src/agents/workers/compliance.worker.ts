import { z } from 'zod';
import type { ToolDef } from '../../shared/types/tool';
import { checkRestPeriod, loadPenaltyRulesFromDb, calculatePenaltyRates } from '../tools/fairwork.tools';
import { isAustralianPublicHoliday } from '../tools/australian-holidays';
import { storeTools } from '../tools/store.tools';
import { employeeTools } from '../tools/employee.tools';
import { ComplianceResultSchema } from '../../shared/schemas/compliance.schema';
import { RosterSchema } from '../../shared/schemas/roster.schema';
import { EmployeeContractSchema } from '../../shared/schemas/employee.schema';
import { hoursBetween, addHoursToIso } from '../../shared/utils/time.utils';
import type { ComplianceResult, ComplianceIssue, ComplianceSuggestion } from '../../shared/types/compliance';
import type { Roster } from '../../shared/types/roster';
import type { Shift } from '../../shared/types/shift';

// WorkerBase fallback - @openai/agents SDK doesn't export a Worker class
// We use a local implementation that mimics the expected interface
const WorkerBase = class {
  name?: string;
  instructions?: string;
  tools?: ToolDef[];
  constructor(opts: { name?: string; instructions?: string; tools?: unknown[] } = {}) {
    this.name = opts.name;
    this.instructions = opts.instructions;
    this.tools = opts.tools as ToolDef[];
  }
};

// Fair Work minimum shift hours for casual employees
const MIN_SHIFT_HOURS_CASUAL = 3;
// Maximum shift span (12 hours as per Fair Work)
const MAX_SHIFT_SPAN_HOURS = 12;

// Removed: hoursBetween and addHoursToIso - now imported from shared/utils/time.utils

export class ComplianceWorker extends WorkerBase {
  constructor() {
    super({
      name: 'ComplianceWorker',
      instructions: `Valida cumplimiento Fair Work usando datos 100% de la DB (políticas, penalty_rules, contratos).

RESPONSABILIDADES:
- Carga minHoursBetweenShifts y maxHoursWeek desde la DB (SchedulingPolicy + EmploymentTypeHoursPolicy).
- Detecta feriados australianos automáticamente (sin DB de feriados).
- Valida: descansos entre turnos, horas máx semanales, duración mínima 3h (casuals), max span 12h.
- Si faltan penalty_rules o policy en DB, devuelve CRITICAL.
- Genera sugerencias de cambio para cada issue encontrado (feedback para ConflictWorker).
- Siempre devuelve JSON que cumpla ComplianceResultSchema.

CLASIFICACIÓN DE SEVERIDADES:
- CRITICAL: Violaciones legales que DEBEN corregirse antes de publicar el roster.
  Ejemplos: turno casual <3h, descanso insuficiente entre turnos, supera horas máx semanales.
  Acción: ConflictWorker DEBE aplicar la sugerencia asociada.

- MAJOR: Problemas significativos que deberían corregirse pero no bloquean.
  Ejemplos: turno en feriado con alto multiplier de costo, balance desigual de horas.
  Acción: OptimizationWorker debería considerar optimizar.

- MINOR: Alertas informativas que no requieren acción inmediata.
  Ejemplos: falta contrato en DB (usa defaults), warning de configuración.
  Acción: Registrar para review pero no bloquear.`,
      tools: [
        {
          type: 'function',
          function: {
            name: 'validate_fair_work_compliance',
            description: 'Valida un roster contra Fair Work Act y genera sugerencias de corrección',
            parameters: z.object({
              roster: RosterSchema,
              employeeContracts: z.array(EmployeeContractSchema).optional(),
              schedulingPolicy: z
                .object({
                  minHoursBetweenShifts: z.number().optional(),
                })
                .optional(),
              // Estado australiano para detectar feriados locales (default: VIC)
              australianState: z.string().optional(),
            }),
            execute: async (args: any): Promise<ComplianceResult> => {
              const schema = z.object({
                roster: RosterSchema,
                employeeContracts: z.array(EmployeeContractSchema).optional(),
                schedulingPolicy: z
                  .object({
                    minHoursBetweenShifts: z.number().optional(),
                  })
                  .optional(),
                australianState: z.string().optional(),
              });
              const parsed = schema.parse(args);
              const roster = parsed.roster as Roster;
              const australianState = parsed.australianState ?? 'VIC'; // Default VIC
              let employeeContracts: any[] = parsed.employeeContracts ?? [];

              const issues: ComplianceIssue[] = [];
              const suggestions: ComplianceSuggestion[] = [];

              // 1. Load scheduling policy from DB
              let minHoursBetweenShifts = 10; // fallback
              try {
                const policy = await storeTools.getStorePolicy.execute({ storeId: roster.storeId });
                if (policy) {
                  minHoursBetweenShifts = policy.minHoursBetweenShifts ?? 10;
                } else {
                  issues.push({
                    employeeId: '',
                    issue: 'MISSING_POLICY',
                    severity: 'CRITICAL',
                    details: { message: 'No se encontró SchedulingPolicy en DB para este store' },
                  });
                }
              } catch (err) {
                // DB not available; use fallback but warn
                issues.push({
                  employeeId: '',
                  issue: 'POLICY_LOAD_ERROR',
                  severity: 'MINOR',
                  details: { message: 'No se pudo cargar policy de DB, usando defaults' },
                });
              }

              // 2. Load penalty rules from DB
              const penaltyRules = await loadPenaltyRulesFromDb(roster.storeId);
              if (!penaltyRules.length) {
                issues.push({
                  employeeId: '',
                  issue: 'MISSING_PENALTY_RULES',
                  severity: 'CRITICAL',
                  details: { message: 'No penalty_rules encontradas en DB' },
                });
              }

              // 3. Load contracts from DB if not provided
              const employeeIds = Array.from(new Set((roster.roster ?? []).map((s: any) => s.employeeId)));
              if (!employeeContracts.length && employeeIds.length) {
                try {
                  employeeContracts = await employeeTools.getEmployeeContracts.execute({
                    storeId: roster.storeId,
                    employeeIds,
                  });
                } catch (err) {
                  issues.push({
                    employeeId: '',
                    issue: 'CONTRACTS_LOAD_ERROR',
                    severity: 'MINOR',
                    details: { message: 'No se pudieron cargar contratos de DB' },
                  });
                }
              }

              // Build per employee shift lists with original indices
              const shiftsByEmployee: Record<string, { shift: any; originalIndex: number }[]> = {};
              (roster.roster ?? []).forEach((shift: any, idx: number) => {
                shiftsByEmployee[shift.employeeId] = shiftsByEmployee[shift.employeeId] ?? [];
                shiftsByEmployee[shift.employeeId].push({ shift, originalIndex: idx });
              });

              // Calculate total hours per employee for max weekly hours check
              const hoursByEmployee: Record<string, number> = {};

              for (const [employeeId, shiftEntries] of Object.entries(shiftsByEmployee)) {
                // Sort by start
                shiftEntries.sort((a, b) => new Date(a.shift.start).getTime() - new Date(b.shift.start).getTime());

                // Get contract for this employee
                const contract = employeeContracts.find((c: any) => c.employeeId === employeeId);
                const employmentType = contract?.employmentType ?? 'CASUAL';
                const contractMinRest = contract?.minHoursBetweenShifts ?? minHoursBetweenShifts;
                const maxHoursWeek = contract?.maxHoursWeek;

                if (!contract) {
                  issues.push({
                    employeeId,
                    issue: 'MISSING_CONTRACT',
                    severity: 'MINOR',
                    details: { message: `No se encontró contrato para empleado ${employeeId}, usando defaults` },
                  });
                }

                // Validate each shift
                for (const { shift: s, originalIndex } of shiftEntries) {
                  const shiftHours = hoursBetween(s.start, s.end);
                  hoursByEmployee[employeeId] = (hoursByEmployee[employeeId] ?? 0) + shiftHours;

                  // 4. Validate minimum shift length for casuals (3h)
                  if (employmentType === 'CASUAL' && shiftHours < MIN_SHIFT_HOURS_CASUAL) {
                    issues.push({
                      employeeId,
                      issue: 'MIN_SHIFT_LENGTH_VIOLATION',
                      severity: 'CRITICAL',
                      details: {
                        shiftIndex: originalIndex,
                        shiftHours,
                        minRequired: MIN_SHIFT_HOURS_CASUAL,
                        message: `Turno casual de ${shiftHours.toFixed(1)}h menor a mínimo ${MIN_SHIFT_HOURS_CASUAL}h`,
                      },
                    });
                    // Suggestion: Extend shift to 3h
                    suggestions.push({
                      type: 'EXTEND_SHIFT',
                      employeeId,
                      shiftIndex: originalIndex,
                      reason: `Extender turno a mínimo ${MIN_SHIFT_HOURS_CASUAL}h para cumplir Fair Work`,
                      suggestedChange: {
                        newEnd: addHoursToIso(s.start, MIN_SHIFT_HOURS_CASUAL),
                      },
                      relatedIssue: 'MIN_SHIFT_LENGTH_VIOLATION',
                    });
                  }

                  // 5. Validate max shift span (12h)
                  if (shiftHours > MAX_SHIFT_SPAN_HOURS) {
                    issues.push({
                      employeeId,
                      issue: 'MAX_SHIFT_SPAN_VIOLATION',
                      severity: 'CRITICAL',
                      details: {
                        shiftIndex: originalIndex,
                        shiftHours,
                        maxAllowed: MAX_SHIFT_SPAN_HOURS,
                        message: `Turno de ${shiftHours.toFixed(1)}h excede máximo ${MAX_SHIFT_SPAN_HOURS}h`,
                      },
                    });
                    // Suggestion: Shorten shift to 12h
                    suggestions.push({
                      type: 'SHORTEN_SHIFT',
                      employeeId,
                      shiftIndex: originalIndex,
                      reason: `Acortar turno a máximo ${MAX_SHIFT_SPAN_HOURS}h para cumplir Fair Work`,
                      suggestedChange: {
                        newEnd: addHoursToIso(s.start, MAX_SHIFT_SPAN_HOURS),
                      },
                      relatedIssue: 'MAX_SHIFT_SPAN_VIOLATION',
                    });
                  }

                  // 6. Check for public holiday (auto-detect)
                  if (penaltyRules.length) {
                    try {
                      const shiftDate = s.start.split('T')[0];
                      const holidayInfo = isAustralianPublicHoliday(shiftDate, australianState);
                      const isHoliday = !!holidayInfo;

                      const penalty = await calculatePenaltyRates({
                        shiftDate,
                        startTime: s.start.split('T')[1]?.split('.')[0] ?? '00:00:00',
                        endTime: s.end.split('T')[1]?.split('.')[0] ?? '23:59:59',
                        employmentType,
                        penaltyRules,
                        isPublicHoliday: isHoliday,
                      });

                      // Log high penalty multipliers as MAJOR for awareness
                      if (penalty.multiplier >= 2.0) {
                        issues.push({
                          employeeId,
                          issue: 'HIGH_PENALTY_MULTIPLIER',
                          severity: 'MAJOR',
                          details: {
                            shiftIndex: originalIndex,
                            ...penalty,
                            holiday: holidayInfo?.name ?? null,
                          },
                        });
                        // Suggestion: Consider reassigning to another day/employee
                        suggestions.push({
                          type: 'REASSIGN_SHIFT',
                          employeeId,
                          shiftIndex: originalIndex,
                          reason: `Considerar reasignar turno de feriado (${holidayInfo?.name ?? 'fin de semana'}) a otro empleado o día para reducir costos`,
                          relatedIssue: 'HIGH_PENALTY_MULTIPLIER',
                        });
                      }
                    } catch (err) {
                      // Non-blocking; penalty calc is informational
                    }
                  }
                }

                // 7. Validate rest periods between shifts
                for (let i = 0; i < shiftEntries.length - 1; i++) {
                  const { shift: s1, originalIndex: idx1 } = shiftEntries[i];
                  const { shift: s2, originalIndex: idx2 } = shiftEntries[i + 1];
                  const restResult = await checkRestPeriod({
                    employeeId,
                    previousShiftEnd: s1.end,
                    nextShiftStart: s2.start,
                    minHours: contractMinRest,
                  });
                  if (!restResult.compliant) {
                    issues.push({
                      employeeId,
                      issue: 'MIN_REST_VIOLATION',
                      severity: 'CRITICAL',
                      details: {
                        shiftIndex: idx2,
                        previousShiftIndex: idx1,
                        ...restResult,
                      },
                    });
                    // Suggestion: Move second shift later
                    const requiredGap = contractMinRest - restResult.restHours;
                    suggestions.push({
                      type: 'MOVE_SHIFT',
                      employeeId,
                      shiftIndex: idx2,
                      reason: `Mover turno ${requiredGap.toFixed(1)}h más tarde para cumplir descanso mínimo de ${contractMinRest}h`,
                      suggestedChange: {
                        newStart: addHoursToIso(s2.start, requiredGap),
                        newEnd: addHoursToIso(s2.end, requiredGap),
                      },
                      relatedIssue: 'MIN_REST_VIOLATION',
                    });
                  }
                }
              }

              // 8. Validate max weekly hours
              for (const contract of employeeContracts) {
                if (contract.maxHoursWeek != null) {
                  const worked = hoursByEmployee[contract.employeeId] ?? 0;
                  if (worked > contract.maxHoursWeek) {
                    issues.push({
                      employeeId: contract.employeeId,
                      issue: 'MAX_WEEKLY_HOURS_VIOLATION',
                      severity: 'CRITICAL',
                      details: {
                        workedHours: worked,
                        maxAllowed: contract.maxHoursWeek,
                        excessHours: worked - contract.maxHoursWeek,
                        message: `Empleado excede horas semanales (${worked.toFixed(1)}h > ${contract.maxHoursWeek}h)`,
                      },
                    });
                    // Suggestion: Remove or reassign shifts
                    const excessHours = worked - contract.maxHoursWeek;
                    suggestions.push({
                      type: 'REMOVE_SHIFT',
                      employeeId: contract.employeeId,
                      reason: `Remover o reasignar ${excessHours.toFixed(1)}h de turnos para cumplir máximo semanal de ${contract.maxHoursWeek}h`,
                      relatedIssue: 'MAX_WEEKLY_HOURS_VIOLATION',
                    });
                  }
                }
              }

              // 9. Validate max consecutive working days (6 days max per Fair Work)
              const MAX_CONSECUTIVE_DAYS = 6;
              for (const [employeeId, shiftEntries] of Object.entries(shiftsByEmployee)) {
                // Get unique working dates for this employee
                const workingDates = [...new Set(
                  shiftEntries.map(se => se.shift.start.split('T')[0])
                )].sort();

                if (workingDates.length > 1) {
                  let consecutiveDays = 1;
                  let streakStart = workingDates[0];
                  
                  for (let i = 1; i < workingDates.length; i++) {
                    const prevDate = new Date(workingDates[i - 1]);
                    const currDate = new Date(workingDates[i]);
                    const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
                    
                    if (diffDays === 1) {
                      consecutiveDays++;
                      if (consecutiveDays > MAX_CONSECUTIVE_DAYS) {
                        issues.push({
                          employeeId,
                          issue: 'MAX_CONSECUTIVE_DAYS_VIOLATION',
                          severity: 'CRITICAL',
                          details: {
                            consecutiveDays,
                            streakStart,
                            streakEnd: workingDates[i],
                            maxAllowed: MAX_CONSECUTIVE_DAYS,
                            message: `Empleado trabaja ${consecutiveDays} días consecutivos (máx ${MAX_CONSECUTIVE_DAYS})`,
                          },
                        });
                        // Suggestion: Add rest day
                        suggestions.push({
                          type: 'ADD_REST_DAY',
                          employeeId,
                          reason: `Añadir día de descanso entre ${streakStart} y ${workingDates[i]} para cumplir máximo ${MAX_CONSECUTIVE_DAYS} días consecutivos`,
                          relatedIssue: 'MAX_CONSECUTIVE_DAYS_VIOLATION',
                        });
                        break; // Only report once per employee
                      }
                    } else {
                      // Reset streak
                      consecutiveDays = 1;
                      streakStart = workingDates[i];
                    }
                  }
                }
              }

              // 10. Validate min weekly hours per Challenge Brief
              // FT: 35-38h, PT: 20-32h, Casual: 8-24h
              const MIN_HOURS_BY_TYPE: Record<string, number> = {
                FULL_TIME: 35,
                PART_TIME: 20,
                CASUAL: 8,
              };
              
              for (const contract of employeeContracts) {
                const employmentType = contract.employmentType || 'CASUAL';
                const minHours = MIN_HOURS_BY_TYPE[employmentType] || 0;
                const worked = hoursByEmployee[contract.employeeId] ?? 0;
                
                if (worked > 0 && worked < minHours) {
                  issues.push({
                    employeeId: contract.employeeId,
                    issue: 'MIN_WEEKLY_HOURS_VIOLATION',
                    severity: 'MAJOR', // Not critical but worth noting
                    details: {
                      workedHours: worked,
                      minRequired: minHours,
                      employmentType,
                      shortfallHours: minHours - worked,
                      message: `Empleado ${employmentType} con ${worked.toFixed(1)}h (mínimo ${minHours}h)`,
                    },
                  });
                  // Suggestion: Assign more shifts
                  suggestions.push({
                    type: 'ASSIGN_MORE_SHIFTS',
                    employeeId: contract.employeeId,
                    reason: `Asignar ${(minHours - worked).toFixed(1)}h más para cumplir mínimo ${minHours}h/${employmentType}`,
                    relatedIssue: 'MIN_WEEKLY_HOURS_VIOLATION',
                  });
                }
              }

              // 11. Validate at least 1 specialist per station per shift 
              // (Challenge Criterion 4: "Each station has at least 1 qualified person per shift")
              // Group shifts by date and station
              const shiftsByDateStation: Record<string, { stationCode: string; employeeIds: string[] }> = {};
              for (const shift of (roster.roster ?? []) as any[]) {
                const date = shift.start?.split('T')[0] || 'unknown';
                const stationCode = shift.station?.toUpperCase() || shift.stationId || 'UNKNOWN';
                const key = `${date}:${stationCode}`;
                if (!shiftsByDateStation[key]) {
                  shiftsByDateStation[key] = { stationCode, employeeIds: [] };
                }
                shiftsByDateStation[key].employeeIds.push(shift.employeeId);
              }

              // Build map of employeeId -> defaultStationCode
              const employeeDefaultStation: Record<string, string | null> = {};
              for (const contract of employeeContracts) {
                employeeDefaultStation[contract.employeeId] = (contract as any).defaultStationCode || null;
              }

              // Check each date-station combo has at least 1 specialist
              for (const [key, data] of Object.entries(shiftsByDateStation)) {
                const [date, stationCode] = key.split(':');
                const specialists = data.employeeIds.filter(empId => {
                  const empStation = employeeDefaultStation[empId]?.toUpperCase();
                  return empStation === stationCode.toUpperCase();
                });

                if (specialists.length === 0 && data.employeeIds.length > 0) {
                  issues.push({
                    employeeId: data.employeeIds[0], // Attach to first employee for reference
                    issue: 'NO_SPECIALIST_FOR_STATION',
                    severity: 'MAJOR',
                    details: {
                      date,
                      stationCode,
                      employeesAssigned: data.employeeIds.length,
                      specialistsCount: 0,
                      message: `Estación ${stationCode} en ${date} sin especialista (${data.employeeIds.length} crew asignados)`,
                    },
                  });
                }
              }

              const result: ComplianceResult = {
                passed: !issues.some((i) => i.severity === 'CRITICAL'),
                issues,
                summary: issues.length
                  ? `${issues.length} issues found (${issues.filter((i) => i.severity === 'CRITICAL').length} critical)`
                  : 'No issues detected',
                suggestions: suggestions.length ? suggestions : undefined,
              };
              return ComplianceResultSchema.parse(result);
            },
          },
        },
      ] as ToolDef[],
    });
  }
}
