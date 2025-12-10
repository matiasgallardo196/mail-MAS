import { checkRestPeriod, calculatePenaltyRates, PenaltyRule } from './fairwork.tools';

// Mock penalty rules for testing (same structure as DB seed)
const mockPenaltyRules: PenaltyRule[] = [
  { id: 'rule-sat', dayOfWeek: 6, startTime: null, endTime: null, employmentType: null, multiplier: 1.25, isPublicHoliday: false, description: 'Saturday' },
  { id: 'rule-sun', dayOfWeek: 0, startTime: null, endTime: null, employmentType: null, multiplier: 1.5, isPublicHoliday: false, description: 'Sunday' },
  { id: 'rule-holiday', dayOfWeek: null, startTime: null, endTime: null, employmentType: null, multiplier: 2.25, isPublicHoliday: true, description: 'Public holiday' },
  { id: 'rule-evening', dayOfWeek: null, startTime: '21:00:00', endTime: '23:59:59', employmentType: null, multiplier: 1.15, isPublicHoliday: false, description: 'Evening' },
];

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

  it('checkRestPeriod should pass when rest is sufficient', async () => {
    const res = await checkRestPeriod({
      employeeId: 'e1',
      previousShiftEnd: '2025-12-09T14:00:00.000Z',
      nextShiftStart: '2025-12-10T06:00:00.000Z',
      minHours: 10,
    });
    expect(res.compliant).toBe(true);
    expect(res.restHours).toBeGreaterThanOrEqual(10);
  });

  it('calculatePenaltyRates should compute a holiday penalty', async () => {
    const res = await calculatePenaltyRates({
      shiftDate: '2025-12-25',
      startTime: '09:00:00',
      endTime: '17:00:00',
      employmentType: 'CASUAL',
      penaltyRules: mockPenaltyRules,
      isPublicHoliday: true,
    });
    expect(res.multiplier).toBeGreaterThanOrEqual(2.25);
    expect(res.appliedRuleId).toBe('rule-holiday');
  });

  it('calculatePenaltyRates should compute Saturday penalty', async () => {
    // 2025-12-13 is a Saturday
    const res = await calculatePenaltyRates({
      shiftDate: '2025-12-13',
      startTime: '09:00:00',
      endTime: '17:00:00',
      employmentType: 'FULL_TIME',
      penaltyRules: mockPenaltyRules,
      isPublicHoliday: false,
    });
    expect(res.multiplier).toBe(1.25);
    expect(res.appliedRuleId).toBe('rule-sat');
  });

  it('calculatePenaltyRates should compute Sunday penalty', async () => {
    // 2025-12-14 is a Sunday
    const res = await calculatePenaltyRates({
      shiftDate: '2025-12-14',
      startTime: '09:00:00',
      endTime: '17:00:00',
      employmentType: 'PART_TIME',
      penaltyRules: mockPenaltyRules,
      isPublicHoliday: false,
    });
    expect(res.multiplier).toBe(1.5);
    expect(res.appliedRuleId).toBe('rule-sun');
  });

  it('calculatePenaltyRates should return multiplier 1 for weekday without rules', async () => {
    // 2025-12-10 is a Wednesday
    const res = await calculatePenaltyRates({
      shiftDate: '2025-12-10',
      startTime: '09:00:00',
      endTime: '17:00:00',
      employmentType: 'CASUAL',
      penaltyRules: mockPenaltyRules,
      isPublicHoliday: false,
    });
    // No matching rule for Wednesday daytime
    expect(res.multiplier).toBe(1);
  });
});
