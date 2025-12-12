import { z } from 'zod';
import { RosterSchema } from './roster.schema';
import { ComplianceSuggestionSchema, ComplianceIssueSchema } from './compliance.schema';

// --- Constraints que el OptimizationWorker debe respetar ---
export const OptimizationConstraintsSchema = z.object({
  minHoursBetweenShifts: z.number().default(10),
  minShiftHours: z.number().default(3),
  maxShiftHours: z.number().default(12),
  maxHoursPerWeek: z.record(z.string(), z.number()).optional(), // { employeeId: maxHours }
});

// --- Input del OptimizationWorker ---
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
    // Feedback de ComplianceWorker
    complianceFeedback: z
      .object({
        issues: z.array(ComplianceIssueSchema).optional(),
        suggestions: z.array(ComplianceSuggestionSchema).optional(),
      })
      .optional(),
    // Constraints a respetar
    constraints: OptimizationConstraintsSchema.optional(),
    // Penalty rules para calcular costos (type checked at runtime)
    penaltyRules: z.array(z.any()).optional(),
    // Si es un retry, ser más conservador
    isRetry: z.boolean().optional(),
    // Estado australiano para detectar feriados locales (default: VIC)
    australianState: z.string().optional(),
  })
  .passthrough(); // Preserves complianceValidator function

// --- Registro de una optimización aplicada ---
export const AppliedOptimizationSchema = z.object({
  type: z.enum([
    'APPLIED_SUGGESTION', // Aplicó una sugerencia de ComplianceWorker
    'MOVED_SHIFT', // Movió un turno a horario más barato
    'SWAPPED_SHIFTS', // Intercambió turnos entre empleados
    'BALANCED_HOURS', // Balanceó horas entre empleados
    'ADDED_SHIFT', // Agregó turno para cubrir gap
  ]),
  description: z.string(),
  shiftIndex: z.number().optional(),
  employeeId: z.string().optional(),
  fromSuggestion: z.string().optional(), // ID del issue que generó la sugerencia
  costImpact: z.number().optional(), // Positivo = ahorro, negativo = aumento
});

// --- Métricas de la optimización ---
export const OptimizationMetricsSchema = z.object({
  relativeCostBefore: z.number(),
  relativeCostAfter: z.number(),
  savingsPercent: z.number(),
  totalShifts: z.number(),
  shiftsModified: z.number(),
  suggestionsApplied: z.number(),
  additionalOptimizations: z.number(),
});

// --- Output del OptimizationWorker ---
export const OptimizationResultSchema = z.object({
  roster: RosterSchema,
  appliedChanges: z.array(AppliedOptimizationSchema),
  metrics: OptimizationMetricsSchema,
  // Score de optimización (0-100)
  score: z.number().min(0).max(100),
});

// Types derivados
export type OptimizationConstraints = z.infer<typeof OptimizationConstraintsSchema>;
export type OptimizationInput = z.infer<typeof OptimizationInputSchema>;
export type AppliedOptimization = z.infer<typeof AppliedOptimizationSchema>;
export type OptimizationMetrics = z.infer<typeof OptimizationMetricsSchema>;
export type OptimizationResult = z.infer<typeof OptimizationResultSchema>;

