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
  weekEnd: z.string().optional(), // If not provided, assumes weekStart + 6 days
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
    return null; // Not available
  }

  const shiftTimes = SHIFT_CODE_TIMES[shiftCode];
  if (!shiftTimes) {
    // Use availability times if they exist
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

  // Match by station name in skills (case insensitive)
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

/**
 * Determines if a date/shift combination falls in a peak period.
 * Peak periods require more staff per station.
 * 
 * Peak conditions per Challenge Brief:
 * - Weekends (Saturday + Sunday): Always peak (+20% staff)
 * - Lunch Peak: 11:00-14:00 (1F, SC, 3F cover this)
 * - Dinner Peak: 17:00-21:00 (2F, 3F cover this)
 */
function isPeakPeriod(date: string, shiftCode: string | null | undefined): boolean {
  const dayOfWeek = new Date(date).getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
  
  // Weekends are always peak (Challenge: "Weekend coverage is 20% higher")
  if (isWeekend) return true;
  
  // 1F (06:30-15:30) covers lunch peak (11:00-14:00)
  if (shiftCode === '1F') return true;
  
  // SC (11:00-20:00) covers both lunch and dinner peak
  if (shiftCode === 'SC') return true;
  
  // 2F (14:00-23:00) covers dinner peak (17:00-21:00)
  if (shiftCode === '2F') return true;
  
  // 3F (08:00-20:00) covers both lunch and dinner peak
  if (shiftCode === '3F') return true;
  
  // S (06:30-15:00) covers lunch peak
  if (shiftCode === 'S') return true;
  
  return false;
}

// --- Tool Implementations ---

/**
 * Gets all context needed to generate a roster
 * Queries employee.tools and store.tools to get real data from DB
 */
export async function getRosterContext(params: GetRosterContextParamsType): Promise<RosterContext> {
  const { storeId, weekStart, weekEnd } = params;

  // 1. Get staff requirements
  const staffRequirements = await storeTools.getStoreStaffRequirements.execute({ storeId });

  // 2. Get employee availability
  // First we need to know which employees to query
  // For now, we use an approach that gets all availability for the store
  const availability = await employeeTools.getEmployeeAvailability.execute({
    storeId,
    startDate: weekStart,
    endDate: weekEnd,
    employeeIds: [], // Empty means "all" if the tool supports it
  });

  // Extract unique employee IDs from availability
  const employeeIds = [...new Set(availability.map((a) => a.employeeId))];

  // 3. Get employee skills
  const employeeSkills = employeeIds.length > 0
    ? await employeeTools.getEmployeeSkills.execute({ employeeIds })
    : [];

  // 4. Get contracts
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
 * Generates an initial roster based on:
 * - Declared employee availability
 * - Skills/stations for each employee
 * - Staff requirements by station
 */
export async function generateInitialRoster(params: GenerateInitialRosterParamsType) {
  const { storeId, weekStart, weekEnd: providedWeekEnd } = params;
  const weekEnd = providedWeekEnd || addDays(weekStart, 6);

  // Get complete context
  let context: RosterContext;
  try {
    context = await getRosterContext({ storeId, weekStart, weekEnd });
  } catch (error) {
    // Fallback if no DB connection - generate empty roster with warning
    console.warn('Could not get context from DB, generating empty roster:', error);
    return {
      storeId,
      weekStart,
      roster: [],
      generatedAt: new Date().toISOString(),
      metrics: {
        totalShifts: 0,
        employeesAssigned: 0,
        warnings: ['Could not connect to database to get availability'],
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

  // Map employeeId -> defaultStationCode (for specialist prioritization)
  const employeeDefaultStation: Map<string, string | null> = new Map();
  for (const contract of contracts || []) {
    employeeDefaultStation.set(contract.employeeId, (contract as any).defaultStationCode || null);
  }

  const roster: Shift[] = [];
  const assignedByDateStation: Map<string, Set<string>> = new Map(); // "date:stationId" -> Set<employeeId>
  const assignedByEmployee: Map<string, number> = new Map(); // employeeId -> count of shifts
  const hoursPerEmployee: Map<string, number> = new Map(); // employeeId -> weekly hours
  // Track if station already has a specialist for the day
  const hasSpecialistByDateStation: Map<string, boolean> = new Map(); // "date:stationCode" -> hasSpecialist


  // Group availability by date and employee
  const availabilityByDateEmployee: Map<string, EmployeeAvailability> = new Map();
  for (const avail of availability) {
    const key = `${avail.date}:${avail.employeeId}`;
    availabilityByDateEmployee.set(key, avail);
  }

  // Get all dates in the range
  const dates: string[] = [];
  let currentDate = weekStart;
  while (currentDate <= weekEnd) {
    dates.push(currentDate);
    currentDate = addDays(currentDate, 1);
  }
  
  // Calculate matching dates for internal use (kept for debug field in response)
  const availDates = [...new Set(availability.map(a => a.date))];
  const matchingDates = dates.filter(d => availDates.includes(d));

  // Assign employees to stations by date
  for (const date of dates) {
    // Determine if this date is a weekend (always peak)
    const dayOfWeek = new Date(date).getDay();
    const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Get both NORMAL and PEAK requirements
    const normalRequirements = staffRequirements.filter((r) => r.periodType === 'NORMAL');
    const peakRequirements = staffRequirements.filter((r) => r.periodType === 'PEAK');
    
    // Use PEAK requirements for weekends, NORMAL otherwise (shift-specific peak handled later)
    const effectiveRequirements = isWeekendDay ? peakRequirements : normalRequirements;
    // Fallback to NORMAL if no PEAK requirements exist
    const requirementsToUse = effectiveRequirements.length > 0 ? effectiveRequirements : normalRequirements;

    for (const requirement of requirementsToUse) {
      const stationKey = `${date}:${requirement.stationId}`;
      if (!assignedByDateStation.has(stationKey)) {
        assignedByDateStation.set(stationKey, new Set());
      }

      const assigned = assignedByDateStation.get(stationKey)!;
      const neededStaff = requirement.requiredStaff - assigned.size;

      if (neededStaff <= 0) continue;

      // Find available employees that match this station
      const reqStationCode = ((requirement as any).stationCode || '').toUpperCase();
      
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

        // Verify skill match
        const hasSkillMatch = matchEmployeeToStation(
          avail.employeeId,
          employeeSkills,
          requirement.stationId,
          (requirement as any).stationCode,
        );

        // Also accept if availability has the same station
        const hasStationMatch = avail.stationId === requirement.stationId;

        return hasSkillMatch || hasStationMatch;
      });
      
      // === SMART: Reserve specialists for their own stations ===
      // Separate employees into: specialists for THIS station, non-specialists, and specialists from OTHER stations
      const thisStationSpecialists = availableEmployees.filter(avail => 
        employeeDefaultStation.get(avail.employeeId)?.toUpperCase() === reqStationCode
      );
      const nonSpecialists = availableEmployees.filter(avail => {
        const empStation = employeeDefaultStation.get(avail.employeeId)?.toUpperCase();
        return !empStation || empStation === reqStationCode; // No station = flexible
      });
      const otherSpecialists = availableEmployees.filter(avail => {
        const empStation = employeeDefaultStation.get(avail.employeeId)?.toUpperCase();
        return empStation && empStation !== reqStationCode;
      });
      
      // Use this station's specialists + non-specialists first; only use other specialists if needed
      const prioritizedEmployees = [...thisStationSpecialists, ...nonSpecialists];
      const canFillWithoutOthers = prioritizedEmployees.length >= neededStaff;
      const employeesToUse = canFillWithoutOthers 
        ? prioritizedEmployees 
        : [...prioritizedEmployees, ...otherSpecialists];

      // Get station code for specialist matching
      const stationCode = ((requirement as any).stationCode || '').toUpperCase();
      const specialistKey = `${date}:${stationCode}`;
      const needsSpecialist = !hasSpecialistByDateStation.get(specialistKey);

      // Sort: prioritize specialists first, then by shift count (balance)
      employeesToUse.sort((a, b) => {
        const aIsSpecialist = employeeDefaultStation.get(a.employeeId)?.toUpperCase() === stationCode;
        const bIsSpecialist = employeeDefaultStation.get(b.employeeId)?.toUpperCase() === stationCode;
        
        // If we need a specialist and one is available, prioritize them
        if (needsSpecialist) {
          if (aIsSpecialist && !bIsSpecialist) return -1;
          if (!aIsSpecialist && bIsSpecialist) return 1;
        }
        
        // Otherwise, balance by shift count
        const countA = assignedByEmployee.get(a.employeeId) || 0;
        const countB = assignedByEmployee.get(b.employeeId) || 0;
        return countA - countB;
      });

      // Assign until requirement is covered
      let assignedSpecialistThisStation = hasSpecialistByDateStation.get(specialistKey) || false;
      
      for (const avail of employeesToUse) {
        if (assigned.size >= requirement.requiredStaff) break;

        const shift = createShiftFromAvailability(
          avail,
          requirement.stationId,
          (requirement as any).stationCode,
        );

        if (shift) {
          // Set isPeak flag based on date and shift code
          shift.isPeak = isWeekendDay || isPeakPeriod(date, avail.shiftCode);
          
          // Track if this employee is a specialist for this station
          const isSpecialist = employeeDefaultStation.get(avail.employeeId)?.toUpperCase() === stationCode;
          if (isSpecialist) {
            assignedSpecialistThisStation = true;
            hasSpecialistByDateStation.set(specialistKey, true);
          }
          
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

  // Calculate metrics
  const totalShifts = roster.length;
  const employeesAssigned = assignedByEmployee.size;
  const warnings: string[] = [];

  // Verify coverage
  for (const date of dates) {
    for (const req of staffRequirements.filter((r) => r.periodType === 'NORMAL')) {
      const stationKey = `${date}:${req.stationId}`;
      const assigned = assignedByDateStation.get(stationKey)?.size || 0;
      if (assigned < req.requiredStaff) {
        warnings.push(
          `Insufficient coverage for ${(req as any).stationCode || req.stationId} on ${date}: ${assigned}/${req.requiredStaff}`,
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
 * Validates that a roster meets staff requirements
 */
export async function validateCoverage(
  params: ValidateCoverageParamsType,
): Promise<CoverageMetrics> {
  const { roster, staffRequirements } = params;

  const shifts = roster.roster || [];
  const coveredStations: Record<string, number> = {};
  const uncoveredSlots: CoverageMetrics['uncoveredSlots'] = [];
  const warnings: string[] = [];

  // Count shifts by station
  for (const shift of shifts) {
    const stationKey = shift.stationId || shift.station || 'unknown';
    coveredStations[stationKey] = (coveredStations[stationKey] || 0) + 1;
  }

  // For each requirement, verify coverage by day
  // Get dates from roster or use a default week
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
    
    // If we have specific dates, create gaps by day
    if (rosterDays.length > 0) {
      // Verify coverage by day
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
      // Fallback: use current date if no weekStart
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
          `Insufficient coverage for ${req.stationId} (${req.periodType}): ~${averagePerDay}/${req.requiredStaff}`,
        );
      }
    }
  }

  // Calculate coverage score
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
