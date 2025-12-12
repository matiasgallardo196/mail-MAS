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
  if (!employeeSkills) {
    // No skills found - accept as fallback (CREW can work any station)
    return true;
  }

  // If no stationCode provided, accept any employee
  if (!stationCode) {
    return true;
  }

  // Match por nombre de estación en skills (case insensitive)
  const normalizedStationCode = stationCode.toUpperCase().trim();
  const skillMatches = employeeSkills.skills.some((skill) => {
    const normalizedSkill = skill.toUpperCase().trim();
    // Direct match or partial match
    return normalizedSkill === normalizedStationCode || 
           normalizedSkill.includes(normalizedStationCode) ||
           normalizedStationCode.includes(normalizedSkill);
  });

  // Fallback: CREW or MANAGER roles can work any station
  const hasRoleMatch = employeeSkills.skills.some(
    (skill) => skill.toUpperCase() === 'CREW' || skill.toUpperCase() === 'MANAGER'
  );

  return skillMatches || hasRoleMatch;
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
      stationCode: (req as any).stationCode as string | undefined,
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

  const { availability, staffRequirements, employeeSkills, contracts } = context;
  
  // === PREVENTIVE: Max hours per week by employment type (Fair Work Act) ===
  const MAX_HOURS_BY_TYPE: Record<string, number> = {
    FULL_TIME: 38,
    PART_TIME: 32,
    CASUAL: 24,
  };
  
  // Helper to get shift hours from shift code
  const getShiftHours = (shiftCode: string | null | undefined): number => {
    switch (shiftCode) {
      case '1F': return 9;  // 06:30-15:30
      case '2F': return 9;  // 14:00-23:00  
      case '3F': return 12; // 08:00-20:00
      case 'S': return 8.5; // 06:30-15:00 (manager)
      case 'SC': return 9;  // 11:00-20:00 (shift change)
      default: return 9;    // Default to 9h
    }
  };

  // Map employeeId -> employmentType
  const employeeTypes: Map<string, string> = new Map();
  for (const contract of contracts || []) {
    employeeTypes.set(contract.employeeId, contract.employmentType);
  }

  const roster: Shift[] = [];
  const assignedByDateStation: Map<string, Set<string>> = new Map(); // "date:stationId" -> Set<employeeId>
  const assignedByEmployee: Map<string, number> = new Map(); // employeeId -> count of shifts
  const hoursPerEmployee: Map<string, number> = new Map(); // employeeId -> weekly hours


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
  
  // Calculate matching dates for internal use (kept for debug field in response)
  const availDates = [...new Set(availability.map(a => a.date))];
  const matchingDates = dates.filter(d => availDates.includes(d));

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
        
        // === PREVENTIVE: Check weekly hours limit ===
        const empType = employeeTypes.get(avail.employeeId) || 'CASUAL';
        const maxHours = MAX_HOURS_BY_TYPE[empType] || 24;
        const currentHours = hoursPerEmployee.get(avail.employeeId) || 0;
        const shiftHours = getShiftHours(avail.shiftCode);
        if (currentHours + shiftHours > maxHours) return false;

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
          // Update weekly hours tracking
          const hrs = hoursPerEmployee.get(avail.employeeId) || 0;
          hoursPerEmployee.set(avail.employeeId, hrs + getShiftHours(avail.shiftCode));
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
    debug: {
      availabilityCount: availability.length,
      skillsCount: employeeSkills.length,
      requirementsCount: staffRequirements.length,
      generatedDates: dates.slice(0, 3),
      availabilityDates: [...new Set(availability.map(a => a.date))].slice(0, 3),
      matchingDatesCount: matchingDates.length,
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

  // Para cada requirement, verificar cobertura por día
  // Obtenemos las fechas del roster o usamos una semana por defecto
  const weekStart = roster.weekStart;
  const rosterDays: string[] = [];
  if (weekStart) {
    let currentDate = weekStart;
    for (let i = 0; i < 7; i++) {
      rosterDays.push(currentDate);
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      currentDate = d.toISOString().split('T')[0];
    }
  }
  
  for (const req of staffRequirements) {
    const assigned = coveredStations[req.stationId] || 0;
    
    // Si tenemos fechas específicas, crear gaps por día
    if (rosterDays.length > 0) {
      // Verificar cobertura por día
      const shiftsPerDay = Math.floor(assigned / 7);
      for (const day of rosterDays) {
        if (shiftsPerDay < req.requiredStaff) {
          uncoveredSlots.push({
            date: day,
            stationId: req.stationId,
            periodType: req.periodType,
            required: req.requiredStaff,
            assigned: shiftsPerDay,
            gap: req.requiredStaff - shiftsPerDay,
          });
        }
      }
    } else {
      // Fallback: usar fecha actual si no hay weekStart
      const today = new Date().toISOString().split('T')[0];
      const averagePerDay = Math.floor(assigned / 7);
      if (averagePerDay < req.requiredStaff) {
        uncoveredSlots.push({
          date: today,
          stationId: req.stationId,
          periodType: req.periodType,
          required: req.requiredStaff,
          assigned: averagePerDay,
          gap: req.requiredStaff - averagePerDay,
        });
        warnings.push(
          `Cobertura insuficiente para ${req.stationId} (${req.periodType}): ~${averagePerDay}/${req.requiredStaff}`,
        );
      }
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
