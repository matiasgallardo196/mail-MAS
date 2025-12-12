import { z } from 'zod';
import { RosterSchema } from './roster.schema';
import { ComplianceSuggestionSchema, ComplianceIssueSchema } from './compliance.schema';

// --- Constraints that OptimizationWorker must respect ---
export const OptimizationConstraintsSchema = z.object({
  minHoursBetweenShifts: z.number().default(10),
  minShiftHours: z.number().default(3),
  maxShiftHours: z.number().default(12),
  maxHoursPerWeek: z.record(z.string(), z.number()).optional(), // { employeeId: maxHours }
});

// --- OptimizationWorker Input ---
// Note: penaltyRules uses z.any() to avoid type conflicts between different PenaltyRule schemas
// The actual validation happens at runtime via fairwork.tools
// Note: Using passthrough() to preserve complianceValidator function that Orchestrator injects
export const OptimizationInputSchema = z
  .object({
    roster: RosterSchema,
    forecast: z
      .array(
        z.object({
          hour: z.string(),
          demand: z.number(),
        }),
      )
      .optional(),
    // ComplianceWorker feedback
    complianceFeedback: z
      .object({
        issues: z.array(ComplianceIssueSchema).optional(),
        suggestions: z.array(ComplianceSuggestionSchema).optional(),
      })
      .optional(),
    // Constraints to respect
    constraints: OptimizationConstraintsSchema.optional(),
    // Penalty rules for cost calculation (type checked at runtime)
    penaltyRules: z.array(z.any()).optional(),
    // If retry, be more conservative
    isRetry: z.boolean().optional(),
    // Australian state to detect local holidays (default: VIC)
    australianState: z.string().optional(),
  })
  .passthrough(); // Preserves complianceValidator function

// --- Applied optimization record ---
export const AppliedOptimizationSchema = z.object({
  type: z.enum([
    'APPLIED_SUGGESTION', // Applied a ComplianceWorker suggestion
    'MOVED_SHIFT', // Moved a shift to cheaper time
    'SWAPPED_SHIFTS', // Swapped shifts between employees
    'BALANCED_HOURS', // Balanced hours between employees
  ]),
  description: z.string(),
  shiftIndex: z.number().optional(),
  employeeId: z.string().optional(),
  fromSuggestion: z.string().optional(), // ID of the issue that generated the suggestion
  costImpact: z.number().optional(), // Positive = savings, negative = increase
});

// --- Optimization metrics ---
export const OptimizationMetricsSchema = z.object({
  relativeCostBefore: z.number(),
  relativeCostAfter: z.number(),
  savingsPercent: z.number(),
  totalShifts: z.number(),
  shiftsModified: z.number(),
  suggestionsApplied: z.number(),
  additionalOptimizations: z.number(),
});

// --- OptimizationWorker Output ---
export const OptimizationResultSchema = z.object({
  roster: RosterSchema,
  appliedChanges: z.array(AppliedOptimizationSchema),
  metrics: OptimizationMetricsSchema,
  // Optimization score (0-100)
  score: z.number().min(0).max(100),
});

// Derived types
export type OptimizationConstraints = z.infer<typeof OptimizationConstraintsSchema>;
export type OptimizationInput = z.infer<typeof OptimizationInputSchema>;
export type AppliedOptimization = z.infer<typeof AppliedOptimizationSchema>;
export type OptimizationMetrics = z.infer<typeof OptimizationMetricsSchema>;
export type OptimizationResult = z.infer<typeof OptimizationResultSchema>;

