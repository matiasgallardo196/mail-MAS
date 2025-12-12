import { In, Between } from 'typeorm';
import { z } from 'zod';
import { connectionSource } from '../../config/typeorm';
import { Employee } from '../../modules/employees/entities/employee.entity';
import { EmployeeAvailability } from '../../modules/employees/entities/employee-availability.entity';
import { SchedulingPolicy, PolicyScope } from '../../modules/scheduling/entities/scheduling-policy.entity';
import { EmploymentTypeHoursPolicy } from '../../modules/scheduling/entities/employment-type-hours-policy.entity';
import {
  EmployeeAvailabilitySchema,
  EmployeeContractSchema,
  EmploymentTypeEnum,
  EmployeeSkillSchema,
} from '../../shared/schemas/employee.schema';
import type { EmployeeContract, EmployeeAvailability as Availability, EmployeeSkill } from '../../shared/types/employee';
import { resolveStoreId } from './store.tools';

const GetContractsInput = z.object({
  storeId: z.string(),
  employeeIds: z.array(z.string().min(1)),
});

const GetAvailabilityInput = z.object({
  storeId: z.string(),
  startDate: z.string(), // ISO date
  endDate: z.string(), // ISO date
  employeeIds: z.array(z.string().min(1)),
});

const GetSkillsInput = z.object({
  employeeIds: z.array(z.string().min(1)),
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
  const globalPolicy = await repo.findOne({
    where: { scope: PolicyScope.GLOBAL },
    order: { createdAt: 'DESC' as any },
  });
  return globalPolicy;
}

export const employeeTools = {
  getEmployeeContracts: {
    name: 'get_employee_contracts',
    description: 'Obtiene contratos (employment type, horas máx/semana, min rest) desde la DB',
    inputSchema: GetContractsInput,
    outputSchema: z.array(EmployeeContractSchema),
    execute: async ({ storeId, employeeIds }: z.infer<typeof GetContractsInput>): Promise<EmployeeContract[]> => {
      const resolvedStoreId = await resolveStoreId(storeId);
      const ds = await getDataSource();
      const employeeRepo = ds.getRepository(Employee);
      // resolvePolicy needs to be updated or we just pass the resolved ID if resolvePolicy expects raw ID
      // But looking at employee.tools.ts resolvePolicy:
      /* 
         async function resolvePolicy(storeId: string): Promise<SchedulingPolicy | null> {
           const ds = await getDataSource();
           const repo = ds.getRepository(SchedulingPolicy);
           const byStore = await repo.findOne({
             where: { store: { id: storeId }, scope: PolicyScope.STORE },
             ...
           });
           ...
         }
      */
      // It uses id directly. So passing resolvedStoreId is correct.
      const policy = await resolvePolicy(resolvedStoreId);
      const hoursPolicyRepo = ds.getRepository(EmploymentTypeHoursPolicy);
      const hoursPolicies = policy
        ? await hoursPolicyRepo.find({ where: { policy: { id: policy.id } } })
        : [];

      const employees = await employeeRepo.find({
        where: { id: In(employeeIds) },
      });

      return employees.map((emp) => {
        const hoursRule = hoursPolicies.find((rule) => rule.employmentType === emp.employmentType);
        return EmployeeContractSchema.parse({
          employeeId: emp.id,
          employmentType: emp.employmentType as z.infer<typeof EmploymentTypeEnum>,
          maxHoursWeek: hoursRule?.maxHoursWeek ? Number(hoursRule.maxHoursWeek) : null,
          minHoursBetweenShifts: policy?.minHoursBetweenShifts ? Number(policy.minHoursBetweenShifts) : null,
          baseRate: null,
        });
      });
    },
  },

  getEmployeeAvailability: {
    name: 'get_employee_availability',
    description: 'Obtiene disponibilidad declarada y shift codes desde la DB',
    inputSchema: GetAvailabilityInput,
    outputSchema: z.array(EmployeeAvailabilitySchema),
    execute: async ({
      storeId,
      startDate,
      endDate,
      employeeIds,
    }: z.infer<typeof GetAvailabilityInput>): Promise<Availability[]> => {
      const resolvedStoreId = await resolveStoreId(storeId);
      const ds = await getDataSource();
      const availabilityRepo = ds.getRepository(EmployeeAvailability);
      const records = await availabilityRepo.find({
        where: {
          store: { id: resolvedStoreId },
          employee: employeeIds.length > 0 ? { id: In(employeeIds) } : undefined,
          date: Between(new Date(startDate), new Date(endDate)),
        },
        relations: ['shiftCode', 'station', 'employee', 'store'],
      });

      return records.map((rec) => {
        let d: Date;
        try {
          d = new Date(rec.date);
          if (isNaN(d.getTime())) throw new Error('Invalid Date');
        } catch {
          d = new Date(); // Fallback
        }

        return EmployeeAvailabilitySchema.parse({
          employeeId: rec.employee.id,
          storeId: rec.store?.id,
          date: d.toISOString().split('T')[0],
          startTime: rec.shiftCode?.startTime ?? null,
          endTime: rec.shiftCode?.endTime ?? null,
          shiftCode: rec.shiftCode?.code ?? null,
          stationId: rec.station?.id ?? null,
        });
      });
    },
  },

  getEmployeeSkills: {
    name: 'get_employee_skills',
    description: 'Obtiene skills desde la DB (por ahora roles y default station)',
    inputSchema: GetSkillsInput,
    outputSchema: z.array(EmployeeSkillSchema),
    execute: async ({ employeeIds }: z.infer<typeof GetSkillsInput>): Promise<EmployeeSkill[]> => {
      const ds = await getDataSource();
      const employeeRepo = ds.getRepository(Employee);
      const employees = await employeeRepo.find({
        where: { id: In(employeeIds) },
        relations: ['defaultStation'],
      });
      return employees.map((emp) =>
        EmployeeSkillSchema.parse({
          employeeId: emp.id,
          skills: [emp.role, emp.defaultStation?.name].filter(Boolean) as string[],
        }),
      );
    },
  },
};
