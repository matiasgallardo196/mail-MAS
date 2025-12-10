import { ToolDef } from './tool';

export type PlannerOptions = {
  name: string;
  instructions?: string;
  tools?: ToolDef[];
  [key: string]: any;
};

export type WorkerOptions = {
  name: string;
  instructions?: string;
  tools?: ToolDef[];
  [key: string]: any;
};
