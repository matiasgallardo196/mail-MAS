import { Worker } from '@openai/agents';
import { z } from 'zod';
import type { ToolDef } from '../../shared/types/tool';
import {
  CheckRestPeriodParams,
  CheckRestPeriodResult,
  checkRestPeriod,
  CalculatePenaltyRatesParams,
  calculatePenaltyRates,
} from '../tools/fairwork.tools';
import { ComplianceResultSchema, ComplianceIssueSchema } from '../../shared/schemas/compliance.schema';
import type { ComplianceResult } from '../../shared/types/compliance';
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

export class ComplianceWorker extends WorkerBase {
  constructor() {
    super({
      name: 'ComplianceWorker',
      instructions: `Eres un verificador de cumplimiento del Fair Work Act 2009 y Restaurant Industry Award 2020.
      Verifica: descansos entre turnos, horas máximas por contrato y penalty rates.`,
      tools: [
        {
          type: 'function',
          function: {
            name: 'validate_fair_work_compliance',
            description: 'Valida un roster contra Fair Work Act',
            parameters: z.object({
              roster: z.any(),
              employeeContracts: z.array(z.any()).optional(),
              schedulingPolicy: z
                .object({
                  minHoursBetweenShifts: z.number().optional(),
                })
                .optional(),
            }),
            execute: async (args) => {
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
              const employeeContracts: any[] = parsed.employeeContracts ?? [];
              const schedulingPolicy = parsed.schedulingPolicy;
              // Validate rest-periods per employee
              const issues = [] as ComplianceResult['issues'];
              // Build per employee shift lists
              const shiftsByEmployee: Record<string, any[]> = {};
              for (const shift of roster.roster ?? []) {
                shiftsByEmployee[shift.employeeId] = shiftsByEmployee[shift.employeeId] ?? [];
                shiftsByEmployee[shift.employeeId].push(shift);
              }

              for (const [employeeId, shifts] of Object.entries(shiftsByEmployee)) {
                // Sort by start
                shifts.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
                for (let i = 0; i < shifts.length - 1; i++) {
                  const s1 = shifts[i];
                  const s2 = shifts[i + 1];
                  const restResult = await checkRestPeriod({
                    employeeId,
                    previousShiftEnd: s1.end,
                    nextShiftStart: s2.start,
                    minHours: schedulingPolicy?.minHoursBetweenShifts ?? 10,
                  });
                  if (!restResult.compliant) {
                    issues.push({
                      employeeId,
                      issue: 'MIN_REST_VIOLATION',
                      severity: 'CRITICAL',
                      details: restResult,
                    });
                  }
                }

                // Validate penalty rate heuristics for each shift
                for (const s of shifts) {
                  const penalty = await calculatePenaltyRates({
                    shiftDate: s.start.split('T')[0],
                    startTime: s.start.split('T')[1].split('.')[0],
                    endTime: s.end.split('T')[1].split('.')[0],
                    employeeType: employeeContracts.find((c) => c.employeeId === employeeId)?.contractType ?? 'casual',
                    baseRate: s.baseRate ?? 25,
                    isPublicHoliday: false,
                  });
                  if (penalty.multiplier >= 2.25) {
                    issues.push({
                      employeeId,
                      issue: 'PUBLIC_HOLIDAY_PENALTY',
                      severity: 'MAJOR',
                      details: penalty,
                    });
                  }
                }
              }

              const result: ComplianceResult = {
                passed: issues.length === 0,
                issues,
                summary: issues.length ? `${issues.length} issues found` : 'No issues detected',
              };
              return ComplianceResultSchema.parse(result);
            },
          },
        },
      ] as ToolDef[],
    });
  }
}
