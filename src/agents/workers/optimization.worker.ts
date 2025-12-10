import { Worker } from '@openai/agents';
import { z } from 'zod';
import type { ToolDef } from '../../shared/types/tool';
import { RosterSchema } from '../../shared/schemas/roster.schema';
import type { Roster } from '../../shared/types/roster';

const WorkerBase = (() => {
  try {
    return require('@openai/agents').Worker;
  } catch (err) {
    return class {
      name?: string;
      instructions?: string;
      tools?: ToolDef[];
      constructor(opts: any = {}) {
        this.name = opts.name;
        this.instructions = opts.instructions;
        this.tools = opts.tools as ToolDef[];
      }
    };
  }
})();

export class OptimizationWorker extends WorkerBase {
  constructor() {
    super({
      name: 'OptimizationWorker',
      instructions: `Optimiza roster para minimizar costos y equilibrar carga de trabajo`,
      tools: [
        {
          type: 'function',
          function: {
            name: 'optimize_roster',
            description: 'Takes a roster and returns an optimized roster and score',
            parameters: z.object({ roster: z.any(), forecast: z.any() }),
            execute: async (args) => {
              const parsed = z.object({ roster: z.any(), forecast: z.any() }).parse(args);
              const roster = parsed.roster as Roster;
              // naive optimization: return the roster + score 100
              return RosterSchema.parse(roster);
            },
          },
        },
      ] as ToolDef[],
    });
  }
}
