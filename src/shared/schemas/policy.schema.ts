import { z } from 'zod';

export const PolicyScopeEnum = z.enum(['GLOBAL', 'STORE']);

export const SchedulingPolicySchema = z.object({
  id: z.string(),
  scope: PolicyScopeEnum,
  storeId: z.string().nullable(),
  minHoursBetweenShifts: z.number().nullable().optional(),
  maxShiftsPerDay: z.number().nullable().optional(),
  maxConsecutiveWorkingDays: z.number().nullable().optional(),
  monthlyStandardHours: z.number().nullable().optional(),
});

export const EmploymentTypeRuleSchema = z.object({
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CASUAL']),
  minHoursWeek: z.number().nullable().optional(),
  maxHoursWeek: z.number().nullable().optional(),
});

export const PenaltyRuleSchema = z.object({
  id: z.string(),
  dayOfWeek: z.number().min(0).max(6).nullable().optional(),
  startTime: z.string().nullable().optional(), // HH:mm:ss
  endTime: z.string().nullable().optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CASUAL']).nullable().optional(),
  multiplier: z.number(),
  isPublicHoliday: z.boolean().optional(),
  description: z.string().optional(),
});

export type SchedulingPolicy = z.infer<typeof SchedulingPolicySchema>;
export type EmploymentTypeRule = z.infer<typeof EmploymentTypeRuleSchema>;
export type PenaltyRule = z.infer<typeof PenaltyRuleSchema>;

