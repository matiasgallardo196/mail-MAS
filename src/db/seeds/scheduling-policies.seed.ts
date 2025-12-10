import { PolicyScope } from '../../modules/scheduling/entities/scheduling-policy.entity';

export const schedulingPoliciesSeed = [
  {
    name: 'AU Default Policy',
    scope: PolicyScope.GLOBAL,
    storeCode: null,
    maxShiftsPerDay: 1,
    maxSegmentsPerShift: 2,
    minHoursPerShift: 3,
    maxGapBetweenSegments: 3,
    minHoursBetweenShifts: 10,
    maxConsecutiveWorkingDays: 6,
    monthlyStandardHours: 152,
    fullTimeRatio: 0.35,
    partTimeCasualRatio: 0.65,
    minStaffOnDuty: 2,
    minFullTimeOnDuty: 1,
    breakfastStart: '06:30',
    breakfastEnd: '11:00',
    closeServiceStart: '21:00',
    closeServiceEnd: '23:00',
    hardConstraintsEnabled: true,
    notes: 'Base Fair Work & McDonald’s AU roster rules',
  },
];
