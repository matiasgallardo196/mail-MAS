declare module '@openai/agents' {
  export interface PlannerOptions {
    name: string;
    instructions?: string;
    tools?: any[];
    [key: string]: any;
  }

  export class Planner {
    name?: string;
    instructions?: string;
    tools?: any[];
    constructor(opts: PlannerOptions);
  }

  export interface WorkerOptions {
    name: string;
    instructions?: string;
    tools?: any[];
    [key: string]: any;
  }

  export class Worker {
    name?: string;
    instructions?: string;
    tools?: any[];
    constructor(opts: WorkerOptions);
  }

  export interface OrchestratorConfig {
    planner: Planner;
    workers: Worker[];
    config?: any;
  }

  export class Orchestrator {
    constructor(opts: OrchestratorConfig);
    run(opts: { task: string; context?: any }): Promise<any>;
  }
}

declare module '@openai/agents-nest' {
  export const OpenAIModule: any;
}
