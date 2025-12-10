import { z } from 'zod';
import { differenceInHours, parseISO } from 'date-fns';
import { PenaltyRule as PenaltyRuleEntity } from '../../modules/scheduling/entities/penalty-rule.entity';

// --- Check Rest Period ---
export const CheckRestPeriodParams = z.object({
  employeeId: z.string(),
  previousShiftEnd: z.string(),
  nextShiftStart: z.string(),
  minHours: z.number().default(10),
});
export type CheckRestPeriodParamsType = z.infer<typeof CheckRestPeriodParams>;

export const CheckRestPeriodResult = z.object({
  employeeId: z.string(),
  restHours: z.number(),
  compliant: z.boolean(),
  minHours: z.number(),
});
export type CheckRestPeriodResultType = z.infer<typeof CheckRestPeriodResult>;

export async function checkRestPeriod(params: CheckRestPeriodParamsType): Promise<CheckRestPeriodResultType> {
  const p = CheckRestPeriodParams.parse(params);
  const prev = parseISO(p.previousShiftEnd);
  const next = parseISO(p.nextShiftStart);
  const restHours = differenceInHours(next, prev);
  const compliant = restHours >= p.minHours;
  return {
    employeeId: p.employeeId,
    restHours,
    compliant,
    minHours: p.minHours,
  };
}

// --- Penalty Rule Schema (from DB) ---
export const PenaltyRuleSchema = z.object({
  id: z.string(),
  dayOfWeek: z.number().nullable(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  employmentType: z.string().nullable(),
  multiplier: z.number(),
  isPublicHoliday: z.boolean(),
  description: z.string().nullable().optional(),
});
export type PenaltyRule = z.infer<typeof PenaltyRuleSchema>;

// --- Load Penalty Rules from DB ---
export async function loadPenaltyRulesFromDb(storeId?: string): Promise<PenaltyRule[]> {
  try {
    const rules = await PenaltyRuleEntity.find({
      where: storeId ? [{ store: { id: storeId } }, { store: undefined }] : {},
      order: { isPublicHoliday: 'DESC', multiplier: 'DESC' },
    });
    return rules.map((r: any) => ({
      id: r.id,
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      employmentType: r.employmentType,
      multiplier: Number(r.multiplier),
      isPublicHoliday: r.isPublicHoliday,
      description: r.description,
    }));
  } catch (err) {
    // DB not available or entity not loaded; return empty (caller should handle CRITICAL)
    return [];
  }
}

// --- Calculate Penalty Rates (sin baseRate ni totalPay) ---
export const CalculatePenaltyRatesParams = z.object({
  shiftDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  employmentType: z.string(),
  penaltyRules: z.array(PenaltyRuleSchema).min(1),
  isPublicHoliday: z.boolean().optional(),
});
export type CalculatePenaltyRatesParamsType = z.infer<typeof CalculatePenaltyRatesParams>;

export const CalculatePenaltyRatesResult = z.object({
  shiftDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  employmentType: z.string(),
  multiplier: z.number(),
  appliedRuleId: z.string().optional(),
  reason: z.string().optional(),
});
export type CalculatePenaltyRatesResultType = z.infer<typeof CalculatePenaltyRatesResult>;

export async function calculatePenaltyRates(
  params: CalculatePenaltyRatesParamsType,
): Promise<CalculatePenaltyRatesResultType> {
  const p = CalculatePenaltyRatesParams.parse(params);
  // Parse date and get day of week (0=Sun, 6=Sat)
  const dateParts = p.shiftDate.split('-').map(Number);
  const date = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
  const dayOfWeek = date.getUTCDay();
  const isHoliday = p.isPublicHoliday ?? false;

  let appliedRule: PenaltyRule | undefined;
  let multiplier = 1;
  let reason: string | undefined;

  // Pass 1: Check for public holiday
  if (isHoliday) {
    for (const rule of p.penaltyRules) {
      if (rule.isPublicHoliday) {
        appliedRule = rule;
        multiplier = rule.multiplier;
        reason = rule.description ?? 'Public holiday penalty';
        break;
      }
    }
  }

  // Pass 2: Check for day of week (weekend) if no holiday match
  if (!appliedRule && !isHoliday) {
    for (const rule of p.penaltyRules) {
      if (rule.dayOfWeek !== null && rule.dayOfWeek === dayOfWeek && !rule.isPublicHoliday) {
        if (rule.employmentType && rule.employmentType !== p.employmentType) {
          continue;
        }
        appliedRule = rule;
        multiplier = rule.multiplier;
        reason = rule.description ?? `Day ${dayOfWeek} penalty`;
        break;
      }
    }
  }

  // Pass 3: Check for time range (evening/late night) if no previous match
  if (!appliedRule) {
    for (const rule of p.penaltyRules) {
      if (rule.startTime && rule.endTime && !rule.isPublicHoliday && rule.dayOfWeek === null) {
        // Check if shift start time falls within rule time range
        if (p.startTime >= rule.startTime && p.startTime <= rule.endTime) {
          if (rule.employmentType && rule.employmentType !== p.employmentType) {
            continue;
          }
          appliedRule = rule;
          multiplier = rule.multiplier;
          reason = rule.description ?? `Time range penalty ${rule.startTime}-${rule.endTime}`;
          break;
        }
      }
    }
  }

  return {
    shiftDate: p.shiftDate,
    startTime: p.startTime,
    endTime: p.endTime,
    employmentType: p.employmentType,
    multiplier,
    appliedRuleId: appliedRule?.id,
    reason,
  };
}
