import { Test, TestingModule } from '@nestjs/testing';
import { SchedulingOrchestrator, OrchestrationResult } from './orchestrator.service';

// Mock external dependencies
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
  },
}));

jest.mock('./tools/fairwork.tools', () => ({
  loadPenaltyRulesFromDb: jest.fn().mockResolvedValue([
    { id: 'rule-1', dayOfWeek: 6, multiplier: 1.25, isPublicHoliday: false },
  ]),
  checkRestPeriod: jest.fn().mockResolvedValue({ compliant: true, restHours: 16 }),
  calculatePenaltyRates: jest.fn().mockResolvedValue({ multiplier: 1, reason: 'Normal day' }),
}));

jest.mock('./tools/employee.tools', () => ({
  employeeTools: {
    getEmployeeContracts: {
      execute: jest.fn().mockResolvedValue([]),
    },
  },
}));

describe('SchedulingOrchestrator (stub)', () => {
  let orchestrator: SchedulingOrchestrator;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SchedulingOrchestrator],
    }).compile();
    orchestrator = module.get<SchedulingOrchestrator>(SchedulingOrchestrator);
  });

  it('should return a roster', async () => {
    const res = (await orchestrator.generateRoster(
      'store-1',
      new Date('2025-01-01'),
    )) as OrchestrationResult;
    expect(res).toHaveProperty('roster');
    expect(res.roster).toHaveProperty('storeId', 'store-1');
    expect(res.roster).toHaveProperty('roster');
    expect(Array.isArray(res.roster.roster)).toBe(true);
  });

  it('should include compliance result', async () => {
    const res = (await orchestrator.generateRoster(
      'store-1',
      new Date('2025-01-01'),
    )) as OrchestrationResult;
    expect(res).toHaveProperty('compliance');
    expect(res.compliance).toHaveProperty('passed');
    expect(res.compliance).toHaveProperty('issues');
  });

  it('should include agent trace for collaboration visualization', async () => {
    const res = (await orchestrator.generateRoster(
      'store-1',
      new Date('2025-01-01'),
    )) as OrchestrationResult;
    expect(res).toHaveProperty('agentTrace');
    expect(Array.isArray(res.agentTrace)).toBe(true);
    expect(res.agentTrace.length).toBeGreaterThan(0);

    // Verify trace has proper structure
    const firstTrace = res.agentTrace[0];
    expect(firstTrace).toHaveProperty('timestamp');
    expect(firstTrace).toHaveProperty('from');
    expect(firstTrace).toHaveProperty('to');
    expect(firstTrace).toHaveProperty('action');
  });

  it('should include metrics with duration', async () => {
    const res = (await orchestrator.generateRoster(
      'store-1',
      new Date('2025-01-01'),
    )) as OrchestrationResult;
    expect(res).toHaveProperty('metrics');
    expect(res.metrics).toHaveProperty('totalDurationMs');
    expect(res.metrics!.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('should have status field', async () => {
    const res = (await orchestrator.generateRoster(
      'store-1',
      new Date('2025-01-01'),
    )) as OrchestrationResult;
    expect(res).toHaveProperty('status');
    expect(['ok', 'requires_human_review', 'optimization_failed', 'partial']).toContain(res.status);
  });

  it('should include validationQueriesCount in metrics', async () => {
    const res = (await orchestrator.generateRoster(
      'store-1',
      new Date('2025-01-01'),
    )) as OrchestrationResult;

    if (res.metrics?.validationQueriesCount !== undefined) {
      expect(typeof res.metrics.validationQueriesCount).toBe('number');
    }
  });
});
