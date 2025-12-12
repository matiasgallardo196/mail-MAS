import { z } from 'zod';

export const EmploymentTypeEnum = z.enum(['FULL_TIME', 'PART_TIME', 'CASUAL']);

export const EmployeeContractSchema = z.object({
  employeeId: z.string(),
  employmentType: EmploymentTypeEnum,
  // Use coerce to handle DB returning numbers as strings
  maxHoursWeek: z.coerce.number().nullable().optional(),
  minHoursBetweenShifts: z.coerce.number().nullable().optional(),
  baseRate: z.coerce.number().nullable().optional(),
  defaultStationCode: z.string().nullable().optional(), // For specialist validation
});

export const EmployeeAvailabilitySchema = z.object({
  employeeId: z.string(),
  storeId: z.string().optional(),
  date: z.string(), // ISO date (yyyy-mm-dd)
  startTime: z.string().nullable().optional(), // HH:mm:ss from shiftCode if available
  endTime: z.string().nullable().optional(),
  shiftCode: z.string().nullable().optional(),
  stationId: z.string().nullable().optional(),
});

export const EmployeeSkillSchema = z.object({
  employeeId: z.string(),
  skills: z.array(z.string()),
});

export type EmployeeContract = z.infer<typeof EmployeeContractSchema>;
export type EmployeeAvailability = z.infer<typeof EmployeeAvailabilitySchema>;
export type EmployeeSkill = z.infer<typeof EmployeeSkillSchema>;

