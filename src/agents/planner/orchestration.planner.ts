import type { PlannerOptions } from '../../shared/types/agent';
import type { ToolDef } from '../../shared/types/tool';

const PlannerBase = (() => {
  try {
    return require('@openai/agents').Planner;
  } catch (err) {
    return class {
      name?: string;
      instructions?: string;
      tools?: ToolDef[];
      constructor(opts: PlannerOptions = { name: 'fallback' } as PlannerOptions) {
        this.name = opts.name;
        this.instructions = opts.instructions;
        this.tools = opts.tools as ToolDef[];
      }
    };
  }
})();

export class OrchestrationPlanner extends PlannerBase {
  constructor() {
    super({
      name: 'OrchestrationPlanner',
      instructions: `Eres un planner encargado de coordinar la secuencia de ejecución de los workers.`,
      tools: [],
    });
  }
}
