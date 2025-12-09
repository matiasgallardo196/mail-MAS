import { z } from 'zod';

export const ShiftSchema = z.object({
  employeeId: z.string(),
  start: z.string(),
  end: z.string(),
  station: z.string().optional(),
  isPeak: z.boolean().default(false),
});

export type Shift = z.infer<typeof ShiftSchema>;
