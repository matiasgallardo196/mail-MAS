import { EmploymentType } from '../../common/enums/enums';

export const employmentTypeHoursSeed = [
  {
    policyName: 'AU Default Policy',
    employmentType: EmploymentType.FULL_TIME,
    minHoursWeek: 35,
    maxHoursWeek: 38,
  },
  {
    policyName: 'AU Default Policy',
    employmentType: EmploymentType.PART_TIME,
    minHoursWeek: 20,
    maxHoursWeek: 32,
  },
  {
    policyName: 'AU Default Policy',
    employmentType: EmploymentType.CASUAL,
    minHoursWeek: 8,
    maxHoursWeek: 24,
  },
];
