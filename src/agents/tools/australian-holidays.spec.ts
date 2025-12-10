import { isPublicHoliday, isAustralianPublicHoliday, getAustralianHolidays } from './australian-holidays';

describe('Australian Holidays', () => {
  it('should detect Christmas Day as national holiday', () => {
    const result = isAustralianPublicHoliday('2025-12-25');
    expect(result).toBeDefined();
    expect(result?.name).toBe('Christmas Day');
    expect(result?.isNational).toBe(true);
  });

  it('should detect Boxing Day as national holiday', () => {
    const result = isAustralianPublicHoliday('2025-12-26');
    expect(result).toBeDefined();
    expect(result?.name).toBe('Boxing Day');
  });

  it('should detect New Year\'s Day', () => {
    expect(isPublicHoliday('2025-01-01')).toBe(true);
  });

  it('should detect Australia Day', () => {
    expect(isPublicHoliday('2025-01-26')).toBe(true);
  });

  it('should detect ANZAC Day', () => {
    expect(isPublicHoliday('2025-04-25')).toBe(true);
  });

  it('should detect Good Friday 2025', () => {
    // Good Friday 2025 is April 18
    expect(isPublicHoliday('2025-04-18')).toBe(true);
    const result = isAustralianPublicHoliday('2025-04-18');
    expect(result?.name).toBe('Good Friday');
  });

  it('should detect Easter Monday 2025', () => {
    // Easter Monday 2025 is April 21
    expect(isPublicHoliday('2025-04-21')).toBe(true);
  });

  it('should not detect regular weekday as holiday', () => {
    expect(isPublicHoliday('2025-12-10')).toBe(false);
  });

  it('should detect Melbourne Cup Day for VIC', () => {
    // Melbourne Cup 2025 is first Tuesday of November = Nov 4
    const result = isAustralianPublicHoliday('2025-11-04', 'VIC');
    expect(result).toBeDefined();
    expect(result?.name).toBe('Melbourne Cup Day');
    expect(result?.state).toBe('VIC');
  });

  it('should not detect Melbourne Cup Day without VIC state', () => {
    // Without specifying VIC, state-specific holidays are not returned
    const result = isAustralianPublicHoliday('2025-11-04');
    expect(result).toBeUndefined();
  });

  it('should return all holidays for a year', () => {
    const holidays = getAustralianHolidays(2025);
    expect(holidays.size).toBeGreaterThan(10);
    expect(holidays.has('2025-12-25')).toBe(true);
    expect(holidays.has('2025-01-01')).toBe(true);
  });
});

