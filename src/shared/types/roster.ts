import { z } from 'zod';
import { RosterSchema } from '../schemas/roster.schema';

export type Roster = z.infer<typeof RosterSchema>;
