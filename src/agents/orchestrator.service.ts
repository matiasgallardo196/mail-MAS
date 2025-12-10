import { Injectable, Logger } from '@nestjs/common';
import { SchedulingPlanner } from './planner/scheduling.planner';
import { RosterWorker } from './workers/roster.worker';
import { ComplianceWorker } from './workers/compliance.worker';
import { OptimizationWorker } from './workers/optimization.worker';
import * as StoreTools from './tools/store.tools';
import * as EmployeeTools from './tools/employee.tools';
import type { IOrchestrator } from '../shared/types/orchestrator';
import type { Roster } from '../shared/types/roster';
import type { ComplianceResult } from '../shared/types/compliance';

/**
 * Minimal SchedulingOrchestrator stub for Phase 0
 * It will be extended in later phases to use @openai/agents Orchestrator
 */
@Injectable()
export class SchedulingOrchestrator {
  private readonly logger = new Logger(SchedulingOrchestrator.name);
  private orchestrator: IOrchestrator<any, Roster> | null = null;

  constructor() {
    this.logger.log('SchedulingOrchestrator initialized');
    try {
      // Try to require the Orchestrator class from the SDK; if not present, fallback
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const OrchestratorClass = require('@openai/agents')?.Orchestrator;
      const planner = new SchedulingPlanner();
      const workers = [new RosterWorker(), new ComplianceWorker(), new OptimizationWorker()];
      if (OrchestratorClass) {
        this.orchestrator = new OrchestratorClass({ planner, workers, config: { maxSteps: 20, timeout: 60_000 } });
      } else {
        // will fallback
      }
    } catch (err) {
      this.logger.warn('OpenAI agents Orchestrator not initialized, running in fallback mode');
      this.orchestrator = null;
    }
  }

  async generateRoster(
    storeId: string,
    weekStart: Date,
  ): Promise<Roster | { roster: Roster; compliance: ComplianceResult }> {
    if (!this.orchestrator) {
      // fallback: directly call the RosterWorker tool
      const rosterWorker = new RosterWorker();
      const rosterTool = rosterWorker.tools?.find((t) => t.function?.name === 'generate_initial_roster');
      if (!rosterTool) {
        throw new Error('generate_initial_roster tool not found');
      }
      const rosterRes = await rosterTool.function.execute({
        storeId,
        weekStart: weekStart.toISOString(),
        employeeIds: [],
      });

      // Run compliance validation if available
      const complianceWorker = new ComplianceWorker();
      const complianceTool = complianceWorker.tools?.find((t) => t.function?.name === 'validate_fair_work_compliance');
      if (complianceTool) {
        const complianceRes = await complianceTool.function.execute({ roster: rosterRes, employeeContracts: [] });
        // If critical -> return combined with status
        if (complianceRes.issues.some((i) => i.severity === 'CRITICAL')) {
          return { status: 'requires_human_review', roster: rosterRes, compliance: complianceRes } as any;
        }
        // Continue: perform optimization
        const optimizationWorker = new OptimizationWorker();
        const optimizationTool = optimizationWorker.tools?.find((t) => t.function?.name === 'optimize_roster');
        if (optimizationTool) {
          const optimized = await optimizationTool.function.execute({
            roster: rosterRes,
            forecast: (await StoreTools.getStore(storeId)).forecast,
          });
          return { status: 'ok', roster: optimized, compliance: complianceRes } as any;
        }
        return { status: 'ok', roster: rosterRes, compliance: complianceRes } as any;
      }
      return rosterRes;
    }

    const result = await this.orchestrator.run({
      task: `Generar roster para store ${storeId} starting ${weekStart.toISOString()}`,
      context: { storeId, weekStart: weekStart.toISOString() },
    });
    return result as Roster;
  }
}
