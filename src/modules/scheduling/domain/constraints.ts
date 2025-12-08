import { ContractType } from './models';

/**
 * Minimum rest hours between shifts for the same employee
 */
export const MIN_REST_HOURS_BETWEEN_SHIFTS = 10;

/**
 * Minimum shift duration in hours by contract type
 */
export const MIN_SHIFT_DURATION_BY_CONTRACT: Record<ContractType, number> = {
  FULL_TIME: 4, // 4 hours minimum for full-time
  PART_TIME: 3, // 3 hours minimum for part-time
  CASUAL: 3, // 3 hours minimum for casual
};

/**
 * Typical weekly hours range by contract type
 */
export interface WeeklyHoursRange {
  min?: number;
  max: number;
}

export const WEEKLY_HOURS_BY_CONTRACT: Record<ContractType, WeeklyHoursRange> = {
  FULL_TIME: {
    min: 38,
    max: 40, // Typical full-time range
  },
  PART_TIME: {
    min: 20,
    max: 30, // Typical part-time range
  },
  CASUAL: {
    max: 40, // Casual can work up to 40h, but no minimum guarantee
  },
};

/**
 * Maximum consecutive working days
 */
export const MAX_CONSECUTIVE_WORKING_DAYS = 6;

/**
 * Minimum break duration in minutes for shifts longer than 5 hours
 */
export const MIN_BREAK_MINUTES_FOR_LONG_SHIFT = 30;

/**
 * Maximum shift duration in hours
 */
export const MAX_SHIFT_DURATION_HOURS = 10;

