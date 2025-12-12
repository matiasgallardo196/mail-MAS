/**
 * Shared time utilities between workers
 * Centralized to avoid code duplication (DRY)
 */

/**
 * Calculates hours between two ISO timestamps
 * @param startIso - Start timestamp in ISO format
 * @param endIso - End timestamp in ISO format
 * @returns Number of hours between the two timestamps (minimum 0)
 */
export function hoursBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.max(0, (end - start) / 3_600_000);
}

/**
 * Adds hours to an ISO timestamp
 * @param isoString - Base timestamp in ISO format
 * @param hours - Hours to add (can be negative)
 * @returns New ISO timestamp
 */
export function addHoursToIso(isoString: string, hours: number): string {
  const date = new Date(isoString);
  date.setTime(date.getTime() + hours * 3_600_000);
  return date.toISOString();
}

/**
 * Gets the day of the week from an ISO timestamp
 * @param isoString - Timestamp in ISO format
 * @returns Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
 */
export function getDayOfWeek(isoString: string): number {
  return new Date(isoString).getUTCDay();
}

/**
 * Extracts time from ISO timestamp
 * @param isoString - Timestamp in ISO format
 * @returns Time in HH:mm:ss format
 */
export function getTimeString(isoString: string): string {
  return isoString.split('T')[1]?.split('.')[0] ?? '00:00:00';
}

/**
 * Extracts date from ISO timestamp
 * @param isoString - Timestamp in ISO format
 * @returns Date in YYYY-MM-DD format
 */
export function getDateString(isoString: string): string {
  return isoString.split('T')[0];
}

/**
 * Adds days to a date
 * @param dateStr - Date in YYYY-MM-DD or ISO format
 * @param days - Days to add (can be negative)
 * @returns New date in YYYY-MM-DD format
 */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Checks if two time ranges overlap
 * @returns true if there is overlap
 */
export function timeRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string,
): boolean {
  const s1 = new Date(start1).getTime();
  const e1 = new Date(end1).getTime();
  const s2 = new Date(start2).getTime();
  const e2 = new Date(end2).getTime();
  return s1 < e2 && s2 < e1;
}
