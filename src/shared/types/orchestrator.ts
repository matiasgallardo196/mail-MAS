export interface IOrchestrator<Ctx = any, Res = any> {
  run(opts: { task: string; context?: Ctx }): Promise<Res>;
}
