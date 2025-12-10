declare module '@openai/agents' {
  import { ToolDef } from '../types/tool';
  import { IOrchestrator } from '../types/orchestrator';

  export interface PlannerOptions {
    name: string;
    instructions?: string;
    tools?: ToolDef[];
    [key: string]: any;
  }

  export class Planner {
    name?: string;
    instructions?: string;
    tools?: ToolDef[];
    constructor(opts: PlannerOptions);
  }

  export interface WorkerOptions {
    name: string;
    instructions?: string;
    tools?: ToolDef[];
    [key: string]: any;
  }

  export class Worker {
    name?: string;
    instructions?: string;
    tools?: ToolDef[];
    constructor(opts: WorkerOptions);
  }

  export interface OrchestratorConfig {
    planner: Planner;
    workers?: Worker[];
    config?: any;
  }

  export class Orchestrator implements IOrchestrator<any, any> {
    constructor(opts: OrchestratorConfig);
    run(opts: { task: string; context?: any }): Promise<any>;
  }
}

declare module '@openai/agents-nest' {
  export const OpenAIModule: any;
}
