import { Injectable, Logger } from '@nestjs/common';
import { SchedulingPlanner } from './planner/scheduling.planner';
import { RosterWorker } from './workers/roster.worker';

/**
 * Minimal SchedulingOrchestrator stub for Phase 0
 * It will be extended in later phases to use @openai/agents Orchestrator
 */
@Injectable()
export class SchedulingOrchestrator {
  private readonly logger = new Logger(SchedulingOrchestrator.name);
  private orchestrator: any | null = null;

  constructor() {
    this.logger.log('SchedulingOrchestrator initialized');
    try {
      // Try to require the Orchestrator class from the SDK; if not present, fallback
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const OrchestratorClass = require('@openai/agents')?.Orchestrator;
      const planner = new SchedulingPlanner();
      const workers = [new RosterWorker()];
      if (OrchestratorClass) {
        this.orchestrator = new OrchestratorClass({ planner, workers, config: { maxSteps: 20, timeout: 60_000 } });
      } else {
        throw new Error('Orchestrator SDK not found');
      }
    } catch (err) {
      this.logger.warn('OpenAI agents Orchestrator not initialized, running in fallback mode');
      this.orchestrator = null;
    }
  }

  async generateRoster(storeId: string, weekStart: Date): Promise<any> {
    if (!this.orchestrator) {
      // fallback: directly call the RosterWorker tool
      const worker = new RosterWorker();
      const tool = worker.tools?.find((t: any) => t.function?.name === 'generate_initial_roster');
      const res = await tool.function.execute({ storeId, weekStart: weekStart.toISOString(), employeeIds: [] });
      return res;
    }

    const result = await this.orchestrator.run({
      task: `Generar roster para store ${storeId} starting ${weekStart.toISOString()}`,
      context: { storeId, weekStart: weekStart.toISOString() },
    });
    return result;
  }
}
