const PlannerBase = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@openai/agents').Planner;
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

export class OrchestrationPlanner extends PlannerBase {
  constructor() {
    super({
      name: 'OrchestrationPlanner',
      instructions: `Eres un planner encargado de coordinar la secuencia de ejecución de los workers.`,
      tools: [],
    });
  }
}
