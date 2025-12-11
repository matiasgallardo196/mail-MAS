/**
 * Definiciones de Shift Codes para McDonald's Australia
 *
 * Los shift codes representan los horarios estándar que los empleados
 * pueden declarar como disponibilidad.
 *
 * Códigos comunes:
 * - 1F: Turno mañana (First shift)
 * - 2F: Turno tarde (Second shift)
 * - 3F: Turno largo/split
 * - SC: Turno corto central
 * - S: Turno corto mañana
 */

export interface ShiftCodeDefinition {
  /** Hora de inicio en formato HH:mm */
  startTime: string;
  /** Hora de fin en formato HH:mm */
  endTime: string;
  /** Duración en horas */
  hours: number;
  /** Descripción del turno */
  description?: string;
}

/**
 * Mapeo de códigos de turno a sus horarios
 * Fuente: seed data de shift-codes.seed.ts
 */
export const SHIFT_CODE_TIMES: Record<string, ShiftCodeDefinition> = {
  '1F': {
    startTime: '06:30',
    endTime: '15:30',
    hours: 9,
    description: 'Turno mañana completo',
  },
  '2F': {
    startTime: '14:00',
    endTime: '23:00',
    hours: 9,
    description: 'Turno tarde completo',
  },
  '3F': {
    startTime: '08:00',
    endTime: '20:00',
    hours: 12,
    description: 'Turno largo',
  },
  SC: {
    startTime: '11:00',
    endTime: '20:00',
    hours: 9,
    description: 'Turno central',
  },
  S: {
    startTime: '06:30',
    endTime: '15:00',
    hours: 8.5,
    description: 'Turno corto mañana',
  },
};

/**
 * Códigos que indican no disponibilidad
 */
export const UNAVAILABLE_CODES = ['/', 'NA', 'OFF', 'X'] as const;

/**
 * Verifica si un shift code representa disponibilidad
 */
export function isAvailableShiftCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return !UNAVAILABLE_CODES.includes(code as any);
}

/**
 * Obtiene los tiempos de un shift code
 * @returns Los tiempos del turno o null si el código no existe o es no disponible
 */
export function getShiftCodeTimes(code: string | null | undefined): ShiftCodeDefinition | null {
  if (!code || !isAvailableShiftCode(code)) return null;
  return SHIFT_CODE_TIMES[code] ?? null;
}
