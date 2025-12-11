/**
 * Utilidades de tiempo compartidas entre workers
 * Centralizadas para evitar duplicación de código (DRY)
 */

/**
 * Calcula las horas entre dos timestamps ISO
 * @param startIso - Timestamp de inicio en formato ISO
 * @param endIso - Timestamp de fin en formato ISO
 * @returns Número de horas entre los dos timestamps (mínimo 0)
 */
export function hoursBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.max(0, (end - start) / 3_600_000);
}

/**
 * Añade horas a un timestamp ISO
 * @param isoString - Timestamp base en formato ISO
 * @param hours - Horas a añadir (puede ser negativo)
 * @returns Nuevo timestamp ISO
 */
export function addHoursToIso(isoString: string, hours: number): string {
  const date = new Date(isoString);
  date.setTime(date.getTime() + hours * 3_600_000);
  return date.toISOString();
}

/**
 * Obtiene el día de la semana de un timestamp ISO
 * @param isoString - Timestamp en formato ISO
 * @returns Día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)
 */
export function getDayOfWeek(isoString: string): number {
  return new Date(isoString).getUTCDay();
}

/**
 * Extrae la hora del timestamp ISO
 * @param isoString - Timestamp en formato ISO
 * @returns Hora en formato HH:mm:ss
 */
export function getTimeString(isoString: string): string {
  return isoString.split('T')[1]?.split('.')[0] ?? '00:00:00';
}

/**
 * Extrae la fecha del timestamp ISO
 * @param isoString - Timestamp en formato ISO
 * @returns Fecha en formato YYYY-MM-DD
 */
export function getDateString(isoString: string): string {
  return isoString.split('T')[0];
}

/**
 * Añade días a una fecha
 * @param dateStr - Fecha en formato YYYY-MM-DD o ISO
 * @param days - Días a añadir (puede ser negativo)
 * @returns Nueva fecha en formato YYYY-MM-DD
 */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Verifica si dos rangos de tiempo se solapan
 * @returns true si hay solapamiento
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
