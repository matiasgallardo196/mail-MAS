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

// PenaltyRule schema - ÚNICA fuente de verdad para penalty rules
// Compatible con fairwork.tools.ts y compliance.worker.ts
export const PenaltyRuleSchema = z.object({
  id: z.string(),
  dayOfWeek: z.number().nullable(), // 0=Sunday, 6=Saturday
  startTime: z.string().nullable(), // HH:mm:ss
  endTime: z.string().nullable(),
  employmentType: z.string().nullable(), // Using string for broader compatibility
  multiplier: z.number(),
  isPublicHoliday: z.boolean(),
  description: z.string().nullable().optional(),
});

export type SchedulingPolicy = z.infer<typeof SchedulingPolicySchema>;
export type EmploymentTypeRule = z.infer<typeof EmploymentTypeRuleSchema>;
export type PenaltyRule = z.infer<typeof PenaltyRuleSchema>;

