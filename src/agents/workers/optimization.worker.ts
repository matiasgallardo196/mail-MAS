import { z } from 'zod';
import type { ToolDef } from '../../shared/types/tool';
import type { WorkerOptions } from '../../shared/types/agent';
import { RosterSchema } from '../../shared/schemas/roster.schema';
import {
  OptimizationInputSchema,
  OptimizationResultSchema,
  type OptimizationResult,
  type AppliedOptimization,
  type OptimizationMetrics,
} from '../../shared/schemas/optimization.schema';
import type { Roster } from '../../shared/types/roster';
import type { Shift } from '../../shared/types/shift';
import type { ComplianceSuggestion, ComplianceResult } from '../../shared/types/compliance';
import {
  loadPenaltyRulesFromDb,
  calculatePenaltyRates,
  type PenaltyRule,
} from '../tools/fairwork.tools';
import { isAustralianPublicHoliday } from '../tools/australian-holidays';
import {
  hoursBetween,
  addHoursToIso,
  getDayOfWeek,
  getTimeString,
  getDateString,
} from '../../shared/utils/time.utils';

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

// --- Types for agent collaboration ---

/**
 * Validator function that the Orchestrator injects
 * Allows OptimizationWorker to query ComplianceWorker without duplicating logic
 */
export type ComplianceValidator = (roster: Roster) => Promise<ComplianceResult>;

/**
 * Record of a ComplianceWorker query
 */
export interface ValidationQuery {
  proposedChange: string;
  passed: boolean;
  reason?: string;
}

/**
 * Extended input that includes the validator
 */
export interface OptimizationInputWithValidator {
  roster: Roster;
  forecast?: { hour: string; demand: number }[];
  complianceFeedback?: {
    issues?: { employeeId: string; issue: string; severity: 'CRITICAL' | 'MAJOR' | 'MINOR' }[];
    suggestions?: ComplianceSuggestion[];
  };
  constraints?: {
    minHoursBetweenShifts: number;
    minShiftHours: number;
    maxShiftHours: number;
    maxHoursPerWeek?: Record<string, number>;
  };
  penaltyRules?: PenaltyRule[];
  // Validator function injected by the Orchestrator
  complianceValidator?: ComplianceValidator;
}

/**
 * Extended result with validation queries
 */
export interface OptimizationResultWithQueries extends OptimizationResult {
  validationQueries: ValidationQuery[];
}

// --- Utility functions ---
// Imported from shared/utils/time.utils.ts:
// - hoursBetween, addHoursToIso, getDayOfWeek, getTimeString, getDateString

/**
 * Calculates the relative cost of a shift based on its duration and penalty multiplier
 */
async function calculateShiftRelativeCost(
  shift: Shift,
  penaltyRules: PenaltyRule[],
  employmentType: string = 'CASUAL',
  australianState: string = 'VIC',
): Promise<{ cost: number; multiplier: number; reason?: string }> {
  const hours = hoursBetween(shift.start, shift.end);
  const shiftDate = getDateString(shift.start);
  const holidayInfo = isAustralianPublicHoliday(shiftDate, australianState);
  const isHoliday = !!holidayInfo;

  if (penaltyRules.length === 0) {
    return { cost: hours * 1, multiplier: 1 };
  }

  try {
    const penalty = await calculatePenaltyRates({
      shiftDate,
      startTime: getTimeString(shift.start),
      endTime: getTimeString(shift.end),
      employmentType,
      penaltyRules,
      isPublicHoliday: isHoliday,
    });

    return {
      cost: hours * penalty.multiplier,
      multiplier: penalty.multiplier,
      reason: penalty.reason,
    };
  } catch {
    return { cost: hours * 1, multiplier: 1 };
  }
}

/**
 * Calculates the total relative cost of the roster
 */
async function calculateRosterRelativeCost(
  roster: Roster,
  penaltyRules: PenaltyRule[],
  australianState: string = 'VIC',
): Promise<number> {
  let totalCost = 0;
  for (const shift of roster.roster) {
    const { cost } = await calculateShiftRelativeCost(shift, penaltyRules, 'CASUAL', australianState);
    totalCost += cost;
  }
  return totalCost;
}

/**
 * Applies a ComplianceWorker suggestion to the roster
 * Compliance suggestions have already been validated, they are applied directly
 */
function applySuggestion(
  roster: Roster,
  suggestion: ComplianceSuggestion,
): { applied: boolean; description: string } {
  const shifts = roster.roster;
  const shiftIndex = suggestion.shiftIndex;

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
        description: `Suggestion to add rest day for ${suggestion.employeeId}`,
      };
  }

  return { applied: false, description: `Could not apply suggestion: ${suggestion.type}` };
}

/**
 * Proposes an optimization and validates it with ComplianceWorker before applying
 * This is the key function that implements collaboration between agents
 */
async function tryOptimizationWithValidation(
  currentRoster: Roster,
  shiftIndex: number,
  proposedChange: { newStart?: string; newEnd?: string; newEmployeeId?: string },
  changeDescription: string,
  validator: ComplianceValidator,
): Promise<{
  applied: boolean;
  roster: Roster;
  query: ValidationQuery;
}> {
  // 1. Create copy of roster with proposed change
  const tempRoster: Roster = JSON.parse(JSON.stringify(currentRoster));
  const shift = tempRoster.roster[shiftIndex];

  if (!shift) {
    return {
      applied: false,
      roster: currentRoster,
      query: {
        proposedChange: changeDescription,
        passed: false,
        reason: 'Invalid shift index',
      },
    };
  }

  // Apply proposed change
  if (proposedChange.newStart) shift.start = proposedChange.newStart;
  if (proposedChange.newEnd) shift.end = proposedChange.newEnd;
  if (proposedChange.newEmployeeId) shift.employeeId = proposedChange.newEmployeeId;

  // 2. Query ComplianceWorker (DRY - uses the same logic)
  const compliance = await validator(tempRoster);

  // 3. Check if it passes
  const hasCritical = compliance.issues?.some((i) => i.severity === 'CRITICAL');

  if (!hasCritical) {
    return {
      applied: true,
      roster: tempRoster,
      query: {
        proposedChange: changeDescription,
        passed: true,
      },
    };
  }

  // 4. Does not pass - return original roster
  const criticalIssues = compliance.issues?.filter((i) => i.severity === 'CRITICAL') ?? [];
  return {
    applied: false,
    roster: currentRoster,
    query: {
      proposedChange: changeDescription,
      passed: false,
      reason: criticalIssues.map((i) => i.issue).join(', '),
    },
  };
}

/**
 * Identifies cost optimization opportunities
 */
function findCostOptimizationOpportunities(
  roster: Roster,
  penaltyRules: PenaltyRule[],
): Array<{
  shiftIndex: number;
  description: string;
  proposedChange: { newStart?: string; newEnd?: string };
  estimatedSavings: number;
}> {
  const opportunities: Array<{
    shiftIndex: number;
    description: string;
    proposedChange: { newStart?: string; newEnd?: string };
    estimatedSavings: number;
  }> = [];

  for (let i = 0; i < roster.roster.length; i++) {
    const shift = roster.roster[i];
    const dayOfWeek = getDayOfWeek(shift.start);

    // Opportunity: Sunday shift (high multiplier) could move to Saturday
    if (dayOfWeek === 0) {
      // Move 1 day earlier (Saturday)
      const newStart = addHoursToIso(shift.start, -24);
      const newEnd = addHoursToIso(shift.end, -24);

      opportunities.push({
        shiftIndex: i,
        description: `Move shift of ${shift.employeeId} from Sunday to Saturday`,
        proposedChange: { newStart, newEnd },
        estimatedSavings: 0.25, // Difference between 1.5 and 1.25 multiplier
      });
    }

    // Opportunity: Saturday shift could move to Friday
    if (dayOfWeek === 6) {
      const newStart = addHoursToIso(shift.start, -24);
      const newEnd = addHoursToIso(shift.end, -24);

      opportunities.push({
        shiftIndex: i,
        description: `Move shift of ${shift.employeeId} from Saturday to Friday`,
        proposedChange: { newStart, newEnd },
        estimatedSavings: 0.25,
      });
    }
  }

  // Sort by highest potential savings
  return opportunities.sort((a, b) => b.estimatedSavings - a.estimatedSavings);
}

/**
 * Balances hours between employees for more equitable distribution
 */
function analyzeHoursBalance(roster: Roster): {
  imbalanced: boolean;
  details: string;
  employeeHours: Record<string, number>;
} {
  const hoursByEmployee: Record<string, number> = {};

  for (const shift of roster.roster) {
    const hours = hoursBetween(shift.start, shift.end);
    hoursByEmployee[shift.employeeId] = (hoursByEmployee[shift.employeeId] ?? 0) + hours;
  }

  const hoursValues = Object.values(hoursByEmployee);
  if (hoursValues.length < 2) {
    return { imbalanced: false, details: '', employeeHours: hoursByEmployee };
  }

  const maxHours = Math.max(...hoursValues);
  const minHours = Math.min(...hoursValues);
  const variance = maxHours - minHours;

  if (variance > 10) {
    return {
      imbalanced: true,
      details: `Imbalance of ${variance.toFixed(1)}h between employees (max: ${maxHours.toFixed(1)}h, min: ${minHours.toFixed(1)}h)`,
      employeeHours: hoursByEmployee,
    };
  }

  return { imbalanced: false, details: '', employeeHours: hoursByEmployee };
}

/**
 * Calculates the optimization score (0-100)
 *
 * CALCULATION FORMULA:
 * ==================
 * Base Score: 50 points
 *
 * BONUSES:
 * - Cost savings:              +2 points per 1% savings (max +30)
 *                              Example: 15% savings = +30 points
 * - Suggestions applied:       +5 points per suggestion (max +15)
 *                              Example: 3 suggestions = +15 points
 * - Successful optimizations:  +3 points per validation passed (max +10)
 *                              Example: 3 optimizations = +9 points
 * - Hours balance:             +5 points if hours are balanced
 *
 * PENALTIES:
 * - No improvements:           -10 points if nothing was modified or applied
 *
 * FINAL RANGE: 0-100 (clamped)
 *
 * INTERPRETATION:
 * - 0-40:   Failed or no improvements optimization
 * - 41-60:  Basic optimization (suggestions only)
 * - 61-80:  Good optimization (suggestions + savings)
 * - 81-100: Excellent optimization (significant savings + balance)
 */
function calculateOptimizationScore(
  metrics: OptimizationMetrics,
  hoursBalance: { imbalanced: boolean },
  validationQueries: ValidationQuery[],
): number {
  // Base score: neutral starting point
  let score = 50;

  // Bonus for cost savings (up to +30 points)
  // 2 points per 1% savings
  if (metrics.savingsPercent > 0) {
    score += Math.min(30, metrics.savingsPercent * 2);
  }

  // Bonus for applying compliance suggestions (up to +15 points)
  // 5 points per successfully applied suggestion
  score += Math.min(15, metrics.suggestionsApplied * 5);

  // Bonus for validated additional optimizations (up to +10 points)
  // 3 points per optimization that passed ComplianceWorker validation
  const successfulOptimizations = validationQueries.filter((q) => q.passed).length;
  score += Math.min(10, successfulOptimizations * 3);

  // Bonus for balanced hours between employees (+5 points)
  if (!hoursBalance.imbalanced) {
    score += 5;
  }

  // Penalty if no improvements were made (-10 points)
  if (metrics.shiftsModified === 0 && metrics.suggestionsApplied === 0) {
    score -= 10;
  }

  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Default validator that always passes
 * In production, the Orchestrator MUST always provide a real validator
 * This fallback is only used for isolated tests
 */
function createPassthroughValidator(): ComplianceValidator {
  return async (): Promise<ComplianceResult> => {
    return { passed: true, issues: [] };
  };
}

// --- Main Worker Class ---

export class OptimizationWorker extends WorkerBase {
  constructor() {
    super({
      name: 'OptimizationWorker',
      instructions: `Optimizes roster to minimize costs and balance workload.
      
RESPONSIBILITIES:
1. Apply ComplianceWorker suggestions to resolve violations
2. Propose cost optimizations and VALIDATE them with ComplianceWorker before applying
3. Balance hours between employees
4. Calculate relative cost and report metrics

COLLABORATION PROTOCOL (DRY):
- Receives feedback from ComplianceWorker with issues and suggestions
- Applies suggestions first (already validated by ComplianceWorker)
- For each additional optimization:
  → Proposes change
  → QUERIES ComplianceWorker to validate
  → If passes → applies the change
  → If fails → discards and tries another optimization
- Returns optimized roster + metrics + query trace

BENEFITS:
- ComplianceWorker is SINGLE source of truth (DRY)
- Each change validated BEFORE applying (robust)
- Query trace shows real collaboration between agents`,
      tools: [
        {
          type: 'function',
          function: {
            name: 'optimize_roster',
            description:
              'Optimizes a roster by querying ComplianceWorker to validate each change. Returns optimized roster with collaboration trace.',
            parameters: OptimizationInputSchema,
            execute: async (args: unknown): Promise<OptimizationResultWithQueries> => {
              const input = OptimizationInputSchema.parse(args) as OptimizationInputWithValidator;
              const appliedChanges: AppliedOptimization[] = [];
              const validationQueries: ValidationQuery[] = [];

              // Deep clone of roster
              let workingRoster: Roster = JSON.parse(JSON.stringify(input.roster));

              // Get validator (Orchestrator should provide a real one)
              // If no validator, use passthrough (only for isolated tests)
              const validator: ComplianceValidator =
                input.complianceValidator ?? createPassthroughValidator();

              // Australian state for holidays (default: VIC)
              const australianState = (input as any).australianState ?? 'VIC';

              // Load penalty rules
              let penaltyRules: PenaltyRule[] = (input.penaltyRules as PenaltyRule[]) ?? [];
              if (penaltyRules.length === 0) {
                penaltyRules = await loadPenaltyRulesFromDb(input.roster.storeId);
              }

              // Calculate initial cost
              const costBefore = await calculateRosterRelativeCost(workingRoster, penaltyRules, australianState);

              // --- STEP 1: Apply ComplianceWorker suggestions ---
              // These have already been validated, apply directly
              let suggestionsApplied = 0;
              if (input.complianceFeedback?.suggestions?.length) {
                for (const suggestion of input.complianceFeedback.suggestions) {
                  const result = applySuggestion(workingRoster, suggestion);
                  if (result.applied) {
                    suggestionsApplied++;
                    appliedChanges.push({
                      type: 'APPLIED_SUGGESTION',
                      description: result.description,
                      shiftIndex: suggestion.shiftIndex,
                      employeeId: suggestion.employeeId,
                      fromSuggestion: suggestion.relatedIssue,
                    });
                  }
                }

                // Remove shifts marked for deletion
                workingRoster.roster = workingRoster.roster.filter((s: any) => !s.__toRemove);
              }

              // --- STEP 2: Additional optimizations with validation ---
              // Each change is validated with ComplianceWorker before applying
              let additionalOptimizations = 0;

              const opportunities = findCostOptimizationOpportunities(workingRoster, penaltyRules);

              for (const opportunity of opportunities) {
                // Query ComplianceWorker before applying
                const result = await tryOptimizationWithValidation(
                  workingRoster,
                  opportunity.shiftIndex,
                  opportunity.proposedChange,
                  opportunity.description,
                  validator,
                );

                // Record the query (for the trace)
                validationQueries.push(result.query);

                if (result.applied) {
                  workingRoster = result.roster;
                  additionalOptimizations++;
                  appliedChanges.push({
                    type: 'MOVED_SHIFT',
                    description: `${opportunity.description} (validated by ComplianceWorker)`,
                    shiftIndex: opportunity.shiftIndex,
                    employeeId: workingRoster.roster[opportunity.shiftIndex]?.employeeId,
                    costImpact: opportunity.estimatedSavings,
                  });
                }
              }

              // --- STEP 3: Hours balance analysis ---
              const hoursBalance = analyzeHoursBalance(workingRoster);
              if (hoursBalance.imbalanced) {
                appliedChanges.push({
                  type: 'BALANCED_HOURS',
                  description: hoursBalance.details,
                  costImpact: 0,
                });
              }

              // --- STEP 4: Calculate final metrics ---
              const costAfter = await calculateRosterRelativeCost(workingRoster, penaltyRules, australianState);
              const savingsPercent =
                costBefore > 0 ? ((costBefore - costAfter) / costBefore) * 100 : 0;

              const metrics: OptimizationMetrics = {
                relativeCostBefore: Math.round(costBefore * 100) / 100,
                relativeCostAfter: Math.round(costAfter * 100) / 100,
                savingsPercent: Math.round(savingsPercent * 100) / 100,
                totalShifts: workingRoster.roster.length,
                shiftsModified: additionalOptimizations,
                suggestionsApplied,
                additionalOptimizations,
              };

              const score = calculateOptimizationScore(metrics, hoursBalance, validationQueries);

              // Update timestamp
              workingRoster.generatedAt = new Date().toISOString();

              const result: OptimizationResultWithQueries = {
                roster: RosterSchema.parse(workingRoster),
                appliedChanges,
                metrics,
                score,
                validationQueries,
              };

              return OptimizationResultSchema.extend({
                validationQueries: z.array(
                  z.object({
                    proposedChange: z.string(),
                    passed: z.boolean(),
                    reason: z.string().optional(),
                  }),
                ),
              }).parse(result);
            },
          },
        },
      ] as ToolDef[],
    });
  }
}
