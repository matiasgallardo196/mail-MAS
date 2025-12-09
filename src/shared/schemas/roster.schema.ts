import { z } from 'zod';
import { ShiftSchema } from './shift.schema';

export const RosterSchema = z.object({
  storeId: z.string(),
  weekStart: z.string(),
  roster: z.array(ShiftSchema),
  generatedAt: z.string().optional(),
});

export type Roster = z.infer<typeof RosterSchema>;
