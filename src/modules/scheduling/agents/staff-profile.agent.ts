import { Injectable } from '@nestjs/common';
import { EmployeeProfile, ContractType } from '../domain/models';

@Injectable()
export class StaffProfileAgent {
  /**
   * Retrieves employee profiles for a given store.
   * This is a stub implementation that returns fictional employee profiles.
   * TODO: Integrate with real employee database or HR system
   */
  async getEmployeeProfiles(storeId: string): Promise<EmployeeProfile[]> {
    // Generate 5-10 fictional employees with different skills and contracts
    const employees: EmployeeProfile[] = [
      {
        id: 'emp-001',
        name: 'John Smith',
        contractType: 'FULL_TIME' as ContractType,
        minHoursPerWeek: 38,
        maxHoursPerWeek: 40,
        skills: ['KITCHEN', 'FRONT_COUNTER', 'MANAGER'],
        preferredShifts: ['MORNING', 'AFTERNOON'],
        availability: {
          MON: [{ start: '06:00', end: '18:00' }],
          TUE: [{ start: '06:00', end: '18:00' }],
          WED: [{ start: '06:00', end: '18:00' }],
          THU: [{ start: '06:00', end: '18:00' }],
          FRI: [{ start: '06:00', end: '18:00' }],
        },
      },
      {
        id: 'emp-002',
        name: 'Sarah Johnson',
        contractType: 'PART_TIME' as ContractType,
        minHoursPerWeek: 20,
        maxHoursPerWeek: 25,
        skills: ['FRONT_COUNTER', 'DRIVE_THRU'],
        preferredShifts: ['AFTERNOON'],
        availability: {
          MON: [{ start: '12:00', end: '20:00' }],
          TUE: [{ start: '12:00', end: '20:00' }],
          WED: [{ start: '12:00', end: '20:00' }],
          THU: [{ start: '12:00', end: '20:00' }],
        },
      },
      {
        id: 'emp-003',
        name: 'Mike Davis',
        contractType: 'CASUAL' as ContractType,
        maxHoursPerWeek: 30,
        skills: ['KITCHEN'],
        preferredShifts: ['NIGHT'],
        availability: {
          FRI: [{ start: '17:00', end: '23:00' }],
          SAT: [{ start: '17:00', end: '23:00' }],
          SUN: [{ start: '17:00', end: '23:00' }],
        },
      },
      {
        id: 'emp-004',
        name: 'Emma Wilson',
        contractType: 'PART_TIME' as ContractType,
        minHoursPerWeek: 22,
        maxHoursPerWeek: 28,
        skills: ['MCCAFE', 'FRONT_COUNTER'],
        preferredShifts: ['MORNING', 'AFTERNOON'],
        availability: {
          MON: [{ start: '06:00', end: '14:00' }],
          TUE: [{ start: '06:00', end: '14:00' }],
          WED: [{ start: '06:00', end: '14:00' }],
          THU: [{ start: '06:00', end: '14:00' }],
          FRI: [{ start: '06:00', end: '14:00' }],
          SAT: [{ start: '08:00', end: '16:00' }],
        },
      },
      {
        id: 'emp-005',
        name: 'David Brown',
        contractType: 'FULL_TIME' as ContractType,
        minHoursPerWeek: 38,
        maxHoursPerWeek: 40,
        skills: ['KITCHEN', 'DRIVE_THRU'],
        preferredShifts: ['AFTERNOON', 'NIGHT'],
        availability: {
          MON: [{ start: '12:00', end: '23:00' }],
          TUE: [{ start: '12:00', end: '23:00' }],
          WED: [{ start: '12:00', end: '23:00' }],
          THU: [{ start: '12:00', end: '23:00' }],
          FRI: [{ start: '12:00', end: '23:00' }],
        },
      },
      {
        id: 'emp-006',
        name: 'Lisa Anderson',
        contractType: 'CASUAL' as ContractType,
        maxHoursPerWeek: 25,
        skills: ['FRONT_COUNTER', 'MCCAFE'],
        preferredShifts: ['MORNING'],
        availability: {
          SAT: [{ start: '06:00', end: '14:00' }],
          SUN: [{ start: '06:00', end: '14:00' }],
        },
      },
      {
        id: 'emp-007',
        name: 'Tom Martinez',
        contractType: 'PART_TIME' as ContractType,
        minHoursPerWeek: 18,
        maxHoursPerWeek: 24,
        skills: ['KITCHEN', 'DRIVE_THRU'],
        preferredShifts: ['AFTERNOON', 'NIGHT'],
        availability: {
          TUE: [{ start: '14:00', end: '22:00' }],
          WED: [{ start: '14:00', end: '22:00' }],
          THU: [{ start: '14:00', end: '22:00' }],
          FRI: [{ start: '14:00', end: '22:00' }],
          SAT: [{ start: '14:00', end: '22:00' }],
        },
      },
      {
        id: 'emp-008',
        name: 'Amy Taylor',
        contractType: 'CASUAL' as ContractType,
        maxHoursPerWeek: 20,
        skills: ['FRONT_COUNTER'],
        preferredShifts: ['MORNING'],
        availability: {
          MON: [{ start: '08:00', end: '12:00' }],
          WED: [{ start: '08:00', end: '12:00' }],
          FRI: [{ start: '08:00', end: '12:00' }],
        },
      },
    ];

    return employees;
  }
}

