import { OrchestrationPlanner, type PlannerContext, type OrchestrationState } from './orchestration.planner';

describe('OrchestrationPlanner', () => {
  let planner: OrchestrationPlanner;

  beforeEach(() => {
    planner = new OrchestrationPlanner();
  });

  describe('Configuration', () => {
    it('should have the correct name', () => {
      expect(planner.name).toBe('OrchestrationPlanner');
    });

    it('should have instructions mentioning key concepts', () => {
      expect(planner.instructions).toContain('RosterWorker');
      expect(planner.instructions).toContain('ComplianceWorker');
      expect(planner.instructions).toContain('ConflictWorker');
      expect(planner.instructions).toContain('OptimizationWorker');
    });

    it('should have three tools', () => {
      expect(planner.tools).toBeDefined();
      expect(planner.tools?.length).toBe(3);
    });
  });

  describe('Tools', () => {
    it('should have select_next_worker tool', () => {
      const tool = planner.tools?.find((t) => t.function?.name === 'select_next_worker');
      expect(tool).toBeDefined();
    });

    it('should have evaluate_roster_quality tool', () => {
      const tool = planner.tools?.find((t) => t.function?.name === 'evaluate_roster_quality');
      expect(tool).toBeDefined();
    });

    it('should have should_terminate tool', () => {
      const tool = planner.tools?.find((t) => t.function?.name === 'should_terminate');
      expect(tool).toBeDefined();
    });
  });

  describe('getNextStep', () => {
    const baseContext: PlannerContext = {
      currentState: 'INITIAL',
      roster: null,
      compliance: null,
      iterationCount: 0,
      maxIterations: 5,
      hasCriticalIssues: false,
      hasSuggestions: false,
      hasUnresolvedGaps: false,
      optimizationAttempted: false,
    };

    it('should return RosterWorker for INITIAL state', () => {
      const decision = planner.getNextStep({ ...baseContext, currentState: 'INITIAL' });
      expect(decision.nextWorker).toBe('RosterWorker');
    });

    it('should return ComplianceWorker after roster generated', () => {
      const decision = planner.getNextStep({
        ...baseContext,
        currentState: 'ROSTER_GENERATED',
        roster: { storeId: 'store-1', weekStart: '2024-12-09', roster: [], generatedAt: new Date().toISOString() },
      });
      expect(decision.nextWorker).toBe('ComplianceWorker');
    });

    it('should return ConflictWorker when there are critical issues with suggestions', () => {
      const decision = planner.getNextStep({
        ...baseContext,
        currentState: 'COMPLIANCE_HAS_ISSUES',
        hasCriticalIssues: true,
        hasSuggestions: true,
      });
      expect(decision.nextWorker).toBe('ConflictWorker');
    });

    it('should return HUMAN_REVIEW when critical issues without suggestions', () => {
      const decision = planner.getNextStep({
        ...baseContext,
        currentState: 'COMPLIANCE_HAS_ISSUES',
        hasCriticalIssues: true,
        hasSuggestions: false,
      });
      expect(decision.nextWorker).toBe('HUMAN_REVIEW');
    });

    it('should return OptimizationWorker after conflicts resolved', () => {
      const decision = planner.getNextStep({
        ...baseContext,
        currentState: 'CONFLICTS_RESOLVED',
        optimizationAttempted: false,
      });
      expect(decision.nextWorker).toBe('OptimizationWorker');
    });

    it('should return DONE for FINAL_VALIDATION_PASSED', () => {
      const decision = planner.getNextStep({
        ...baseContext,
        currentState: 'FINAL_VALIDATION_PASSED',
      });
      expect(decision.nextWorker).toBe('DONE');
    });

    it('should return HUMAN_REVIEW when max iterations reached', () => {
      const decision = planner.getNextStep({
        ...baseContext,
        currentState: 'COMPLIANCE_HAS_ISSUES',
        iterationCount: 5,
        maxIterations: 5,
      });
      expect(decision.nextWorker).toBe('HUMAN_REVIEW');
    });
  });

  describe('shouldContinue', () => {
    const baseContext: PlannerContext = {
      currentState: 'INITIAL',
      roster: null,
      compliance: null,
      iterationCount: 0,
      maxIterations: 5,
      hasCriticalIssues: false,
      hasSuggestions: false,
      hasUnresolvedGaps: false,
      optimizationAttempted: false,
    };

    it('should return true for in-progress states', () => {
      expect(planner.shouldContinue({ ...baseContext, currentState: 'INITIAL' })).toBe(true);
      expect(planner.shouldContinue({ ...baseContext, currentState: 'ROSTER_GENERATED' })).toBe(true);
    });

    it('should return false for terminal states', () => {
      expect(planner.shouldContinue({ ...baseContext, currentState: 'COMPLETED' })).toBe(false);
      expect(planner.shouldContinue({ ...baseContext, currentState: 'FINAL_VALIDATION_PASSED' })).toBe(false);
    });
  });

  describe('select_next_worker tool execution', () => {
    it('should execute and return valid decision', async () => {
      const tool = planner.tools?.find((t) => t.function?.name === 'select_next_worker');
      expect(tool).toBeDefined();

      const result = await tool!.function.execute({
        currentState: 'INITIAL',
        hasRoster: false,
        shiftsCount: 0,
        hasCriticalIssues: false,
        hasMajorIssues: false,
        hasSuggestions: false,
        hasUnresolvedGaps: false,
        optimizationAttempted: false,
        iterationCount: 0,
        maxIterations: 5,
      });

      expect(result.nextWorker).toBe('RosterWorker');
      expect(result.reason).toBeDefined();
    });
  });

  describe('evaluate_roster_quality tool execution', () => {
    it('should return low score for empty roster', async () => {
      const tool = planner.tools?.find((t) => t.function?.name === 'evaluate_roster_quality');

      const result = await tool!.function.execute({
        currentState: 'ROSTER_GENERATED',
        hasRoster: true,
        shiftsCount: 0,
        hasCriticalIssues: false,
        hasMajorIssues: false,
        hasSuggestions: false,
        hasUnresolvedGaps: false,
        optimizationAttempted: false,
        iterationCount: 0,
        maxIterations: 5,
      });

      expect(result.score).toBeLessThan(100);
      expect(result.issues).toContain('Roster vacío - sin turnos asignados');
    });

    it('should return high score for good roster', async () => {
      const tool = planner.tools?.find((t) => t.function?.name === 'evaluate_roster_quality');

      const result = await tool!.function.execute({
        currentState: 'OPTIMIZED',
        hasRoster: true,
        shiftsCount: 20,
        hasCriticalIssues: false,
        hasMajorIssues: false,
        hasSuggestions: false,
        hasUnresolvedGaps: false,
        optimizationAttempted: true,
        iterationCount: 3,
        maxIterations: 5,
      });

      expect(result.score).toBe(100);
      expect(result.canProceed).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('should_terminate tool execution', () => {
    it('should terminate on COMPLETED state', async () => {
      const tool = planner.tools?.find((t) => t.function?.name === 'should_terminate');

      const result = await tool!.function.execute({
        currentState: 'COMPLETED',
        iterationCount: 3,
        hasCriticalIssues: false,
        qualityScore: 90,
      });

      expect(result.terminate).toBe(true);
      expect(result.status).toBe('ok');
    });

    it('should terminate on max iterations', async () => {
      const tool = planner.tools?.find((t) => t.function?.name === 'should_terminate');

      const result = await tool!.function.execute({
        currentState: 'CONFLICTS_RESOLVED',
        iterationCount: 5,
        hasCriticalIssues: false,
        qualityScore: 70,
      });

      expect(result.terminate).toBe(true);
      expect(result.status).toBe('partial');
    });

    it('should not terminate when in progress', async () => {
      const tool = planner.tools?.find((t) => t.function?.name === 'should_terminate');

      const result = await tool!.function.execute({
        currentState: 'ROSTER_GENERATED',
        iterationCount: 1,
        hasCriticalIssues: false,
        qualityScore: 80,
      });

      expect(result.terminate).toBe(false);
      expect(result.status).toBe('in_progress');
    });
  });
});
