import { z } from 'zod';

export const StoreForecastSchema = z.object({
  hour: z.string(),
  demand: z.number(),
});

export const StoreSchema = z.object({
  storeId: z.string(),
  openingHours: z.string().optional(),
  forecast: z.array(StoreForecastSchema),
});

export type Store = z.infer<typeof StoreSchema>;

export const getStore = async (storeId: string): Promise<Store> => {
  // Simple mocked forecast data
  return {
    storeId,
    openingHours: '06:00-23:00',
    forecast: [
      { hour: '09:00', demand: 10 },
      { hour: '12:00', demand: 20 },
      { hour: '18:00', demand: 15 },
    ],
  };
};
