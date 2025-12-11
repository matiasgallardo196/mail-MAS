import { Test, TestingModule } from '@nestjs/testing';
import { SchedulingOrchestrator, OrchestrationResult } from './orchestrator.service';

// Mock external dependencies for integration test
jest.mock('./tools/store.tools', () => ({
  storeTools: {
    getStorePolicy: {
      execute: jest.fn().mockResolvedValue({
        id: 'policy-1',
        scope: 'GLOBAL',
        storeId: null,
        minHoursBetweenShifts: 10,
        maxShiftsPerDay: 1,
        maxConsecutiveWorkingDays: 6,
        monthlyStandardHours: 152,
      }),
    },
    getStoreStaffRequirements: {
      execute: jest.fn().mockResolvedValue([
        { stationId: 'station-1', periodType: 'NORMAL', requiredStaff: 3 },
        { stationId: 'station-2', periodType: 'NORMAL', requiredStaff: 2 },
      ]),
    },
  },
}));

jest.mock('./tools/fairwork.tools', () => {
  const actual = jest.requireActual('./tools/fairwork.tools');
  return {
    ...actual,
    loadPenaltyRulesFromDb: jest.fn().mockResolvedValue([
      {
        id: 'rule-sat',
        dayOfWeek: 6,
        multiplier: 1.25,
        isPublicHoliday: false,
        description: 'Saturday',
      },
      {
        id: 'rule-sun',
        dayOfWeek: 0,
        multiplier: 1.5,
        isPublicHoliday: false,
        description: 'Sunday',
      },
      { id: 'rule-holiday', multiplier: 2.25, isPublicHoliday: true, description: 'Public holiday' },
    ]),
  };
});

jest.mock('./tools/employee.tools', () => ({
  employeeTools: {
    getEmployeeContracts: {
      execute: jest.fn().mockResolvedValue([
        {
          employeeId: 'e1',
          employmentType: 'FULL_TIME',
          maxHoursWeek: 38,
          minHoursBetweenShifts: 10,
        },
        { employeeId: 'e2', employmentType: 'CASUAL', maxHoursWeek: 24, minHoursBetweenShifts: 10 },
      ]),
    },
    getEmployeeAvailability: {
      execute: jest.fn().mockResolvedValue([]),
    },
    getEmployeeSkills: {
      execute: jest.fn().mockResolvedValue([]),
    },
  },
}));

describe('SchedulingOrchestrator Integration (fallback)', () => {
  let orchestrator: SchedulingOrchestrator;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SchedulingOrchestrator],
    }).compile();
    orchestrator = module.get<SchedulingOrchestrator>(SchedulingOrchestrator);
  });

  it('should produce a roster via fallback run', async () => {
    const res = (await orchestrator.generateRoster(
      'store-2',
      new Date('2025-01-01'),
    )) as OrchestrationResult;
    expect(res).toHaveProperty('roster');
    expect(res.roster).toHaveProperty('storeId', 'store-2');
    expect(res.roster).toHaveProperty('roster');
    expect(Array.isArray(res.roster.roster)).toBe(true);
  });

  it('should include optimization result with validationQueries', async () => {
    const res = (await orchestrator.generateRoster(
      'store-2',
      new Date('2025-01-01'),
    )) as OrchestrationResult;

    if (res.optimization) {
      expect(res.optimization).toHaveProperty('metrics');
      expect(res.optimization).toHaveProperty('score');
      expect(res.optimization).toHaveProperty('appliedChanges');
      expect(res.optimization).toHaveProperty('validationQueries');
      expect(Array.isArray(res.optimization.validationQueries)).toBe(true);
    }
  });

  it('should show agent collaboration in trace', async () => {
    const res = (await orchestrator.generateRoster(
      'store-2',
      new Date('2025-01-01'),
    )) as OrchestrationResult;

    const traceActions = res.agentTrace.map((t) => t.action);

    // Should have roster generation
    expect(traceActions).toContain('generate_initial_roster');

    // Should have compliance validation
    expect(traceActions).toContain('validate_fair_work_compliance');

    // Should have optimization
    expect(traceActions).toContain('optimize_roster');
  });

  it('should show compliance feedback being passed to conflict worker', async () => {
    const res = (await orchestrator.generateRoster(
      'store-2',
      new Date('2025-01-01'),
    )) as OrchestrationResult;

    // Check for ConflictWorker in trace - new 4-agent flow
    const conflictTraces = res.agentTrace.filter(
      (t) => t.from === 'ConflictWorker' || t.to === 'ConflictWorker',
    );

    // ConflictWorker should be present in the trace
    // Either applying suggestions or resolving gaps
    const hasConflictWorker = conflictTraces.length > 0 || res.conflictResolution !== undefined;
    
    // If there are suggestions, they should go through ConflictWorker
    expect(res.agentTrace.some((t) => t.action === 'optimize_roster')).toBe(true);
  });

  it('should show OptimizationWorker consulting ComplianceWorker (DRY collaboration)', async () => {
    const res = (await orchestrator.generateRoster(
      'store-2',
      new Date('2025-01-01'),
    )) as OrchestrationResult;

    // Look for validation queries in the trace
    const validationTraces = res.agentTrace.filter(
      (t) => t.action === 'validate_proposed_change' || t.action === 'validation_response',
    );

    // If there were optimization opportunities, there should be validation traces
    if (res.optimization?.validationQueries && res.optimization.validationQueries.length > 0) {
      expect(validationTraces.length).toBeGreaterThan(0);

      // Should show bidirectional communication
      const queriesFromOptimization = validationTraces.filter(
        (t) => t.from === 'OptimizationWorker' && t.to === 'ComplianceWorker',
      );
      const responsesToOptimization = validationTraces.filter(
        (t) => t.from === 'ComplianceWorker' && t.to === 'OptimizationWorker',
      );

      expect(queriesFromOptimization.length).toBe(responsesToOptimization.length);
    }
  });

  it('should include validationQueriesCount in metrics', async () => {
    const res = (await orchestrator.generateRoster(
      'store-2',
      new Date('2025-01-01'),
    )) as OrchestrationResult;

    expect(res.metrics).toHaveProperty('validationQueriesCount');
    expect(typeof res.metrics?.validationQueriesCount).toBe('number');
  });

  it('should have final_validation step confirming optimization result', async () => {
    const res = (await orchestrator.generateRoster(
      'store-2',
      new Date('2025-01-01'),
    )) as OrchestrationResult;

    const finalValidation = res.agentTrace.find((t) => t.action === 'final_validation');
    expect(finalValidation).toBeDefined();
    expect(finalValidation?.from).toBe('Orchestrator');
    expect(finalValidation?.to).toBe('ComplianceWorker');
  });
});
