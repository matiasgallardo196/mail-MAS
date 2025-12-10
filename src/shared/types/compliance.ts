import { z } from 'zod';
import { ComplianceResultSchema, ComplianceIssueSchema } from '../schemas/compliance.schema';

export type ComplianceIssue = z.infer<typeof ComplianceIssueSchema>;
export type ComplianceResult = z.infer<typeof ComplianceResultSchema>;
