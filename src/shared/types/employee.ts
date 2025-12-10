import { EmployeeAvailabilitySchema, EmployeeContractSchema, EmployeeSkillSchema } from '../schemas/employee.schema';
import { z } from 'zod';

export const EmployeeSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  skills: z.array(z.string()).optional(),
  contractType: z.enum(['full-time', 'part-time', 'casual']).optional(),
});

export type Employee = z.infer<typeof EmployeeSchema>;
export type EmployeeContract = z.infer<typeof EmployeeContractSchema>;
export type EmployeeAvailability = z.infer<typeof EmployeeAvailabilitySchema>;
export type EmployeeSkill = z.infer<typeof EmployeeSkillSchema>;
