import { z } from 'zod';
import { employeeTools } from './employee.tools';
import { storeTools } from './store.tools';
import { RosterSchema } from '../../shared/schemas/roster.schema';
import { ShiftSchema } from '../../shared/schemas/shift.schema';
import {
  RosterContextSchema,
  CoverageMetricsSchema,
  type RosterContext,
  type CoverageMetrics,
  type StaffRequirement,
} from '../../shared/schemas/roster-context.schema';
import { addDays } from '../../shared/utils/time.utils';
import { SHIFT_CODE_TIMES, isAvailableShiftCode } from '../../shared/constants/shift-codes';
import type { EmployeeAvailability, EmployeeSkill } from '../../shared/types/employee';
import type { Shift } from '../../shared/types/shift';

// --- Input Schemas ---

export const GenerateInitialRosterParams = z.object({
  storeId: z.string(),
  weekStart: z.string(), // ISO date YYYY-MM-DD
  weekEnd: z.string().optional(), // Si no se proporciona, se asume weekStart + 6 días
});

export type GenerateInitialRosterParamsType = z.infer<typeof GenerateInitialRosterParams>;

export const GetRosterContextParams = z.object({
  storeId: z.string(),
  weekStart: z.string(),
  weekEnd: z.string(),
});

export type GetRosterContextParamsType = z.infer<typeof GetRosterContextParams>;

export const ValidateCoverageParams = z.object({
  roster: RosterSchema,
  staffRequirements: z.array(
    z.object({
      stationId: z.string(),
      stationCode: z.string().optional(),
      periodType: z.enum(['NORMAL', 'PEAK']),
      requiredStaff: z.number(),
    })
  ),
});

export type ValidateCoverageParamsType = z.infer<typeof ValidateCoverageParams>;

// --- Shift Code Definitions ---
// SHIFT_CODE_TIMES imported from shared/constants/shift-codes.ts

// --- Helper Functions ---
// addDays imported from shared/utils/time.utils


function createShiftFromAvailability(
  availability: EmployeeAvailability,
  stationId?: string,
  stationName?: string,
): Shift | null {
  const shiftCode = availability.shiftCode;
  if (!shiftCode || !isAvailableShiftCode(shiftCode)) {
    return null; // No disponible
  }

  const shiftTimes = SHIFT_CODE_TIMES[shiftCode];
  if (!shiftTimes) {
    // Usar los tiempos de la disponibilidad si existen
    if (availability.startTime && availability.endTime) {
      return {
        employeeId: availability.employeeId,
        start: `${availability.date}T${availability.startTime}`,
        end: `${availability.date}T${availability.endTime}`,
        station: stationName || 'general',
        stationId: stationId || availability.stationId || undefined,
        shiftCode: shiftCode,
        isPeak: false,
      };
    }
    return null;
  }

  return {
    employeeId: availability.employeeId,
    start: `${availability.date}T${shiftTimes.startTime}:00`,
    end: `${availability.date}T${shiftTimes.endTime}:00`,
    station: stationName || 'general',
    stationId: stationId || availability.stationId || undefined,
    shiftCode: shiftCode,
    isPeak: false,
  };
}

function matchEmployeeToStation(
  employeeId: string,
  skills: EmployeeSkill[],
  stationId: string,
  stationCode?: string,
): boolean {
  const employeeSkills = skills.find((s) => s.employeeId === employeeId);
  if (!employeeSkills) return false;

  // Match por nombre de estación en skills
  const skillMatches = employeeSkills.skills.some(
    (skill) =>
      skill.toUpperCase() === stationCode?.toUpperCase() ||
      skill.toUpperCase().includes(stationCode?.toUpperCase() || ''),
  );

  return skillMatches;
}

// --- Tool Implementations ---

/**
 * Obtiene todo el contexto necesario para generar un roster
 * Consulta employee.tools y store.tools para obtener datos reales de la DB
 */
export async function getRosterContext(params: GetRosterContextParamsType): Promise<RosterContext> {
  const { storeId, weekStart, weekEnd } = params;

  // 1. Obtener requerimientos de staff
  const staffRequirements = await storeTools.getStoreStaffRequirements.execute({ storeId });

  // 2. Obtener disponibilidad de empleados
  // Primero necesitamos saber qué empleados consultar
  // Por ahora, usamos un approach que obtiene toda la disponibilidad para el store
  const availability = await employeeTools.getEmployeeAvailability.execute({
    storeId,
    startDate: weekStart,
    endDate: weekEnd,
    employeeIds: [], // Vacío significará "todos" si el tool lo soporta
  });

  // Extraer IDs únicos de empleados de la disponibilidad
  const employeeIds = [...new Set(availability.map((a) => a.employeeId))];

  // 3. Obtener skills de empleados
  const employeeSkills = employeeIds.length > 0
    ? await employeeTools.getEmployeeSkills.execute({ employeeIds })
    : [];

  // 4. Obtener contratos
  const contracts = employeeIds.length > 0
    ? await employeeTools.getEmployeeContracts.execute({ storeId, employeeIds })
    : [];

  return RosterContextSchema.parse({
    storeId,
    weekStart,
    weekEnd,
    availability,
    staffRequirements: staffRequirements.map((req) => ({
      stationId: req.stationId,
      periodType: req.periodType,
      requiredStaff: req.requiredStaff,
    })),
    employeeSkills,
    contracts,
  });
}

/**
 * Genera un roster inicial basado en:
 * - Disponibilidad declarada de empleados
 * - Skills/estaciones de cada empleado
 * - Requerimientos de staff por estación
 */
export async function generateInitialRoster(params: GenerateInitialRosterParamsType) {
  const { storeId, weekStart, weekEnd: providedWeekEnd } = params;
  const weekEnd = providedWeekEnd || addDays(weekStart, 6);

  // Obtener contexto completo
  let context: RosterContext;
  try {
    context = await getRosterContext({ storeId, weekStart, weekEnd });
  } catch (error) {
    // Fallback si no hay conexión a DB - generar roster vacío con warning
    console.warn('No se pudo obtener contexto de DB, generando roster vacío:', error);
    return {
      storeId,
      weekStart,
      roster: [],
      generatedAt: new Date().toISOString(),
      metrics: {
        totalShifts: 0,
        employeesAssigned: 0,
        warnings: ['No se pudo conectar a la base de datos para obtener disponibilidad'],
      },
    };
  }

  const { availability, staffRequirements, employeeSkills } = context;
  const roster: Shift[] = [];
  const assignedByDateStation: Map<string, Set<string>> = new Map(); // "date:stationId" -> Set<employeeId>
  const assignedByEmployee: Map<string, number> = new Map(); // employeeId -> count of shifts

  // Agrupar disponibilidad por fecha y empleado
  const availabilityByDateEmployee: Map<string, EmployeeAvailability> = new Map();
  for (const avail of availability) {
    const key = `${avail.date}:${avail.employeeId}`;
    availabilityByDateEmployee.set(key, avail);
  }

  // Obtener todas las fechas en el rango
  const dates: string[] = [];
  let currentDate = weekStart;
  while (currentDate <= weekEnd) {
    dates.push(currentDate);
    currentDate = addDays(currentDate, 1);
  }

  // Asignar empleados a estaciones por fecha
  for (const date of dates) {
    // Obtener los requirements para NORMAL (por defecto, sin forecast aún)
    const normalRequirements = staffRequirements.filter((r) => r.periodType === 'NORMAL');

    for (const requirement of normalRequirements) {
      const stationKey = `${date}:${requirement.stationId}`;
      if (!assignedByDateStation.has(stationKey)) {
        assignedByDateStation.set(stationKey, new Set());
      }

      const assigned = assignedByDateStation.get(stationKey)!;
      const neededStaff = requirement.requiredStaff - assigned.size;

      if (neededStaff <= 0) continue;

      // Buscar empleados disponibles que matcheen con esta estación
      const availableEmployees = availability.filter((avail) => {
        if (avail.date !== date) return false;
        if (assigned.has(avail.employeeId)) return false;
        if (!avail.shiftCode || avail.shiftCode === '/' || avail.shiftCode === 'NA') return false;

        // Verificar match de skills
        const hasSkillMatch = matchEmployeeToStation(
          avail.employeeId,
          employeeSkills,
          requirement.stationId,
          (requirement as any).stationCode,
        );

        // También aceptar si la disponibilidad tiene la misma estación
        const hasStationMatch = avail.stationId === requirement.stationId;

        return hasSkillMatch || hasStationMatch;
      });

      // Ordenar por cantidad de turnos ya asignados (balance)
      availableEmployees.sort((a, b) => {
        const countA = assignedByEmployee.get(a.employeeId) || 0;
        const countB = assignedByEmployee.get(b.employeeId) || 0;
        return countA - countB;
      });

      // Asignar hasta cubrir el requirement
      for (const avail of availableEmployees) {
        if (assigned.size >= requirement.requiredStaff) break;

        const shift = createShiftFromAvailability(
          avail,
          requirement.stationId,
          (requirement as any).stationCode,
        );

        if (shift) {
          roster.push(shift);
          assigned.add(avail.employeeId);
          assignedByEmployee.set(
            avail.employeeId,
            (assignedByEmployee.get(avail.employeeId) || 0) + 1,
          );
        }
      }
    }
  }

  // Calcular métricas
  const totalShifts = roster.length;
  const employeesAssigned = assignedByEmployee.size;
  const warnings: string[] = [];

  // Verificar cobertura
  for (const date of dates) {
    for (const req of staffRequirements.filter((r) => r.periodType === 'NORMAL')) {
      const stationKey = `${date}:${req.stationId}`;
      const assigned = assignedByDateStation.get(stationKey)?.size || 0;
      if (assigned < req.requiredStaff) {
        warnings.push(
          `Cobertura insuficiente para ${(req as any).stationCode || req.stationId} el ${date}: ${assigned}/${req.requiredStaff}`,
        );
      }
    }
  }

  return {
    storeId,
    weekStart,
    roster,
    generatedAt: new Date().toISOString(),
    metrics: {
      totalShifts,
      employeesAssigned,
      daysProcessed: dates.length,
      avgShiftsPerEmployee: employeesAssigned > 0 ? totalShifts / employeesAssigned : 0,
      warnings,
    },
  };
}

/**
 * Valida que un roster cumpla con los requerimientos de staff
 */
export async function validateCoverage(
  params: ValidateCoverageParamsType,
): Promise<CoverageMetrics> {
  const { roster, staffRequirements } = params;

  const shifts = roster.roster || [];
  const coveredStations: Record<string, number> = {};
  const uncoveredSlots: CoverageMetrics['uncoveredSlots'] = [];
  const warnings: string[] = [];

  // Contar shifts por estación
  for (const shift of shifts) {
    const stationKey = shift.stationId || shift.station || 'unknown';
    coveredStations[stationKey] = (coveredStations[stationKey] || 0) + 1;
  }

  // Para cada requirement, verificar cobertura
  // Nota: Esto es simplificado - en producción debería verificar por día y hora
  for (const req of staffRequirements) {
    const assigned = coveredStations[req.stationId] || 0;
    // Asumiendo que estamos verificando para todos los días (simplificado)
    const averagePerDay = assigned / 7; // Asumiendo semana completa

    if (averagePerDay < req.requiredStaff) {
      uncoveredSlots.push({
        date: 'average',
        stationId: req.stationId,
        periodType: req.periodType,
        required: req.requiredStaff,
        assigned: Math.floor(averagePerDay),
        gap: req.requiredStaff - Math.floor(averagePerDay),
      });
      warnings.push(
        `Cobertura promedio insuficiente para ${req.stationId} (${req.periodType}): ~${Math.floor(averagePerDay)}/${req.requiredStaff}`,
      );
    }
  }

  // Calcular score de cobertura
  const totalRequired = staffRequirements.reduce((sum, r) => sum + r.requiredStaff, 0);
  const totalAssigned = Object.values(coveredStations).reduce((sum, count) => sum + count, 0);
  const coverageScore = totalRequired > 0 ? Math.min(100, (totalAssigned / (totalRequired * 7)) * 100) : 100;

  return CoverageMetricsSchema.parse({
    totalShifts: shifts.length,
    coveredStations,
    uncoveredSlots,
    coverageScore: Math.round(coverageScore),
    warnings,
  });
}
