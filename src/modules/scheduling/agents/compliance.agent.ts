import { Injectable } from '@nestjs/common';
import {
  Schedule,
  ScheduleIssue,
  ScheduleWithIssues,
  ShiftAssignment,
  EmployeeProfile,
} from '../domain/models';
import {
  MIN_REST_HOURS_BETWEEN_SHIFTS,
  WEEKLY_HOURS_BY_CONTRACT,
} from '../domain/constraints';

@Injectable()
export class ComplianceAgent {
  /**
   * Validates a schedule against hard and soft constraints, generating issues.
   * TODO: Enhance with more comprehensive constraint checking
   * TODO: Use LLM to prioritize issues and suggest resolutions
   */
  async validateSchedule(
    schedule: Schedule,
    employeeProfiles: Map<string, EmployeeProfile>,
  ): Promise<ScheduleWithIssues> {
    const issues: ScheduleIssue[] = [];

    // Group assignments by employee
    const assignmentsByEmployee = new Map<string, ShiftAssignment[]>();
    for (const assignment of schedule.assignments) {
      if (!assignmentsByEmployee.has(assignment.employeeId)) {
        assignmentsByEmployee.set(assignment.employeeId, []);
      }
      assignmentsByEmployee.get(assignment.employeeId)!.push(assignment);
    }

    // Check each employee's assignments
    for (const [employeeId, assignments] of assignmentsByEmployee.entries()) {
      const employee = employeeProfiles.get(employeeId);
      if (!employee) continue;

      // Sort assignments by start time
      const sortedAssignments = [...assignments].sort(
        (a, b) => a.start.getTime() - b.start.getTime(),
      );

      // Check for overlapping shifts and minimum rest between shifts
      for (let i = 0; i < sortedAssignments.length - 1; i++) {
        const current = sortedAssignments[i];
        const next = sortedAssignments[i + 1];

        // Check for overlaps first (current.end > next.start means overlap)
        if (current.end.getTime() > next.start.getTime()) {
          issues.push({
            type: 'HARD_CONSTRAINT',
            code: 'OVERLAPPING_SHIFTS',
            description: `Employee ${employeeId} has overlapping shifts`,
            assignmentIds: [
              `${current.employeeId}-${current.start.getTime()}`,
              `${next.employeeId}-${next.start.getTime()}`,
            ],
          });
          // Skip rest calculation for overlapping shifts
          continue;
        }

        // Only calculate rest if current.end <= next.start (no overlap)
        const restMs = next.start.getTime() - current.end.getTime();
        const restHours = restMs / (1000 * 60 * 60);

        if (restHours < MIN_REST_HOURS_BETWEEN_SHIFTS) {
          issues.push({
            type: 'HARD_CONSTRAINT',
            code: 'INSUFFICIENT_REST',
            description: `Employee ${employeeId}: ${restHours.toFixed(1)}h rest between shifts (minimum: ${MIN_REST_HOURS_BETWEEN_SHIFTS}h)`,
            assignmentIds: [
              `${current.employeeId}-${current.start.getTime()}`,
              `${next.employeeId}-${next.start.getTime()}`,
            ],
          });
        }
      }

      // Check weekly hours
      const totalHours = this.calculateTotalHours(sortedAssignments);
      const contractLimits = WEEKLY_HOURS_BY_CONTRACT[employee.contractType];

      if (totalHours > contractLimits.max) {
        issues.push({
          type: 'HARD_CONSTRAINT',
          code: 'OVER_MAX_WEEKLY_HOURS',
          description: `Employee ${employeeId} (${employee.contractType}): ${totalHours.toFixed(1)}h exceeds max ${contractLimits.max}h`,
          assignmentIds: assignments.map(
            (a) => `${a.employeeId}-${a.start.getTime()}`,
          ),
        });
      }

      if (employee.minHoursPerWeek && totalHours < employee.minHoursPerWeek) {
        issues.push({
          type: 'SOFT_CONSTRAINT',
          code: 'UNDER_MIN_HOURS',
          description: `Employee ${employeeId} (${employee.contractType}): ${totalHours.toFixed(1)}h below minimum ${employee.minHoursPerWeek}h`,
          assignmentIds: assignments.map(
            (a) => `${a.employeeId}-${a.start.getTime()}`,
          ),
        });
      }
    }

    return {
      schedule,
      issues,
    };
  }

  /**
   * Calculates total hours from assignments
   */
  private calculateTotalHours(assignments: ShiftAssignment[]): number {
    let totalHours = 0;
    for (const assignment of assignments) {
      const duration =
        (assignment.end.getTime() - assignment.start.getTime()) /
        (1000 * 60 * 60);
      totalHours += duration;
    }
    return totalHours;
  }
}

