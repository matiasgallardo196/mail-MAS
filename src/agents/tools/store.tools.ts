import { Between } from 'typeorm';
import { z } from 'zod';
import { connectionSource } from '../../config/typeorm';
import { Store } from '../../modules/stores/entities/store.entity';
import { StoreStaffRequirement } from '../../modules/stores/entities/store-staff-requirement.entity';
import { PeriodType } from '../../common/enums/enums';
import { SchedulingPolicy, PolicyScope } from '../../modules/scheduling/entities/scheduling-policy.entity';
import { SchedulingPolicySchema } from '../../shared/schemas/policy.schema';

const StoreHoursSchema = z.object({
  storeId: z.string(),
  openingTime: z.string().nullable().optional(),
  closingTime: z.string().nullable().optional(),
});

const StoreRequirementsSchema = z.array(
  z.object({
    stationId: z.string(),
    stationCode: z.string().optional(),
    periodType: z.nativeEnum(PeriodType),
    requiredStaff: z.number(),
  }),
);

const GetStoreInput = z.object({
  storeId: z.string(),
});

const GetStorePolicyInput = z.object({
  storeId: z.string(),
});

const GetForecastInput = z.object({
  storeId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
});

async function getDataSource() {
  if (!connectionSource.isInitialized) {
    await connectionSource.initialize();
  }
  return connectionSource;
}

async function resolvePolicy(storeId: string): Promise<SchedulingPolicy | null> {
  const ds = await getDataSource();
  const repo = ds.getRepository(SchedulingPolicy);
  const byStore = await repo.findOne({
    where: { store: { id: storeId }, scope: PolicyScope.STORE },
    order: { createdAt: 'DESC' as any },
  });
  if (byStore) return byStore;
  return repo.findOne({ where: { scope: PolicyScope.GLOBAL }, order: { createdAt: 'DESC' as any } });
}

export const storeTools = {
  getStoreHours: {
    name: 'get_store_hours',
    description: 'Obtiene horarios de apertura/cierre desde la DB',
    inputSchema: GetStoreInput,
    outputSchema: StoreHoursSchema,
    execute: async ({ storeId }: z.infer<typeof GetStoreInput>) => {
      const ds = await getDataSource();
      const repo = ds.getRepository(Store);
      const store = await repo.findOne({ where: { id: storeId } });
      if (!store) {
        throw new Error(`Store ${storeId} no encontrada`);
      }
      return StoreHoursSchema.parse({
        storeId,
        openingTime: store.openingTime ?? null,
        closingTime: store.closingTime ?? null,
      });
    },
  },

  getStoreStaffRequirements: {
    name: 'get_store_staff_requirements',
    description: 'Requerimientos de staff por estación y periodo desde DB',
    inputSchema: GetStoreInput,
    outputSchema: StoreRequirementsSchema,
    execute: async ({ storeId }: z.infer<typeof GetStoreInput>) => {
      const ds = await getDataSource();
      const repo = ds.getRepository(StoreStaffRequirement);
      const requirements = await repo.find({
        where: { store: { id: storeId } },
        relations: ['station', 'store'],
      });
      return StoreRequirementsSchema.parse(
        requirements.map((req) => ({
          stationId: req.station.id,
          stationCode: req.station.code, // Added for skill matching
          periodType: req.periodType,
          requiredStaff: req.requiredStaff,
        })),
      );
    },
  },

  getStorePolicy: {
    name: 'get_store_policy',
    description: 'Obtiene la policy de scheduling (scope store o global) desde la DB',
    inputSchema: GetStorePolicyInput,
    outputSchema: SchedulingPolicySchema.nullable(),
    execute: async ({ storeId }: z.infer<typeof GetStorePolicyInput>) => {
      const policy = await resolvePolicy(storeId);
      if (!policy) return null;
      return SchedulingPolicySchema.parse({
        id: policy.id,
        scope: policy.scope,
        storeId: policy.store?.id ?? null,
        minHoursBetweenShifts: Number(policy.minHoursBetweenShifts),
        maxShiftsPerDay: policy.maxShiftsPerDay ?? null,
        maxConsecutiveWorkingDays: policy.maxConsecutiveWorkingDays ?? null,
        monthlyStandardHours: Number(policy.monthlyStandardHours),
      });
    },
  },

  getStoreForecast: {
    name: 'get_store_forecast',
    description: 'Placeholder: forecasting no implementado; retorna vacío si DB no lo provee',
    inputSchema: GetForecastInput,
    outputSchema: z.array(
      z.object({
        hour: z.string(),
        demand: z.number(),
      }),
    ),
    execute: async ({ startDate, endDate }: z.infer<typeof GetForecastInput>) => {
      // No hay tabla de forecast definida aún. Retornar vacío para forzar fail-safe en capas superiores.
      return [];
    },
  },
};

// Compat helper for legacy callers (returns minimal structure, no mocks)
export async function getStore(storeId: string) {
  const hours = await storeTools.getStoreHours.execute({ storeId });
  return {
    storeId,
    openingHours:
      hours.openingTime && hours.closingTime ? `${hours.openingTime}-${hours.closingTime}` : undefined,
    forecast: await storeTools.getStoreForecast.execute({
      storeId,
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
    }),
  };
}
