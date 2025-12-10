import { z } from 'zod';

export type ToolFunction<Args = unknown, Res = unknown> = {
  name: string;
  description?: string;
  parameters?: z.ZodType<Args> | null;
  execute: (args: Args) => Promise<Res> | Res;
};

export type ToolDef<Args = unknown, Res = unknown> = {
  type: 'function';
  function: ToolFunction<Args, Res>;
};
