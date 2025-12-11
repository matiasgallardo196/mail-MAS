import {
  hoursBetween,
  addHoursToIso,
  getDayOfWeek,
  getTimeString,
  getDateString,
  addDays,
  timeRangesOverlap,
} from './time.utils';

describe('Time Utilities', () => {
  describe('hoursBetween', () => {
    it('should calculate hours between two timestamps', () => {
      const start = '2024-12-09T09:00:00.000Z';
      const end = '2024-12-09T17:00:00.000Z';
      expect(hoursBetween(start, end)).toBe(8);
    });

    it('should return 0 for negative duration', () => {
      const start = '2024-12-09T17:00:00.000Z';
      const end = '2024-12-09T09:00:00.000Z';
      expect(hoursBetween(start, end)).toBe(0);
    });

    it('should handle decimal hours', () => {
      const start = '2024-12-09T09:00:00.000Z';
      const end = '2024-12-09T09:30:00.000Z';
      expect(hoursBetween(start, end)).toBe(0.5);
    });
  });

  describe('addHoursToIso', () => {
    it('should add hours to a timestamp', () => {
      const original = '2024-12-09T09:00:00.000Z';
      const result = addHoursToIso(original, 3);
      expect(result).toBe('2024-12-09T12:00:00.000Z');
    });

    it('should handle negative hours', () => {
      const original = '2024-12-09T12:00:00.000Z';
      const result = addHoursToIso(original, -3);
      expect(result).toBe('2024-12-09T09:00:00.000Z');
    });

    it('should handle day rollover', () => {
      const original = '2024-12-09T22:00:00.000Z';
      const result = addHoursToIso(original, 5);
      expect(result).toBe('2024-12-10T03:00:00.000Z');
    });
  });

  describe('getDayOfWeek', () => {
    it('should return 0 for Sunday', () => {
      expect(getDayOfWeek('2024-12-08T12:00:00.000Z')).toBe(0);
    });

    it('should return 1 for Monday', () => {
      expect(getDayOfWeek('2024-12-09T12:00:00.000Z')).toBe(1);
    });

    it('should return 6 for Saturday', () => {
      expect(getDayOfWeek('2024-12-07T12:00:00.000Z')).toBe(6);
    });
  });

  describe('getTimeString', () => {
    it('should extract time from ISO string', () => {
      expect(getTimeString('2024-12-09T14:30:00.000Z')).toBe('14:30:00');
    });

    it('should handle missing time part', () => {
      expect(getTimeString('2024-12-09')).toBe('00:00:00');
    });
  });

  describe('getDateString', () => {
    it('should extract date from ISO string', () => {
      expect(getDateString('2024-12-09T14:30:00.000Z')).toBe('2024-12-09');
    });
  });

  describe('addDays', () => {
    it('should add days to a date', () => {
      expect(addDays('2024-12-09', 3)).toBe('2024-12-12');
    });

    it('should handle month rollover', () => {
      expect(addDays('2024-12-30', 5)).toBe('2025-01-04');
    });

    it('should handle negative days', () => {
      expect(addDays('2024-12-09', -2)).toBe('2024-12-07');
    });
  });

  describe('timeRangesOverlap', () => {
    it('should return true for overlapping ranges', () => {
      const result = timeRangesOverlap(
        '2024-12-09T09:00:00.000Z',
        '2024-12-09T17:00:00.000Z',
        '2024-12-09T14:00:00.000Z',
        '2024-12-09T23:00:00.000Z',
      );
      expect(result).toBe(true);
    });

    it('should return false for non-overlapping ranges', () => {
      const result = timeRangesOverlap(
        '2024-12-09T09:00:00.000Z',
        '2024-12-09T13:00:00.000Z',
        '2024-12-09T14:00:00.000Z',
        '2024-12-09T23:00:00.000Z',
      );
      expect(result).toBe(false);
    });

    it('should return false for adjacent ranges', () => {
      const result = timeRangesOverlap(
        '2024-12-09T09:00:00.000Z',
        '2024-12-09T14:00:00.000Z',
        '2024-12-09T14:00:00.000Z',
        '2024-12-09T23:00:00.000Z',
      );
      expect(result).toBe(false);
    });
  });
});
