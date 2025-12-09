import { PeriodType } from '../../common/enums/enums';

export const staffRequirementsSeed = [
  // Store_1 - Normal
  { storeCode: 'Store_1', periodType: PeriodType.NORMAL, stationCode: 'KITCHEN', requiredStaff: 6 },
  { storeCode: 'Store_1', periodType: PeriodType.NORMAL, stationCode: 'COUNTER', requiredStaff: 5 },
  { storeCode: 'Store_1', periodType: PeriodType.NORMAL, stationCode: 'MCCAFE', requiredStaff: 3 },
  { storeCode: 'Store_1', periodType: PeriodType.NORMAL, stationCode: 'DESSERT', requiredStaff: 2 },
  { storeCode: 'Store_1', periodType: PeriodType.NORMAL, stationCode: 'OFFLINE_DESSERT', requiredStaff: 1 },

  // Store_1 - Peak
  { storeCode: 'Store_1', periodType: PeriodType.PEAK, stationCode: 'KITCHEN', requiredStaff: 8 },
  { storeCode: 'Store_1', periodType: PeriodType.PEAK, stationCode: 'COUNTER', requiredStaff: 6 },
  { storeCode: 'Store_1', periodType: PeriodType.PEAK, stationCode: 'MCCAFE', requiredStaff: 4 },
  { storeCode: 'Store_1', periodType: PeriodType.PEAK, stationCode: 'DESSERT', requiredStaff: 3 },
  { storeCode: 'Store_1', periodType: PeriodType.PEAK, stationCode: 'OFFLINE_DESSERT', requiredStaff: 2 },

  // Store_2 - Normal
  { storeCode: 'Store_2', periodType: PeriodType.NORMAL, stationCode: 'KITCHEN', requiredStaff: 3 },
  { storeCode: 'Store_2', periodType: PeriodType.NORMAL, stationCode: 'COUNTER', requiredStaff: 3 },

  // Store_2 - Peak
  { storeCode: 'Store_2', periodType: PeriodType.PEAK, stationCode: 'KITCHEN', requiredStaff: 4 },
  { storeCode: 'Store_2', periodType: PeriodType.PEAK, stationCode: 'COUNTER', requiredStaff: 3 },
];

