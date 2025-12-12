import { z } from 'zod';
import {
  EmployeeAvailabilitySchema,
  EmployeeSkillSchema,
  EmployeeContractSchema,
} from './employee.schema';

/**
 * Schema para requerimientos de staff por estación
 */
export const StaffRequirementSchema = z.object({
  stationId: z.string(),
  stationName: z.string().optional(),
  stationCode: z.string().optional(),
  periodType: z.enum(['NORMAL', 'PEAK']),
  requiredStaff: z.number(),
});

/**
 * Contexto completo necesario para generar un roster
 * Incluye toda la información de la DB que el RosterWorker necesita
 */
export const RosterContextSchema = z.object({
  storeId: z.string(),
  weekStart: z.string(), // ISO date YYYY-MM-DD
  weekEnd: z.string(), // ISO date YYYY-MM-DD
  availability: z.array(EmployeeAvailabilitySchema),
  staffRequirements: z.array(StaffRequirementSchema),
  employeeSkills: z.array(EmployeeSkillSchema),
  contracts: z.array(EmployeeContractSchema),
});

/**
 * Métricas de coverage para un roster generado
 */
export const CoverageMetricsSchema = z.object({
  totalShifts: z.number(),
  coveredStations: z.record(z.string(), z.number()), // stationId -> count
  uncoveredSlots: z.array(
    z.object({
      date: z.string(),
      stationId: z.string(),
      periodType: z.enum(['NORMAL', 'PEAK']),
      required: z.number(),
      assigned: z.number(),
      gap: z.number(),
    })
  ),
  coverageScore: z.number().min(0).max(100), // 0-100%
  warnings: z.array(z.string()),
});

export type StaffRequirement = z.infer<typeof StaffRequirementSchema>;
export type RosterContext = z.infer<typeof RosterContextSchema>;
export type CoverageMetrics = z.infer<typeof CoverageMetricsSchema>;
