import { z } from 'zod';
import type { ToolDef } from '../../shared/types/tool';
import { checkRestPeriod, loadPenaltyRulesFromDb, calculatePenaltyRates } from '../tools/fairwork.tools';
import { isAustralianPublicHoliday } from '../tools/australian-holidays';
import { storeTools } from '../tools/store.tools';
import { employeeTools } from '../tools/employee.tools';
import { ComplianceResultSchema } from '../../shared/schemas/compliance.schema';
import type { ComplianceResult, ComplianceIssue, ComplianceSuggestion } from '../../shared/types/compliance';
import type { Roster } from '../../shared/types/roster';

const WorkerBase = (() => {
  try {
    return require('@openai/agents').Worker;
  } catch (err) {
    return class {
      name?: string;
      instructions?: string;
      tools?: ToolDef[];
      constructor(opts: any = {}) {
        this.name = opts.name;
        this.instructions = opts.instructions;
        this.tools = opts.tools as ToolDef[];
      }
    };
  }
})();

// Fair Work minimum shift hours for casual employees
const MIN_SHIFT_HOURS_CASUAL = 3;
// Maximum shift span (12 hours as per Fair Work)
const MAX_SHIFT_SPAN_HOURS = 12;

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

export class ComplianceWorker extends WorkerBase {
  constructor() {
    super({
      name: 'ComplianceWorker',
      instructions: `Valida cumplimiento Fair Work usando datos 100% de la DB (políticas, penalty_rules, contratos).
      - Carga minHoursBetweenShifts y maxHoursWeek desde la DB (SchedulingPolicy + EmploymentTypeHoursPolicy).
      - Detecta feriados australianos automáticamente (sin DB de feriados).
      - Valida: descansos entre turnos, horas máx semanales, duración mínima 3h (casuals), max span 12h.
      - Si faltan penalty_rules o policy en DB, devuelve CRITICAL.
      - Genera sugerencias de cambio para cada issue encontrado (feedback para RosterWorker).
      - Siempre devuelve JSON que cumpla ComplianceResultSchema.`,
      tools: [
        {
          type: 'function',
          function: {
            name: 'validate_fair_work_compliance',
            description: 'Valida un roster contra Fair Work Act y genera sugerencias de corrección',
            parameters: z.object({
              roster: z.any(),
              employeeContracts: z.array(z.any()).optional(),
              schedulingPolicy: z
                .object({
                  minHoursBetweenShifts: z.number().optional(),
                })
                .optional(),
            }),
            execute: async (args: any): Promise<ComplianceResult> => {
              const schema = z.object({
                roster: z.any(),
                employeeContracts: z.array(z.any()).optional(),
                schedulingPolicy: z
                  .object({
                    minHoursBetweenShifts: z.number().optional(),
                  })
                  .optional(),
              });
              const parsed = schema.parse(args);
              const roster = parsed.roster as Roster;
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
                      const holidayInfo = isAustralianPublicHoliday(shiftDate, 'VIC');
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
