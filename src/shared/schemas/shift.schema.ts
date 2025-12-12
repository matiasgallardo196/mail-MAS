import { z } from 'zod';

export const ShiftSchema = z.object({
  employeeId: z.string(),
  start: z.string(),
  end: z.string(),
  station: z.string().optional(),
  stationId: z.string().optional(), // Station UUID
  shiftCode: z.string().optional(), // Shift code: 1F, 2F, 3F, etc.
  isPeak: z.boolean().default(false),
  baseRate: z.number().optional(),
});

export type Shift = z.infer<typeof ShiftSchema>;
