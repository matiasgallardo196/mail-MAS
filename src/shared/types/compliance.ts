import { z } from 'zod';
import {
  ComplianceResultSchema,
  ComplianceIssueSchema,
  ComplianceSuggestionSchema,
} from '../schemas/compliance.schema';

export type ComplianceIssue = z.infer<typeof ComplianceIssueSchema>;
export type ComplianceSuggestion = z.infer<typeof ComplianceSuggestionSchema>;
export type ComplianceResult = z.infer<typeof ComplianceResultSchema>;
