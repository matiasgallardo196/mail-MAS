import { z } from 'zod';

export const ComplianceIssueSchema = z.object({
  employeeId: z.string(),
  issue: z.string(),
  severity: z.enum(['CRITICAL', 'MAJOR', 'MINOR']),
  details: z.any().optional(),
});

export const ComplianceSuggestionSchema = z.object({
  type: z.enum(['MOVE_SHIFT', 'SHORTEN_SHIFT', 'EXTEND_SHIFT', 'REMOVE_SHIFT', 'ADD_REST_DAY', 'REASSIGN_SHIFT', 'ASSIGN_MORE_SHIFTS']),
  employeeId: z.string(),
  shiftIndex: z.number().optional(),
  reason: z.string(),
  suggestedChange: z
    .object({
      newStart: z.string().optional(),
      newEnd: z.string().optional(),
      newEmployeeId: z.string().optional(),
    })
    .optional(),
  relatedIssue: z.string().optional(), // Issue code that originated this suggestion
});

export const ComplianceResultSchema = z.object({
  passed: z.boolean(),
  issues: z.array(ComplianceIssueSchema),
  summary: z.string().optional(),
  suggestions: z.array(ComplianceSuggestionSchema).optional(),
});

export type ComplianceIssue = z.infer<typeof ComplianceIssueSchema>;
export type ComplianceSuggestion = z.infer<typeof ComplianceSuggestionSchema>;
export type ComplianceResult = z.infer<typeof ComplianceResultSchema>;
