import { z } from 'zod';

export const ComplianceIssueSchema = z.object({
  employeeId: z.string(),
  issue: z.string(),
  severity: z.enum(['CRITICAL', 'MAJOR', 'MINOR']),
  details: z.any().optional(),
});

export const ComplianceResultSchema = z.object({
  passed: z.boolean(),
  issues: z.array(ComplianceIssueSchema),
  summary: z.string().optional(),
});

export type ComplianceIssue = z.infer<typeof ComplianceIssueSchema>;
export type ComplianceResult = z.infer<typeof ComplianceResultSchema>;
