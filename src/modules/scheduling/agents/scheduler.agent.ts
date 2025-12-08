import { Injectable } from '@nestjs/common';
import {
  DemandSlot,
  EmployeeProfile,
  Schedule,
  ShiftAssignment,
} from '../domain/models';
import {
  MIN_REST_HOURS_BETWEEN_SHIFTS,
  MIN_SHIFT_DURATION_BY_CONTRACT,
} from '../domain/constraints';

@Injectable()
export class SchedulerAgent {
  /**
   * Generates a schedule by assigning employees to demand slots using a greedy algorithm.
   * This is a simple stub implementation.
   * TODO: Enhance with more sophisticated algorithms (genetic, constraint programming, etc.)
   * TODO: Integrate LLM for conflict resolution and optimization suggestions
   */
  async generateSchedule(
    storeId: string,
    startDate: Date,
    endDate: Date,
    demandSlots: DemandSlot[],
    employeeProfiles: EmployeeProfile[],
  ): Promise<Schedule> {
    const assignments: ShiftAssignment[] = [];
    const employeeHours: Record<string, number> = {}; // Track hours per employee
    const employeeAssignments: Record<string, ShiftAssignment[]> = {}; // Track assignments per employee

    // Initialize tracking
    for (const emp of employeeProfiles) {
      employeeHours[emp.id] = 0;
      employeeAssignments[emp.id] = [];
    }

    // Sort demand slots by start time
    const sortedSlots = [...demandSlots].sort(
      (a, b) => a.start.getTime() - b.start.getTime(),
    );

    for (const slot of sortedSlots) {
      const slotDurationHours =
        (slot.end.getTime() - slot.start.getTime()) / (1000 * 60 * 60);

      // For each station requirement in this slot
      for (const [stationId, requiredCount] of Object.entries(
        slot.requiredByStation,
      )) {
        let assignedCount = 0;

        // Try to assign employees to this station
        for (const employee of employeeProfiles) {
          if (assignedCount >= requiredCount) break;

          // Check if employee has the required skill
          if (!employee.skills.includes(stationId)) continue;

          // Check if employee is available at this time
          if (!this.isEmployeeAvailable(employee, slot.start, slot.end)) {
            continue;
          }

          // Check if employee would exceed max hours
          const projectedHours = employeeHours[employee.id] + slotDurationHours;
          if (projectedHours > employee.maxHoursPerWeek) {
            continue;
          }

          // Check for overlapping shifts
          const existingAssignments = employeeAssignments[employee.id] ?? [];
          if (this.hasOverlap(existingAssignments, slot.start, slot.end)) {
            continue;
          }

          // Check minimum rest between shifts
          // TODO: The scheduler could try other employees or reorder assignments,
          // but for now if no employee is available with sufficient rest, the slot remains uncovered
          if (
            existingAssignments.length > 0 &&
            !this.hasMinimumRest(existingAssignments, slot.start)
          ) {
            continue;
          }

          // Check minimum shift duration
          const minShiftDuration =
            MIN_SHIFT_DURATION_BY_CONTRACT[employee.contractType];
          if (slotDurationHours < minShiftDuration) {
            // TODO: In future iterations, group contiguous slots to meet minimum shift duration.
            // For now, we reject shifts shorter than the minimum to avoid constraint violations.
            // This may result in some slots remaining uncovered, which should be addressed
            // in future improvements to the scheduling algorithm.
            continue;
          }

          // Assign the shift
          const newAssignment: ShiftAssignment = {
            employeeId: employee.id,
            stationId,
            start: slot.start,
            end: slot.end,
          };

          assignments.push(newAssignment);
          employeeAssignments[employee.id].push(newAssignment);
          employeeHours[employee.id] = projectedHours;
          assignedCount++;
        }
      }
    }

    return {
      storeId,
      startDate,
      endDate,
      assignments,
    };
  }

  /**
   * Checks if an employee is available during a given time slot
   */
  private isEmployeeAvailable(
    employee: EmployeeProfile,
    start: Date,
    end: Date,
  ): boolean {
    const weekday = this.getWeekdayAbbreviation(start.getDay());
    const availabilitySlots = employee.availability[weekday];

    if (!availabilitySlots || availabilitySlots.length === 0) {
      return false;
    }

    const startTime = this.formatTime(start);
    const endTime = this.formatTime(end);

    // Check if the shift time falls within any availability slot
    for (const slot of availabilitySlots) {
      if (startTime >= slot.start && endTime <= slot.end) {
        return true;
      }
    }

    return false;
  }

  /**
   * Gets weekday abbreviation (MON, TUE, etc.)
   */
  private getWeekdayAbbreviation(dayOfWeek: number): string {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return days[dayOfWeek];
  }

  /**
   * Formats a Date to "HH:mm" string
   */
  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Checks if a new shift overlaps with any existing assignments.
   * @param assignments Existing assignments for the employee
   * @param newStart Start time of the new shift
   * @param newEnd End time of the new shift
   * @returns true if there is an overlap, false otherwise
   */
  private hasOverlap(
    assignments: ShiftAssignment[],
    newStart: Date,
    newEnd: Date,
  ): boolean {
    return assignments.some(
      (a) =>
        newStart.getTime() < a.end.getTime() &&
        newEnd.getTime() > a.start.getTime(),
    );
  }

  /**
   * Checks if there is minimum rest time between the last assignment and the new shift start.
   * @param existingAssignments Previous assignments for the employee
   * @param newShiftStart Start time of the new shift to assign
   * @returns true if minimum rest is satisfied, false otherwise
   */
  private hasMinimumRest(
    existingAssignments: ShiftAssignment[],
    newShiftStart: Date,
  ): boolean {
    if (existingAssignments.length === 0) {
      return true;
    }

    // Find the assignment that ends closest to (but before) the new shift start
    const sortedAssignments = [...existingAssignments].sort(
      (a, b) => b.end.getTime() - a.end.getTime(),
    );

    for (const assignment of sortedAssignments) {
      // Only consider assignments that end before the new shift starts
      if (assignment.end.getTime() <= newShiftStart.getTime()) {
        const restHours =
          (newShiftStart.getTime() - assignment.end.getTime()) /
          (1000 * 60 * 60);

        return restHours >= MIN_REST_HOURS_BETWEEN_SHIFTS;
      }
    }

    // If no previous assignment ends before the new shift, it means there's an overlap
    // (which should have been caught by hasOverlap, but this is a safety check)
    return false;
  }
}

