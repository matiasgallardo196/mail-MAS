import { checkRestPeriod, calculatePenaltyRates } from './fairwork.tools';

describe('fairwork.tools', () => {
  it('checkRestPeriod should detect insufficient rest', async () => {
    const res = await checkRestPeriod({
      employeeId: 'e1',
      previousShiftEnd: '2025-12-09T22:00:00.000Z',
      nextShiftStart: '2025-12-10T06:00:00.000Z',
      minHours: 10,
    });
    expect(res.compliant).toBe(false);
    expect(res.restHours).toBeLessThan(10);
  });

  it('calculatePenaltyRates should compute a holiday penalty', async () => {
    const res = await calculatePenaltyRates({
      shiftDate: '2025-12-25',
      startTime: '09:00:00',
      endTime: '17:00:00',
      employeeType: 'casual',
      baseRate: 20,
      isPublicHoliday: true,
    });
    expect(res.multiplier).toBeGreaterThanOrEqual(2.25);
    expect(res.totalPay).toBeGreaterThan(0);
  });
});
