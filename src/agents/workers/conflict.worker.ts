import { z } from 'zod';
import type { ToolDef } from '../../shared/types/tool';
import type { WorkerOptions } from '../../shared/types/agent';
import { RosterSchema } from '../../shared/schemas/roster.schema';
import type { Roster } from '../../shared/types/roster';
import type { Shift } from '../../shared/types/shift';
import type { ComplianceSuggestion } from '../../shared/types/compliance';
import { employeeTools } from '../tools/employee.tools';
import { hoursBetween, addHoursToIso } from '../../shared/utils/time.utils';
import { SHIFT_CODE_TIMES, isAvailableShiftCode } from '../../shared/constants/shift-codes';
import type { EmployeeAvailability, EmployeeSkill } from '../../shared/types/employee';

// WorkerBase fallback - @openai/agents SDK doesn't export a Worker class
// We use a local implementation that mimics the expected interface
const WorkerBase = class {
  name?: string;
  instructions?: string;
  tools?: ToolDef[];
  constructor(opts: WorkerOptions = { name: 'fallback' }) {
    this.name = opts.name;
    this.instructions = opts.instructions;
    this.tools = opts.tools as ToolDef[];
  }
};


// --- Input/Output Schemas ---

export const CoverageGapSchema = z.object({
  date: z.string(),
  stationId: z.string(),
  stationCode: z.string().optional(),
  periodType: z.enum(['NORMAL', 'PEAK']),
  required: z.number(),
  assigned: z.number(),
  gap: z.number(),
});

export type CoverageGap = z.infer<typeof CoverageGapSchema>;

export const ResolveCoverageGapsInputSchema = z.object({
  roster: RosterSchema,
  gaps: z.array(CoverageGapSchema),
  storeId: z.string(),
  weekStart: z.string(),
  weekEnd: z.string(),
});

export const ApplySuggestionsInputSchema = z.object({
  roster: RosterSchema,
  suggestions: z.array(
    z.object({
      type: z.string(),
      employeeId: z.string().optional(),
      shiftIndex: z.number().optional(),
      reason: z.string().optional(),
      suggestedChange: z
        .object({
          newStart: z.string().optional(),
          newEnd: z.string().optional(),
          newEmployeeId: z.string().optional(),
        })
        .optional(),
      relatedIssue: z.string().optional(),
    })
  ),
});

export const ConflictResolutionResultSchema = z.object({
  roster: RosterSchema,
  resolved: z.number(),
  unresolved: z.number(),
  actions: z.array(
    z.object({
      type: z.string(),
      description: z.string(),
      success: z.boolean(),
      employeeId: z.string().optional(),
      shiftIndex: z.number().optional(),
    })
  ),
  warnings: z.array(z.string()),
  requiresHumanReview: z.boolean(),
});

export type ConflictResolutionResult = z.infer<typeof ConflictResolutionResultSchema>;

// --- Shift Code Definitions ---
// SHIFT_CODE_TIMES imported from shared/constants/shift-codes.ts

// --- Helper Functions ---
// hoursBetween and addHoursToIso imported from shared/utils/time.utils

function createShiftFromAvailability(
  availability: EmployeeAvailability,
  stationId: string,
  stationCode?: string,
): Shift | null {
  const shiftCode = availability.shiftCode;
  if (!shiftCode || !isAvailableShiftCode(shiftCode)) {
    return null;
  }

  const shiftTimes = SHIFT_CODE_TIMES[shiftCode];
  if (!shiftTimes) {
    if (availability.startTime && availability.endTime) {
      return {
        employeeId: availability.employeeId,
        start: `${availability.date}T${availability.startTime}`,
        end: `${availability.date}T${availability.endTime}`,
        station: stationCode || 'general',
        isPeak: false,
      };
    }
    return null;
  }

  return {
    employeeId: availability.employeeId,
    start: `${availability.date}T${shiftTimes.startTime}:00`,
    end: `${availability.date}T${shiftTimes.endTime}:00`,
    station: stationCode || 'general',
    isPeak: false,
  };
}

/**
 * Applies a ComplianceWorker suggestion to the roster
 * 
 * AUTONOMOUS BEHAVIOR:
 * - For REMOVE_SHIFT without shiftIndex: finds and removes the employee's last shift
 * - For ASSIGN_MORE_SHIFTS: delegates to resolve_coverage_gaps tool
 */
function applySuggestion(
  roster: Roster,
  suggestion: ComplianceSuggestion,
): { applied: boolean; description: string } {
  const shifts = roster.roster;
  let shiftIndex = suggestion.shiftIndex;

  // AUTONOMOUS: For REMOVE_SHIFT without shiftIndex, find the employee's last shift
  if (suggestion.type === 'REMOVE_SHIFT' && shiftIndex === undefined && suggestion.employeeId) {
    const employeeShiftIndices = shifts
      .map((s, idx) => ({ shift: s, idx }))
      .filter(entry => entry.shift.employeeId === suggestion.employeeId)
      .map(entry => entry.idx);
    
    if (employeeShiftIndices.length === 0) {
      return { applied: false, description: `No shifts found for ${suggestion.employeeId}` };
    }
    // Pick the last shift (most likely to be the excess that pushed over the limit)
    shiftIndex = employeeShiftIndices[employeeShiftIndices.length - 1];
  }

  // ASSIGN_MORE_SHIFTS is handled by resolve_coverage_gaps, not here
  if (suggestion.type === 'ASSIGN_MORE_SHIFTS') {
    return { 
      applied: false, 
      description: `ASSIGN_MORE_SHIFTS for ${suggestion.employeeId} must be resolved via resolve_coverage_gaps` 
    };
  }

  if (shiftIndex === undefined || shiftIndex < 0 || shiftIndex >= shifts.length) {
    return { applied: false, description: `Invalid shift index: ${shiftIndex}` };
  }

  const shift = shifts[shiftIndex];
  const change = suggestion.suggestedChange;

  switch (suggestion.type) {
    case 'EXTEND_SHIFT':
      if (change?.newEnd) {
        shift.end = change.newEnd;
        return {
          applied: true,
          description: `Extended shift for ${suggestion.employeeId} until ${change.newEnd}`,
        };
      }
      break;

    case 'SHORTEN_SHIFT':
      if (change?.newEnd) {
        shift.end = change.newEnd;
        return {
          applied: true,
          description: `Shortened shift for ${suggestion.employeeId} until ${change.newEnd}`,
        };
      }
      break;

    case 'MOVE_SHIFT':
      if (change?.newStart && change?.newEnd) {
        shift.start = change.newStart;
        shift.end = change.newEnd;
        return {
          applied: true,
          description: `Moved shift for ${suggestion.employeeId} to ${change.newStart}`,
        };
      }
      break;

    case 'REASSIGN_SHIFT':
      if (change?.newEmployeeId) {
        shift.employeeId = change.newEmployeeId;
        return {
          applied: true,
          description: `Reassigned shift to employee ${change.newEmployeeId}`,
        };
      }
      break;

    case 'REMOVE_SHIFT':
      (shift as any).__toRemove = true;
      return {
        applied: true,
        description: `Marked for removal shift of ${suggestion.employeeId}`,
      };

    case 'ADD_REST_DAY':
      return {
        applied: false,
        description: `Suggestion to add rest day for ${suggestion.employeeId} (requires manual review)`,
      };
  }

  return { applied: false, description: `Could not apply suggestion: ${suggestion.type}` };
}

// --- Main Worker Class ---

/**
 * ConflictWorker - Resolves coverage conflicts and applies corrections
 *
 * Responsibilities:
 * - Apply suggestions from ComplianceWorker/OptimizationWorker
 * - Resolve coverage gaps by finding alternative employees
 * - Reassign shifts when there are conflicts
 * - Mark unresolvable situations for human review
 *
 * Collaboration with other agents:
 * - Receives coverage gaps from RosterWorker
 * - Receives suggestions from ComplianceWorker
 * - Queries employee.tools to find available employees
 * - Reports to Orchestrator situations that require human intervention
 */
export class ConflictWorker extends WorkerBase {
  constructor() {
    super({
      name: 'ConflictWorker',
      instructions: `
        You are an expert in scheduling conflict resolution. Your task is:

        1. APPLY CORRECTIONS:
           - Process suggestions from ComplianceWorker (EXTEND_SHIFT, MOVE_SHIFT, etc.)
           - Apply changes respecting constraints
           - Record each action taken

        2. RESOLVE COVERAGE GAPS:
           - Analyze stations with insufficient staff
           - Find available employees that match the station
           - Create new shifts to cover gaps
           - Prioritize employees with fewer assigned hours (balance)

        3. HANDLE UNRESOLVABLE CONFLICTS:
           - If no employees available → mark for human review
           - If suggestion cannot be applied → report reason
           - Generate report of situations requiring intervention

        4. COLLABORATE WITH OTHER AGENTS:
           - Receive structured feedback
           - Return corrected roster with action trace
           - Provide resolution metrics

        PRIORITIES:
        1. First apply compliance suggestions (mandatory)
        2. Then resolve coverage gaps
        3. Finally balance workload
      `,
      tools: [
        // Tool 1: Apply suggestions from other workers
        {
          type: 'function',
          function: {
            name: 'apply_suggestions',
            description:
              'Applies suggestions from ComplianceWorker or OptimizationWorker to the roster. Returns modified roster with change trace.',
            parameters: ApplySuggestionsInputSchema,
            execute: async (args: unknown): Promise<ConflictResolutionResult> => {
              const input = ApplySuggestionsInputSchema.parse(args);
              const workingRoster: Roster = JSON.parse(JSON.stringify(input.roster));
              const actions: ConflictResolutionResult['actions'] = [];
              const warnings: string[] = [];
              let resolved = 0;
              let unresolved = 0;

              // Apply each suggestion
              for (const suggestion of input.suggestions) {
                const result = applySuggestion(workingRoster, suggestion as ComplianceSuggestion);
                actions.push({
                  type: suggestion.type,
                  description: result.description,
                  success: result.applied,
                  employeeId: suggestion.employeeId,
                  shiftIndex: suggestion.shiftIndex,
                });

                if (result.applied) {
                  resolved++;
                } else {
                  unresolved++;
                  warnings.push(`Could not apply: ${suggestion.reason || suggestion.type}`);
                }
              }

              // Remove shifts marked for deletion
              workingRoster.roster = workingRoster.roster.filter((s: any) => !s.__toRemove);

              // Update timestamp
              workingRoster.generatedAt = new Date().toISOString();

              return ConflictResolutionResultSchema.parse({
                roster: workingRoster,
                resolved,
                unresolved,
                actions,
                warnings,
                requiresHumanReview: unresolved > 0,
              });
            },
          },
        },
        // Tool 2: Resolve coverage gaps
        {
          type: 'function',
          function: {
            name: 'resolve_coverage_gaps',
            description:
              'Finds available employees to cover coverage gaps in stations. Creates new shifts based on availability.',
            parameters: ResolveCoverageGapsInputSchema,
            execute: async (args: unknown): Promise<ConflictResolutionResult> => {
              const input = ResolveCoverageGapsInputSchema.parse(args);
              const workingRoster: Roster = JSON.parse(JSON.stringify(input.roster));
              const actions: ConflictResolutionResult['actions'] = [];
              const warnings: string[] = [];
              let resolved = 0;
              let unresolved = 0;

              // === PREVENTIVE: Limit hours per employee per week by employment type ===
              const MAX_HOURS_BY_TYPE: Record<string, number> = {
                FULL_TIME: 38,
                PART_TIME: 32,
                CASUAL: 24,
              };

              // Helper to calculate shift hours from shift code
              const getShiftHours = (shiftCode: string | null | undefined): number => {
                switch (shiftCode) {
                  case '1F': return 9;  // 06:30-15:30
                  case '2F': return 9;  // 14:00-23:00
                  case '3F': return 12; // 08:00-20:00
                  case 'S': return 8.5; // 06:30-15:00 (manager)
                  case 'SC': return 9;  // 11:00-20:00 (shift change)
                  default: return 9;    // Default to 9h
                }
              };

              // Calculate hours worked per employee across the entire week
              const hoursPerEmployee: Map<string, number> = new Map();
              for (const shift of workingRoster.roster) {
                const hours = getShiftHours(shift.shiftCode);
                const current = hoursPerEmployee.get(shift.employeeId) || 0;
                hoursPerEmployee.set(shift.employeeId, current + hours);
              }

              // Get employment types for all employees in the roster
              const uniqueEmployeeIds = [...new Set(workingRoster.roster.map(s => s.employeeId))];
              const contracts = uniqueEmployeeIds.length > 0
                ? await employeeTools.getEmployeeContracts.execute({
                    storeId: input.storeId,
                    employeeIds: uniqueEmployeeIds,
                  })
                : [];
              
              // Map employeeId -> employmentType
              const employeeTypes: Map<string, string> = new Map();
              for (const contract of contracts) {
                employeeTypes.set(contract.employeeId, contract.employmentType);
              }

              // Set of employees already assigned by date (to avoid same-day duplicates)
              const assignedByDate: Map<string, Set<string>> = new Map();
              for (const shift of workingRoster.roster) {
                const date = shift.start.split('T')[0];
                if (!assignedByDate.has(date)) {
                  assignedByDate.set(date, new Set());
                }
                assignedByDate.get(date)!.add(shift.employeeId);
              }

              // Process each gap
              for (const gap of input.gaps) {
                if (gap.gap <= 0) continue;

                try {
                  // Find employees available for that date
                  const availability = await employeeTools.getEmployeeAvailability.execute({
                    storeId: input.storeId,
                    startDate: gap.date,
                    endDate: gap.date,
                    employeeIds: [], // All employees
                  });

                  // Find skills for matching
                  const employeeIds = [...new Set(availability.map((a) => a.employeeId))];
                  const skills =
                    employeeIds.length > 0
                      ? await employeeTools.getEmployeeSkills.execute({ employeeIds })
                      : [];

                  // Get contracts for available employees (to know their type)
                  const availContracts = employeeIds.length > 0
                    ? await employeeTools.getEmployeeContracts.execute({
                        storeId: input.storeId,
                        employeeIds,
                      })
                    : [];
                  
                  // Map available employees to their types
                  for (const contract of availContracts) {
                    if (!employeeTypes.has(contract.employeeId)) {
                      employeeTypes.set(contract.employeeId, contract.employmentType);
                    }
                  }

                  // Filter employees who:
                  // 1. Are available that day
                  // 2. Are not already assigned that day
                  // 3. Don't exceed the weekly HOURS limit per their contract type
                  // 4. Match the station (if possible)
                  const assigned = assignedByDate.get(gap.date) || new Set();

                  const candidates = availability.filter((avail) => {
                    // Check if already assigned today
                    if (assigned.has(avail.employeeId)) return false;
                    
                    // Check if exceeds weekly hours limit
                    const empType = employeeTypes.get(avail.employeeId) || 'CASUAL';
                    const maxHours = MAX_HOURS_BY_TYPE[empType] || 24;
                    const currentHours = hoursPerEmployee.get(avail.employeeId) || 0;
                    const shiftHours = getShiftHours(avail.shiftCode);
                    
                    if (currentHours + shiftHours > maxHours) return false;
                    
                    if (!avail.shiftCode || avail.shiftCode === '/' || avail.shiftCode === 'NA')
                      return false;

                    // Verify skill match (with CREW/MANAGER fallback)
                    const empSkills = skills.find((s) => s.employeeId === avail.employeeId);
                    if (empSkills) {
                      const hasMatch = empSkills.skills.some(
                        (skill) =>
                          skill.toUpperCase() === gap.stationCode?.toUpperCase() ||
                          skill.toUpperCase().includes(gap.stationCode?.toUpperCase() || '') ||
                          skill.toUpperCase() === 'CREW' ||
                          skill.toUpperCase() === 'MANAGER',
                      );
                      if (hasMatch) return true;
                    }

                    // If no skill match but has availability, consider
                    return avail.stationId === gap.stationId;
                  });

                  // Assign until gap is covered
                  let gapRemaining = gap.gap;
                  for (const candidate of candidates) {
                    if (gapRemaining <= 0) break;

                    const newShift = createShiftFromAvailability(
                      candidate,
                      gap.stationId,
                      gap.stationCode,
                    );

                    if (newShift) {
                      workingRoster.roster.push(newShift);
                      assigned.add(candidate.employeeId);
                      
                      // Update weekly hours tracking
                      const currentHrs = hoursPerEmployee.get(candidate.employeeId) || 0;
                      hoursPerEmployee.set(candidate.employeeId, currentHrs + getShiftHours(candidate.shiftCode));
                      
                      gapRemaining--;
                      resolved++;

                      actions.push({
                        type: 'ADD_SHIFT',
                        description: `Added shift for ${candidate.employeeId} at ${gap.stationCode || gap.stationId} on ${gap.date}`,
                        success: true,
                        employeeId: candidate.employeeId,
                      });
                    }
                  }

                  if (gapRemaining > 0) {
                    unresolved += gapRemaining;
                    warnings.push(
                      `Gap partially resolved for ${gap.stationCode || gap.stationId} on ${gap.date}: missing ${gapRemaining} employees (weekly limit may be affecting)`,
                    );
                  }
                } catch (error) {
                  unresolved += gap.gap;
                  warnings.push(
                    `Error resolving gap for ${gap.stationCode || gap.stationId} on ${gap.date}: ${error instanceof Error ? error.message : String(error)}`,
                  );
                }
              }

              // Update timestamp
              workingRoster.generatedAt = new Date().toISOString();

              return ConflictResolutionResultSchema.parse({
                roster: workingRoster,
                resolved,
                unresolved,
                actions,
                warnings,
                requiresHumanReview: unresolved > 0,
              });
            },
          },
        },
        // Tool 3: Mark for human review
        {
          type: 'function',
          function: {
            name: 'request_human_review',
            description:
              'Marks situations that cannot be resolved automatically for human review.',
            parameters: z.object({
              roster: RosterSchema,
              issues: z.array(
                z.object({
                  type: z.string(),
                  description: z.string(),
                  severity: z.enum(['CRITICAL', 'MAJOR', 'MINOR']),
                  affectedShiftIndices: z.array(z.number()).optional(),
                  affectedEmployeeIds: z.array(z.string()).optional(),
                })
              ),
            }),
            execute: async (args: unknown): Promise<ConflictResolutionResult> => {
              const input = z
                .object({
                  roster: RosterSchema,
                  issues: z.array(
                    z.object({
                      type: z.string(),
                      description: z.string(),
                      severity: z.enum(['CRITICAL', 'MAJOR', 'MINOR']),
                      affectedShiftIndices: z.array(z.number()).optional(),
                      affectedEmployeeIds: z.array(z.string()).optional(),
                    })
                  ),
                })
                .parse(args);

              const warnings = input.issues.map(
                (issue) =>
                  `[${issue.severity}] ${issue.type}: ${issue.description}` +
                  (issue.affectedEmployeeIds
                    ? ` (employees: ${issue.affectedEmployeeIds.join(', ')})`
                    : ''),
              );

              return ConflictResolutionResultSchema.parse({
                roster: input.roster,
                resolved: 0,
                unresolved: input.issues.length,
                actions: input.issues.map((issue) => ({
                  type: 'HUMAN_REVIEW_REQUESTED',
                  description: issue.description,
                  success: false,
                  employeeId: issue.affectedEmployeeIds?.[0],
                })),
                warnings,
                requiresHumanReview: true,
              });
            },
          },
        },
      ] as ToolDef[],
    });
  }
}
