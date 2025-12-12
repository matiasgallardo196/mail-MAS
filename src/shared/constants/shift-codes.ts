/**
 * Shift Code Definitions for McDonald's Australia
 *
 * Shift codes represent the standard schedules that employees
 * can declare as availability.
 *
 * Common codes:
 * - 1F: Morning shift (First shift)
 * - 2F: Afternoon shift (Second shift)
 * - 3F: Long/split shift
 * - SC: Central short shift
 * - S: Morning short shift
 */

export interface ShiftCodeDefinition {
  /** Start time in HH:mm format */
  startTime: string;
  /** End time in HH:mm format */
  endTime: string;
  /** Duration in hours */
  hours: number;
  /** Shift description */
  description?: string;
}

/**
 * Mapping of shift codes to their schedules
 * Source: seed data from shift-codes.seed.ts
 */
export const SHIFT_CODE_TIMES: Record<string, ShiftCodeDefinition> = {
  '1F': {
    startTime: '06:30',
    endTime: '15:30',
    hours: 9,
    description: 'Full morning shift',
  },
  '2F': {
    startTime: '14:00',
    endTime: '23:00',
    hours: 9,
    description: 'Full afternoon shift',
  },
  '3F': {
    startTime: '08:00',
    endTime: '20:00',
    hours: 12,
    description: 'Long shift',
  },
  SC: {
    startTime: '11:00',
    endTime: '20:00',
    hours: 9,
    description: 'Central shift',
  },
  S: {
    startTime: '06:30',
    endTime: '15:00',
    hours: 8.5,
    description: 'Short morning shift',
  },
};

/**
 * Codes that indicate unavailability
 */
export const UNAVAILABLE_CODES = ['/', 'NA', 'OFF', 'X'] as const;

/**
 * Checks if a shift code represents availability
 */
export function isAvailableShiftCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return !UNAVAILABLE_CODES.includes(code as any);
}

/**
 * Gets the times for a shift code
 * @returns The shift times or null if code doesn't exist or is unavailable
 */
export function getShiftCodeTimes(code: string | null | undefined): ShiftCodeDefinition | null {
  if (!code || !isAvailableShiftCode(code)) return null;
  return SHIFT_CODE_TIMES[code] ?? null;
}
