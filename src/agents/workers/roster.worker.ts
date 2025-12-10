import type { WorkerOptions } from '../../shared/types/agent';
import type { ToolDef } from '../../shared/types/tool';

const WorkerBase = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@openai/agents').Worker;
  } catch (err) {
    return class {
      name?: string;
      instructions?: string;
      tools?: ToolDef[];
      constructor(opts: WorkerOptions = { name: 'fallback' } as WorkerOptions) {
        this.name = opts.name;
        this.instructions = opts.instructions;
        this.tools = opts.tools as ToolDef[];
      }
    };
  }
})();
import { z } from 'zod';
import {
  GenerateInitialRosterParams,
  GenerateInitialRosterParamsType,
  generateInitialRoster,
} from '../tools/roster.tools';
import { RosterSchema } from '../../shared/schemas/roster.schema';
import type { Roster } from '../../shared/types/roster';

export class RosterWorker extends WorkerBase {
  constructor() {
    super({
      name: 'RosterWorker',
      instructions: `
        Eres un experto en asignación de turnos. Tu tarea es:
        - Generar asignaciones iniciales basadas en disponibilidad
        - Aplicar algoritmos CSP para restricciones
        - Crear múltiples opciones de roster
        - Evaluar calidad de cada asignación
      `,
      tools: [
        {
          type: 'function',
          function: {
            name: 'generate_initial_roster',
            description: 'Genera una asignación inicial de turnos',
            parameters: GenerateInitialRosterParams,
            execute: async (args) => {
              const parsed = GenerateInitialRosterParams.parse(args);
              const result = await generateInitialRoster(parsed);
              return RosterSchema.parse(result);
            },
          },
        },
      ] as ToolDef<GenerateInitialRosterParamsType, Roster>[],
    });
  }
}
