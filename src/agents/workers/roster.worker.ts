import type { WorkerOptions } from '../../shared/types/agent';
import type { ToolDef } from '../../shared/types/tool';

// WorkerBase fallback - @openai/agents SDK doesn't export a Worker class
// We use a local implementation that mimics the expected interface
const WorkerBase = class {
  name?: string;
  instructions?: string;
  tools?: ToolDef[];
  constructor(opts: WorkerOptions = { name: 'fallback' } as WorkerOptions) {
    this.name = opts.name;
    this.instructions = opts.instructions;
    this.tools = opts.tools as ToolDef[];
  }
};

import { z } from 'zod';
import {
  GenerateInitialRosterParams,
  GenerateInitialRosterParamsType,
  GetRosterContextParams,
  GetRosterContextParamsType,
  ValidateCoverageParams,
  ValidateCoverageParamsType,
  generateInitialRoster,
  getRosterContext,
  validateCoverage,
} from '../tools/roster.tools';
import { RosterSchema } from '../../shared/schemas/roster.schema';
import { RosterContextSchema, CoverageMetricsSchema } from '../../shared/schemas/roster-context.schema';
import type { Roster } from '../../shared/types/roster';
import type { RosterContext, CoverageMetrics } from '../../shared/schemas/roster-context.schema';

/**
 * RosterWorker - Shift generation expert
 *
 * Responsibilities:
 * - Query employee availability via employee.tools
 * - Query staff requirements via store.tools
 * - Generate assignments respecting constraints
 * - Validate coverage and generate metrics
 *
 * Collaboration with other agents:
 * - Receives requests from Orchestrator/Planner
 * - Its output is validated by ComplianceWorker
 * - Can apply suggestions from ComplianceWorker or ConflictWorker
 */
export class RosterWorker extends WorkerBase {
  constructor() {
    super({
      name: 'RosterWorker',
      instructions: `
        You are an expert in shift assignment for McDonald's stores. Your task is:

        1. GET CONTEXT:
           - Query declared employee availability (shift codes: 1F, 2F, 3F)
           - Query staff requirements by station (KITCHEN, COUNTER, MCCAFE, etc.)
           - Query each employee's skills for station matching

        2. GENERATE ROSTER:
           - Only assign employees who are available on that date
           - Respect the declared shift code schedules (1F=06:30-15:30, 2F=14:00-23:00, etc.)
           - Match employees with their default stations when possible
           - Balance shift load among employees
           - Try to cover minimum staff requirements per station

        3. VALIDATE COVERAGE:
           - Verify that each station has the minimum required staff
           - Generate warnings if there are coverage gaps
           - Calculate roster quality metrics

        4. RESPOND WITH EVIDENCE:
           - Include coverage metrics in the output
           - List gap warnings if they exist
           - Provide data that ComplianceWorker can validate

        IMPORTANT CONSTRAINTS:
        - Do not assign unavailable employees
        - Respect declared shift codes (do not invent schedules)
        - Prioritize station coverage over perfect balance
      `,
      tools: [
        // Tool 1: Get complete context
        {
          type: 'function',
          function: {
            name: 'get_roster_context',
            description: 'Gets all the context needed to generate a roster: employee availability, staff requirements, skills and contracts. Queries the DB via employee.tools and store.tools.',
            parameters: GetRosterContextParams,
            execute: async (args: unknown) => {
              const parsed = GetRosterContextParams.parse(args);
              const result = await getRosterContext(parsed);
              return RosterContextSchema.parse(result);
            },
          },
        },
        // Tool 2: Generate initial roster
        {
          type: 'function',
          function: {
            name: 'generate_initial_roster',
            description:
              'Generates an initial shift assignment based on availability, skills and staff requirements. Queries the DB automatically and applies matching logic.',
            parameters: GenerateInitialRosterParams,
            execute: async (args: unknown) => {
              const parsed = GenerateInitialRosterParams.parse(args);
              const result = await generateInitialRoster(parsed);
              // Result includes roster + metrics
              return RosterSchema.extend({
                metrics: z.object({
                  totalShifts: z.number(),
                  employeesAssigned: z.number(),
                  daysProcessed: z.number().optional(),
                  avgShiftsPerEmployee: z.number().optional(),
                  warnings: z.array(z.string()),
                }).optional(),
              }).parse(result);
            },
          },
        },
        // Tool 3: Validate coverage
        {
          type: 'function',
          function: {
            name: 'validate_coverage',
            description:
              'Validates that a roster meets staff requirements per station. Returns coverage metrics and gap warnings.',
            parameters: ValidateCoverageParams,
            execute: async (args: unknown) => {
              const parsed = ValidateCoverageParams.parse(args);
              const result = await validateCoverage(parsed);
              return CoverageMetricsSchema.parse(result);
            },
          },
        },
      ] as ToolDef<
        GetRosterContextParamsType | GenerateInitialRosterParamsType | ValidateCoverageParamsType,
        RosterContext | Roster | CoverageMetrics
      >[],
    });
  }
}
