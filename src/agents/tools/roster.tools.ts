import { z } from 'zod';

export const GenerateInitialRosterParams = z.object({
  storeId: z.string(),
  weekStart: z.string(),
  employeeIds: z.array(z.string()).optional(),
});

export type GenerateInitialRosterParamsType = z.infer<typeof GenerateInitialRosterParams>;

export async function generateInitialRoster(params: GenerateInitialRosterParamsType) {
  // Crear un roster simple: asigna a cada empleado un turno de 09:00 a 17:00 para el primer día
  const { storeId, weekStart, employeeIds = [] } = params;
  const roster = employeeIds.map((id, idx) => ({
    employeeId: id,
    start: `${weekStart}T09:00:00.000Z`,
    end: `${weekStart}T17:00:00.000Z`,
    station: 'general',
    isPeak: false,
  }));

  return {
    storeId,
    weekStart,
    roster,
    generatedAt: new Date().toISOString(),
  };
}
