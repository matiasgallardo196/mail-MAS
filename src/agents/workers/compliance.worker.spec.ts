import { ComplianceWorker } from './compliance.worker';

describe('ComplianceWorker', () => {
  it('should report a rest period violation', async () => {
    const worker = new ComplianceWorker();
    const tool = worker.tools?.find((t) => t.function?.name === 'validate_fair_work_compliance');
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
          baseRate: 25,
        },
        {
          employeeId: 'e1',
          start: '2025-12-10T05:00:00.000Z',
          end: '2025-12-10T13:00:00.000Z',
          station: 'general',
          isPeak: false,
          baseRate: 25,
        },
      ],
    };

    const res = await tool.function.execute({ roster, employeeContracts: [] });
    expect(res.passed).toBe(false);
    expect(res.issues.length).toBeGreaterThan(0);
  });
});
