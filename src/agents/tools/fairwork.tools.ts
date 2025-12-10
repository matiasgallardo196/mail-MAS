import { z } from 'zod';
import { differenceInHours, parseISO } from 'date-fns';

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

export const CalculatePenaltyRatesParams = z.object({
  shiftDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  employeeType: z.enum(['full-time', 'part-time', 'casual']),
  baseRate: z.number(),
  isPublicHoliday: z.boolean().optional(),
});
export type CalculatePenaltyRatesParamsType = z.infer<typeof CalculatePenaltyRatesParams>;

export const CalculatePenaltyRatesResult = z.object({
  shiftDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  employeeType: z.enum(['full-time', 'part-time', 'casual']),
  baseRate: z.number(),
  multiplier: z.number(),
  totalPay: z.number(),
  reason: z.string().optional(),
});
export type CalculatePenaltyRatesResultType = z.infer<typeof CalculatePenaltyRatesResult>;

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

export async function calculatePenaltyRates(
  params: CalculatePenaltyRatesParamsType,
): Promise<CalculatePenaltyRatesResultType> {
  const p = CalculatePenaltyRatesParams.parse(params);
  const date = parseISO(p.shiftDate);
  const day = date.getUTCDay(); // 0 Sun ... 6 Sat
  let multiplier = 1;
  let reason = '';

  const isHoliday = p.isPublicHoliday ?? false;
  if (isHoliday) {
    // Heuristic: public holidays high penalty
    multiplier = 2.25; // base lower bound for holiday penalty
    reason = 'Public holiday penalty applied';
  } else if (day === 6 || day === 0) {
    // weekend
    if (day === 6) {
      multiplier = 1.25; // Saturday lower bound
      reason = 'Saturday penalty applied';
    } else {
      multiplier = 1.5; // Sunday penalty heuristic
      reason = 'Sunday penalty applied';
    }
    // scale for casuals
    if (p.employeeType === 'casual') {
      multiplier += 0.25; // extra for casual
    }
  }

  const totalHours = Math.max(
    1,
    Math.ceil(
      (new Date(`${p.shiftDate}T${p.endTime}`).getTime() - new Date(`${p.shiftDate}T${p.startTime}`).getTime()) /
        3600_000,
    ),
  );
  const totalPay = Math.round(p.baseRate * multiplier * totalHours * 100) / 100;
  return {
    shiftDate: p.shiftDate,
    startTime: p.startTime,
    endTime: p.endTime,
    employeeType: p.employeeType,
    baseRate: p.baseRate,
    multiplier,
    totalPay,
    reason: reason || undefined,
  };
}
