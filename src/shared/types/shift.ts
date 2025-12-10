import { z } from 'zod';
import { ShiftSchema } from '../schemas/shift.schema';

export type Shift = z.infer<typeof ShiftSchema>;
