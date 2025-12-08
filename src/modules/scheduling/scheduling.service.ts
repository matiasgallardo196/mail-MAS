import { Injectable } from '@nestjs/common';
import { StoreDemandAgent } from './agents/store-demand.agent';
import { StaffProfileAgent } from './agents/staff-profile.agent';
import { SchedulerAgent } from './agents/scheduler.agent';
import { ComplianceAgent } from './agents/compliance.agent';
import { LlmService } from '../llm/llm.service';
import {
  ScheduleWithIssues,
  EmployeeProfile,
  DemandSlot,
  Schedule,
  ScheduleIssue,
  GenerateRosterResult,
} from './domain/models';

@Injectable()
export class SchedulingService {
  constructor(
    private readonly storeDemandAgent: StoreDemandAgent,
    private readonly staffProfileAgent: StaffProfileAgent,
    private readonly schedulerAgent: SchedulerAgent,
    private readonly complianceAgent: ComplianceAgent,
    private readonly llmService: LlmService,
  ) {}

  /**
   * Generates a roster by orchestrating the MAS pipeline:
   * 1. Store Demand Agent - generates demand slots
   * 2. Staff Profile Agent - retrieves employee profiles
   * 3. Scheduler Agent - assigns employees to shifts
   * 4. Compliance Agent - validates the schedule
   * 5. Generate summary using LLM (if available) or simple fallback
   */
  async generateRoster(
    storeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<GenerateRosterResult> {
    // Step 1: Generate demand slots
    const demandSlots: DemandSlot[] =
      await this.runStoreDemandAgent(storeId, startDate, endDate);

    // Step 2: Get employee profiles
    const employeeProfiles: EmployeeProfile[] =
      await this.runStaffProfileAgent(storeId);

    // Step 3: Generate schedule
    const schedule: Schedule = await this.runSchedulerAgent(
      storeId,
      startDate,
      endDate,
      demandSlots,
      employeeProfiles,
    );

    // Step 4: Validate compliance
    const employeeMap = new Map<string, EmployeeProfile>();
    for (const emp of employeeProfiles) {
      employeeMap.set(emp.id, emp);
    }

    const scheduleWithIssues = await this.runComplianceAgent(
      schedule,
      employeeMap,
    );

    // Step 5: Generate summary using LLM (if available) or simple fallback
    const summary = await this.buildSummaryWithLlm(
      schedule,
      scheduleWithIssues.issues,
      employeeProfiles.length,
    );

    return {
      schedule,
      issues: scheduleWithIssues.issues,
      summary,
    };
  }

  /**
   * Runs the Store Demand Agent to generate demand slots
   */
  private async runStoreDemandAgent(
    storeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DemandSlot[]> {
    return this.storeDemandAgent.generateDemandSlots(
      storeId,
      startDate,
      endDate,
    );
  }

  /**
   * Runs the Staff Profile Agent to retrieve employee profiles
   */
  private async runStaffProfileAgent(
    storeId: string,
  ): Promise<EmployeeProfile[]> {
    return this.staffProfileAgent.getEmployeeProfiles(storeId);
  }

  /**
   * Runs the Scheduler Agent to assign employees to shifts
   */
  private async runSchedulerAgent(
    storeId: string,
    startDate: Date,
    endDate: Date,
    demandSlots: DemandSlot[],
    employeeProfiles: EmployeeProfile[],
  ): Promise<Schedule> {
    return this.schedulerAgent.generateSchedule(
      storeId,
      startDate,
      endDate,
      demandSlots,
      employeeProfiles,
    );
  }

  /**
   * Runs the Compliance Agent to validate the schedule
   */
  private async runComplianceAgent(
    schedule: Schedule,
    employeeProfiles: Map<string, EmployeeProfile>,
  ): Promise<ScheduleWithIssues> {
    return this.complianceAgent.validateSchedule(schedule, employeeProfiles);
  }

  /**
   * Builds a summary of the schedule using LLM if available, otherwise uses a simple fallback.
   * @param schedule The generated schedule
   * @param issues The list of issues found
   * @param employeeCount The number of employees
   * @returns A summary string
   */
  private async buildSummaryWithLlm(
    schedule: Schedule,
    issues: ScheduleIssue[],
    employeeCount: number,
  ): Promise<string> {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      // Simple fallback summary
      const hardIssues = issues.filter((i) => i.type === 'HARD_CONSTRAINT');
      const softIssues = issues.filter((i) => i.type === 'SOFT_CONSTRAINT');
      return `Generated roster for ${employeeCount} employees between ${schedule.startDate.toISOString().split('T')[0]} and ${schedule.endDate.toISOString().split('T')[0]} with ${issues.length} issues detected.`;
    }

    try {
      // Build prompt with schedule information
      const startDateStr = schedule.startDate.toISOString().split('T')[0];
      const endDateStr = schedule.endDate.toISOString().split('T')[0];
      const hardIssues = issues.filter((i) => i.type === 'HARD_CONSTRAINT');
      const softIssues = issues.filter((i) => i.type === 'SOFT_CONSTRAINT');

      // Count issue codes frequency
      const issueCodeCounts = new Map<string, number>();
      for (const issue of issues) {
        issueCodeCounts.set(
          issue.code,
          (issueCodeCounts.get(issue.code) || 0) + 1,
        );
      }
      const mostFrequentCodes = Array.from(issueCodeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([code]) => code)
        .join(', ');

      const prompt = `Generate a concise summary (2-3 sentences) for a restaurant roster schedule:
- Date range: ${startDateStr} to ${endDateStr}
- Total assignments: ${schedule.assignments.length}
- Employees: ${employeeCount}
- Issues found: ${issues.length} total (${hardIssues.length} hard constraints, ${softIssues.length} soft constraints)
- Most frequent issue codes: ${mostFrequentCodes || 'none'}

Provide a clear, professional summary in English.`;

      const llmSummary = await this.llmService.complete(prompt);

      // Fallback to simple summary if LLM returns empty
      if (!llmSummary || llmSummary.trim().length === 0) {
        return `Generated roster for ${employeeCount} employees between ${startDateStr} and ${endDateStr} with ${issues.length} issues detected.`;
      }

      return llmSummary.trim();
    } catch (error) {
      // Fallback to simple summary on error
      const startDateStr = schedule.startDate.toISOString().split('T')[0];
      const endDateStr = schedule.endDate.toISOString().split('T')[0];
      return `Generated roster for ${employeeCount} employees between ${startDateStr} and ${endDateStr} with ${issues.length} issues detected.`;
    }
  }
}

