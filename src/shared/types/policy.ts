import { z } from 'zod';
import { EmploymentTypeRuleSchema, PenaltyRuleSchema, SchedulingPolicySchema } from '../schemas/policy.schema';

export type SchedulingPolicy = z.infer<typeof SchedulingPolicySchema>;
export type EmploymentTypeRule = z.infer<typeof EmploymentTypeRuleSchema>;
export type PenaltyRule = z.infer<typeof PenaltyRuleSchema>;


