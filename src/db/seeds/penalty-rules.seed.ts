// Penalty rules based on Restaurant Industry Award 2020 (Fair Work AU)
export const penaltyRulesSeed = [
  // Saturday
  {
    dayOfWeek: 6,
    startTime: null,
    endTime: null,
    employmentType: null,
    multiplier: 1.25,
    isPublicHoliday: false,
    description: 'Saturday base penalty',
  },
  // Sunday
  {
    dayOfWeek: 0,
    startTime: null,
    endTime: null,
    employmentType: null,
    multiplier: 1.5,
    isPublicHoliday: false,
    description: 'Sunday base penalty',
  },
  // Public holiday
  {
    dayOfWeek: null,
    startTime: null,
    endTime: null,
    employmentType: null,
    multiplier: 2.25,
    isPublicHoliday: true,
    description: 'Public holiday penalty',
  },
  // Evening 21:00-23:59
  {
    dayOfWeek: null,
    startTime: '21:00:00',
    endTime: '23:59:59',
    employmentType: null,
    multiplier: 1.15,
    isPublicHoliday: false,
    description: 'Evening penalty 21:00-23:59',
  },
  // Late night 00:00-06:00
  {
    dayOfWeek: null,
    startTime: '00:00:00',
    endTime: '06:00:00',
    employmentType: null,
    multiplier: 1.15,
    isPublicHoliday: false,
    description: 'Late night penalty 00:00-06:00',
  },
];

