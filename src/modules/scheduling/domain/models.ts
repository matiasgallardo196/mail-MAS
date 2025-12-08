export interface StoreConfig {
  id: string;
  name: string;
  timezone: string;
  openTime: string; // Format: "HH:mm"
  closeTime: string; // Format: "HH:mm"
  weekendDemandMultiplier: number; // e.g., 1.2 for +20% staff on weekends
  timeSlotMinutes: number; // e.g., 30
}

export type StationName =
  | 'KITCHEN'
  | 'MCCAFE'
  | 'FRONT_COUNTER'
  | 'DRIVE_THRU'
  | 'MANAGER'
  | string;

export interface Station {
  id: string;
  name: StationName;
  minSkillLevel: number; // 0-3
}

export interface DemandSlot {
  start: Date;
  end: Date;
  requiredByStation: Record<string, number>; // stationId -> minimum number of people
}

export type ContractType = 'FULL_TIME' | 'PART_TIME' | 'CASUAL';

export type ShiftPreference = 'MORNING' | 'AFTERNOON' | 'NIGHT';

export interface AvailabilitySlot {
  start: string; // Format: "HH:mm"
  end: string; // Format: "HH:mm"
}

export interface EmployeeProfile {
  id: string;
  name: string;
  contractType: ContractType;
  minHoursPerWeek?: number;
  maxHoursPerWeek: number;
  skills: string[]; // e.g., ['KITCHEN', 'FRONT_COUNTER']
  preferredShifts?: ShiftPreference[];
  availability: {
    [weekday: string]: AvailabilitySlot[]; // weekday: 'MON', 'TUE', etc.
  };
}

export interface ShiftAssignment {
  employeeId: string;
  stationId: string;
  start: Date;
  end: Date;
}

export interface Schedule {
  storeId: string;
  startDate: Date;
  endDate: Date;
  assignments: ShiftAssignment[];
}

export type IssueType = 'HARD_CONSTRAINT' | 'SOFT_CONSTRAINT';

export interface ScheduleIssue {
  type: IssueType;
  code: string; // e.g., 'INSUFFICIENT_REST', 'UNDER_MIN_HOURS'
  description: string;
  assignmentIds?: string[];
}

export interface ScheduleWithIssues {
  schedule: Schedule;
  issues: ScheduleIssue[];
  summary?: string;
}

export interface GenerateRosterResult {
  schedule: Schedule;
  issues: ScheduleIssue[];
  summary: string;
}

