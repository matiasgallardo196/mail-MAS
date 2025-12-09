import { StoreLocationType } from '../../common/enums/enums';

export const storesSeed = [
  {
    code: 'Store_1',
    name: 'CBD Core Area',
    locationType: StoreLocationType.CBD_CORE,
    revenueLevel: 'High',
    storeType: 'Non-24H',
    openingTime: '06:30',
    closingTime: '23:00',
  },
  {
    code: 'Store_2',
    name: 'Suburban Residential',
    locationType: StoreLocationType.SUBURBAN_RESIDENTIAL,
    revenueLevel: 'Medium',
    storeType: 'Non-24H',
    openingTime: '07:00',
    closingTime: '22:00',
  },
];

