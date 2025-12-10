/**
 * Australian Public Holidays Helper
 * Determines if a date is a public holiday in Australia (national + Victoria/Melbourne)
 * No DB required - uses algorithmic calculation for variable dates (Easter)
 */

interface HolidayInfo {
  name: string;
  isNational: boolean;
  state?: string;
}

/**
 * Calculate Easter Sunday for a given year using Anonymous Gregorian algorithm
 */
function calculateEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Get the date string in YYYY-MM-DD format
 */
function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Get the nth occurrence of a weekday in a month
 * weekday: 0 = Sunday, 1 = Monday, etc.
 */
function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const firstDay = new Date(Date.UTC(year, month, 1));
  const firstWeekday = firstDay.getUTCDay();
  let day = 1 + ((weekday - firstWeekday + 7) % 7);
  day += (n - 1) * 7;
  return new Date(Date.UTC(year, month, day));
}

/**
 * Get all Australian public holidays for a given year
 * Includes national holidays and Victoria-specific holidays
 */
export function getAustralianHolidays(year: number): Map<string, HolidayInfo> {
  const holidays = new Map<string, HolidayInfo>();

  // Fixed national holidays
  holidays.set(`${year}-01-01`, { name: "New Year's Day", isNational: true });
  holidays.set(`${year}-01-26`, { name: 'Australia Day', isNational: true });
  holidays.set(`${year}-04-25`, { name: 'ANZAC Day', isNational: true });
  holidays.set(`${year}-12-25`, { name: 'Christmas Day', isNational: true });
  holidays.set(`${year}-12-26`, { name: 'Boxing Day', isNational: true });

  // Easter (variable)
  const easterSunday = calculateEasterSunday(year);
  const goodFriday = addDays(easterSunday, -2);
  const easterSaturday = addDays(easterSunday, -1);
  const easterMonday = addDays(easterSunday, 1);

  holidays.set(toDateString(goodFriday), { name: 'Good Friday', isNational: true });
  holidays.set(toDateString(easterSaturday), { name: 'Easter Saturday', isNational: true });
  holidays.set(toDateString(easterSunday), { name: 'Easter Sunday', isNational: true });
  holidays.set(toDateString(easterMonday), { name: 'Easter Monday', isNational: true });

  // Queen's/King's Birthday - 2nd Monday of June (most states including Victoria)
  const queensBirthday = getNthWeekdayOfMonth(year, 5, 1, 2); // June, Monday, 2nd
  holidays.set(toDateString(queensBirthday), { name: "King's Birthday", isNational: true });

  // Victoria-specific holidays
  // Melbourne Cup Day - 1st Tuesday of November (Melbourne metro only)
  const melbourneCup = getNthWeekdayOfMonth(year, 10, 2, 1); // November, Tuesday, 1st
  holidays.set(toDateString(melbourneCup), {
    name: 'Melbourne Cup Day',
    isNational: false,
    state: 'VIC',
  });

  // AFL Grand Final Friday (Victoria) - Friday before last Saturday of September
  // This is approximate; actual date varies
  const lastSatSept = getNthWeekdayOfMonth(year, 8, 6, 4); // 4th Saturday of September (approx)
  const aflFriday = addDays(lastSatSept, -1);
  holidays.set(toDateString(aflFriday), {
    name: 'AFL Grand Final Friday',
    isNational: false,
    state: 'VIC',
  });

  return holidays;
}

/**
 * Check if a date string (YYYY-MM-DD) is a public holiday in Australia
 * @param dateStr Date in YYYY-MM-DD format
 * @param state Optional state code (e.g., 'VIC') to include state-specific holidays
 * @returns Holiday info if it's a holiday, undefined otherwise
 */
export function isAustralianPublicHoliday(dateStr: string, state?: string): HolidayInfo | undefined {
  const year = parseInt(dateStr.split('-')[0], 10);
  const holidays = getAustralianHolidays(year);
  const holiday = holidays.get(dateStr);

  if (!holiday) {
    return undefined;
  }

  // If it's a national holiday, always return it
  if (holiday.isNational) {
    return holiday;
  }

  // If it's a state-specific holiday, only return if state matches
  if (state && holiday.state === state) {
    return holiday;
  }

  return undefined;
}

/**
 * Simple check returning boolean
 */
export function isPublicHoliday(dateStr: string, state?: string): boolean {
  return isAustralianPublicHoliday(dateStr, state) !== undefined;
}

