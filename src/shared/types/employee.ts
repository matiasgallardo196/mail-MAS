import { z } from 'zod';

export const EmployeeSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  skills: z.array(z.string()).optional(),
  contractType: z.enum(['full-time', 'part-time', 'casual']).optional(),
});

export type Employee = z.infer<typeof EmployeeSchema>;
