import { z } from 'zod';
import {
  OptimizationConstraintsSchema,
  OptimizationInputSchema,
  AppliedOptimizationSchema,
  OptimizationMetricsSchema,
  OptimizationResultSchema,
} from '../schemas/optimization.schema';

export type OptimizationConstraints = z.infer<typeof OptimizationConstraintsSchema>;
export type OptimizationInput = z.infer<typeof OptimizationInputSchema>;
export type AppliedOptimization = z.infer<typeof AppliedOptimizationSchema>;
export type OptimizationMetrics = z.infer<typeof OptimizationMetricsSchema>;
export type OptimizationResult = z.infer<typeof OptimizationResultSchema>;

