import { z } from 'zod';

const PlannerBase = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@openai/agents').Planner;
  } catch (err) {
    // Provide a minimal fallback Planner class for environments where SDK is not installed
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

export class SchedulingPlanner extends PlannerBase {
  constructor() {
    super({
      name: 'SchedulingPlanner',
      instructions: `
        Eres el planificador principal del sistema de scheduling de McDonald's.
        Tu misión es orquestar la creación de un roster óptimo para una tienda.

        Proceso:
        1. Analiza los requerimientos del store (tipo, horas pico, estaciones)
        2. Evalúa disponibilidad y skills de empleados
        3. Coordina con workers especializados
        4. Balancea constraints hard vs soft
        5. Asegura cumplimiento de Fair Work Act

        Prioridades:
        - Hard constraints son NO negociables
        - Minimizar costos operativos
        - Maximizar satisfacción de empleados
        - Cobertura 100% de horas pico
      `,
      tools: [],
    });
  }
}
