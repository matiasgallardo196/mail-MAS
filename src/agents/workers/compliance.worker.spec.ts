import { ComplianceWorker } from './compliance.worker';

// Mock all external dependencies
jest.mock('../tools/fairwork.tools', () => {
  const actual = jest.requireActual('../tools/fairwork.tools');
  return {
    ...actual,
    loadPenaltyRulesFromDb: jest.fn().mockResolvedValue([
      { id: 'rule-sat', dayOfWeek: 6, startTime: null, endTime: null, employmentType: null, multiplier: 1.25, isPublicHoliday: false, description: 'Saturday' },
      { id: 'rule-sun', dayOfWeek: 0, startTime: null, endTime: null, employmentType: null, multiplier: 1.5, isPublicHoliday: false, description: 'Sunday' },
      { id: 'rule-holiday', dayOfWeek: null, startTime: null, endTime: null, employmentType: null, multiplier: 2.25, isPublicHoliday: true, description: 'Public holiday' },
    ]),
  };
});

jest.mock('../tools/store.tools', () => ({
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

jest.mock('../tools/employee.tools', () => ({
  employeeTools: {
    getEmployeeContracts: {
      execute: jest.fn().mockResolvedValue([
        { employeeId: 'e1', employmentType: 'FULL_TIME', maxHoursWeek: 38, minHoursBetweenShifts: 10 },
        { employeeId: 'e2', employmentType: 'CASUAL', maxHoursWeek: 24, minHoursBetweenShifts: 10 },
      ]),
    },
  },
}));

describe('ComplianceWorker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should report a rest period violation', async () => {
    const worker = new ComplianceWorker();
    const tool = worker.tools?.find((t: any) => t.function?.name === 'validate_fair_work_compliance');
    expect(tool).toBeDefined();

    const roster = {
      storeId: 'store-1',
      weekStart: '2025-12-08',
      roster: [
        {
          employeeId: 'e1',
          start: '2025-12-09T22:00:00.000Z',
          end: '2025-12-10T02:00:00.000Z',
          station: 'general',
          isPeak: false,
        },
        {
          employeeId: 'e1',
          start: '2025-12-10T05:00:00.000Z',
          end: '2025-12-10T13:00:00.000Z',
          station: 'general',
          isPeak: false,
        },
      ],
    };

    const res = await tool.function.execute({ roster });
    expect(res.passed).toBe(false);
    expect(res.issues.some((i: any) => i.issue === 'MIN_REST_VIOLATION')).toBe(true);
  });

  it('should pass when rest period is sufficient', async () => {
    const worker = new ComplianceWorker();
    const tool = worker.tools?.find((t: any) => t.function?.name === 'validate_fair_work_compliance');

    const roster = {
      storeId: 'store-1',
      weekStart: '2025-12-08',
      roster: [
        {
          employeeId: 'e1',
          start: '2025-12-09T08:00:00.000Z',
          end: '2025-12-09T16:00:00.000Z',
          station: 'general',
          isPeak: false,
        },
        {
          employeeId: 'e1',
          start: '2025-12-10T08:00:00.000Z',
          end: '2025-12-10T16:00:00.000Z',
          station: 'general',
          isPeak: false,
        },
      ],
    };

    const res = await tool.function.execute({ roster });
    // No rest violations (16h between shifts)
    const restViolations = res.issues.filter((i: any) => i.issue === 'MIN_REST_VIOLATION');
    expect(restViolations.length).toBe(0);
  });

  it('should report CRITICAL when penalty_rules are missing', async () => {
    // Override mock to return empty rules
    const { loadPenaltyRulesFromDb } = require('../tools/fairwork.tools');
    loadPenaltyRulesFromDb.mockResolvedValueOnce([]);

    const worker = new ComplianceWorker();
    const tool = worker.tools?.find((t: any) => t.function?.name === 'validate_fair_work_compliance');

    const roster = {
      storeId: 'store-1',
      weekStart: '2025-12-08',
      roster: [],
    };

    const res = await tool.function.execute({ roster });
    expect(res.passed).toBe(false);
    expect(res.issues.some((i: any) => i.issue === 'MISSING_PENALTY_RULES' && i.severity === 'CRITICAL')).toBe(true);
  });

  it('should detect minimum shift length violation for casuals and suggest extension', async () => {
    const { employeeTools } = require('../tools/employee.tools');
    employeeTools.getEmployeeContracts.execute.mockResolvedValueOnce([
      { employeeId: 'e2', employmentType: 'CASUAL', maxHoursWeek: 24, minHoursBetweenShifts: 10 },
    ]);

    const worker = new ComplianceWorker();
    const tool = worker.tools?.find((t: any) => t.function?.name === 'validate_fair_work_compliance');

    const roster = {
      storeId: 'store-1',
      weekStart: '2025-12-08',
      roster: [
        {
          employeeId: 'e2',
          start: '2025-12-09T09:00:00.000Z',
          end: '2025-12-09T11:00:00.000Z', // Only 2 hours - below minimum 3h
          station: 'general',
          isPeak: false,
        },
      ],
    };

    const res = await tool.function.execute({ roster });
    expect(res.passed).toBe(false);
    expect(res.issues.some((i: any) => i.issue === 'MIN_SHIFT_LENGTH_VIOLATION')).toBe(true);
    // Should have a suggestion to extend the shift
    expect(res.suggestions).toBeDefined();
    expect(res.suggestions?.some((s: any) => s.type === 'EXTEND_SHIFT')).toBe(true);
  });

  it('should detect max shift span violation (>12h)', async () => {
    const worker = new ComplianceWorker();
    const tool = worker.tools?.find((t: any) => t.function?.name === 'validate_fair_work_compliance');

    const roster = {
      storeId: 'store-1',
      weekStart: '2025-12-08',
      roster: [
        {
          employeeId: 'e1',
          start: '2025-12-09T06:00:00.000Z',
          end: '2025-12-09T20:00:00.000Z', // 14 hours - exceeds 12h max
          station: 'general',
          isPeak: false,
        },
      ],
    };

    const res = await tool.function.execute({ roster });
    expect(res.passed).toBe(false);
    expect(res.issues.some((i: any) => i.issue === 'MAX_SHIFT_SPAN_VIOLATION')).toBe(true);
  });

  it('should detect max weekly hours violation', async () => {
    const { employeeTools } = require('../tools/employee.tools');
    employeeTools.getEmployeeContracts.execute.mockResolvedValueOnce([
      { employeeId: 'e1', employmentType: 'FULL_TIME', maxHoursWeek: 38, minHoursBetweenShifts: 10 },
    ]);

    const worker = new ComplianceWorker();
    const tool = worker.tools?.find((t: any) => t.function?.name === 'validate_fair_work_compliance');

    // Create shifts totaling more than 38 hours
    const roster = {
      storeId: 'store-1',
      weekStart: '2025-12-08',
      roster: [
        { employeeId: 'e1', start: '2025-12-08T08:00:00.000Z', end: '2025-12-08T18:00:00.000Z' }, // 10h
        { employeeId: 'e1', start: '2025-12-09T08:00:00.000Z', end: '2025-12-09T18:00:00.000Z' }, // 10h
        { employeeId: 'e1', start: '2025-12-10T08:00:00.000Z', end: '2025-12-10T18:00:00.000Z' }, // 10h
        { employeeId: 'e1', start: '2025-12-11T08:00:00.000Z', end: '2025-12-11T18:00:00.000Z' }, // 10h = 40h total
      ],
    };

    const res = await tool.function.execute({ roster });
    expect(res.passed).toBe(false);
    expect(res.issues.some((i: any) => i.issue === 'MAX_WEEKLY_HOURS_VIOLATION')).toBe(true);
  });

  it('should detect public holiday and report high penalty', async () => {
    const worker = new ComplianceWorker();
    const tool = worker.tools?.find((t: any) => t.function?.name === 'validate_fair_work_compliance');

    // Christmas Day 2025
    const roster = {
      storeId: 'store-1',
      weekStart: '2025-12-22',
      roster: [
        {
          employeeId: 'e1',
          start: '2025-12-25T08:00:00.000Z',
          end: '2025-12-25T16:00:00.000Z',
          station: 'general',
          isPeak: false,
        },
      ],
    };

    const res = await tool.function.execute({ roster });
    // Should have HIGH_PENALTY_MULTIPLIER issue for holiday
    expect(res.issues.some((i: any) => i.issue === 'HIGH_PENALTY_MULTIPLIER')).toBe(true);
    // Should include holiday name in details
    const holidayIssue = res.issues.find((i: any) => i.issue === 'HIGH_PENALTY_MULTIPLIER');
    expect(holidayIssue?.details?.holiday).toBe('Christmas Day');
  });

  it('should suggest moving shift when rest period is violated', async () => {
    const worker = new ComplianceWorker();
    const tool = worker.tools?.find((t: any) => t.function?.name === 'validate_fair_work_compliance');

    const roster = {
      storeId: 'store-1',
      weekStart: '2025-12-08',
      roster: [
        {
          employeeId: 'e1',
          start: '2025-12-09T14:00:00.000Z',
          end: '2025-12-09T22:00:00.000Z',
        },
        {
          employeeId: 'e1',
          start: '2025-12-10T05:00:00.000Z', // Only 7h rest, violates 10h minimum
          end: '2025-12-10T13:00:00.000Z',
        },
      ],
    };

    const res = await tool.function.execute({ roster });
    expect(res.passed).toBe(false);
    expect(res.suggestions).toBeDefined();
    const moveSuggestion = res.suggestions?.find((s: any) => s.type === 'MOVE_SHIFT');
    expect(moveSuggestion).toBeDefined();
    expect(moveSuggestion?.relatedIssue).toBe('MIN_REST_VIOLATION');
    expect(moveSuggestion?.suggestedChange?.newStart).toBeDefined();
  });
});
