const WorkerBase = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@openai/agents').Worker;
  } catch (err) {
    return class {
      name?: string;
      instructions?: string;
      tools?: any[];
      constructor(opts: any = {}) {
        this.name = opts.name;
        this.instructions = opts.instructions;
        this.tools = opts.tools;
      }
    };
  }
})();
import { z } from 'zod';
import { GenerateInitialRosterParams, generateInitialRoster } from '../tools/roster.tools';
import { RosterSchema } from '../../shared/schemas/roster.schema';

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
      ],
    });
  }
}
