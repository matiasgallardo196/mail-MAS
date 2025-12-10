import { z } from 'zod';

export const EmployeeContractSchema = z.object({
  employeeId: z.string(),
  contractType: z.enum(['full-time', 'part-time', 'casual']),
  maxHoursPerWeek: z.number().optional(),
});

export const EmployeeSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  skills: z.array(z.string()).optional(),
  contract: EmployeeContractSchema.optional(),
});

export type Employee = z.infer<typeof EmployeeSchema>;

export const getEmployees = async (storeId: string): Promise<Employee[]> => {
  // Mocked employees list
  return [
    {
      id: 'e1',
      name: 'Alice',
      skills: ['front', 'cash'],
      contract: { employeeId: 'e1', contractType: 'casual', maxHoursPerWeek: 40 },
    },
    {
      id: 'e2',
      name: 'Bob',
      skills: ['grill', 'front'],
      contract: { employeeId: 'e2', contractType: 'part-time', maxHoursPerWeek: 24 },
    },
  ];
};
