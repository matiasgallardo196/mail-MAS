import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Station } from '../modules/stations/entities/station.entity';
import { Store } from '../modules/stores/entities/store.entity';
import { StoreStation } from '../modules/stores/entities/store-station.entity';
import { ShiftCode } from '../modules/scheduling/entities/shift-code.entity';
import { StoreStaffRequirement } from '../modules/stores/entities/store-staff-requirement.entity';
import { SchedulePeriod } from '../modules/scheduling/entities/schedule-period.entity';
import { Employee } from '../modules/employees/entities/employee.entity';
import { EmployeeAvailability } from '../modules/employees/entities/employee-availability.entity';
import { SchedulingPolicy } from '../modules/scheduling/entities/scheduling-policy.entity';
import { EmploymentTypeHoursPolicy } from '../modules/scheduling/entities/employment-type-hours-policy.entity';
import { PenaltyRule } from '../modules/scheduling/entities/penalty-rule.entity';
import { stationsSeed } from './seeds/stations.seed';
import { storesSeed } from './seeds/stores.seed';
import { storeStationsSeed } from './seeds/store-stations.seed';
import { shiftCodesSeed } from './seeds/shift-codes.seed';
import { staffRequirementsSeed } from './seeds/store-staff-requirements.seed';
import { schedulePeriodsSeed } from './seeds/schedule-periods.seed';
import { employeesSeed } from './seeds/employees.seed';
import { employeeAvailabilitySeed } from './seeds/employee-availability.seed';
import { schedulingPoliciesSeed } from './seeds/scheduling-policies.seed';
import { employmentTypeHoursSeed } from './seeds/employment-type-hours.seed';
import { penaltyRulesSeed } from './seeds/penalty-rules.seed';

export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(private readonly dataSource: DataSource) {}

  async seedAll(): Promise<void> {
    this.logger.log('Starting seeding process...');

    try {
      await this.seedStations();
      await this.seedStores();
      await this.seedSchedulingPolicies();
      await this.seedEmploymentTypeHoursPolicies();
      await this.seedPenaltyRules();
      await this.seedShiftCodes();
      await this.seedStoreStations();
      await this.seedStoreStaffRequirements();
      await this.seedSchedulePeriods();
      await this.seedEmployees();
      await this.seedEmployeeAvailability();

      this.logger.log('✅ Seeding completed successfully');
    } catch (error) {
      this.logger.error('❌ Error during seeding:', error);
      throw error;
    }
  }

  private async seedStations(): Promise<void> {
    this.logger.log(`Seeding ${stationsSeed.length} stations...`);
    const repository = this.dataSource.getRepository(Station);

    for (const stationData of stationsSeed) {
      const existing = await repository.findOne({
        where: { code: stationData.code },
      });

      if (!existing) {
        const station = repository.create(stationData);
        await repository.save(station);
        this.logger.log(`  ✓ Station created: ${stationData.code}`);
      } else {
        this.logger.log(`  ⊙ Station already exists: ${stationData.code}`);
      }
    }
  }

  private async seedStores(): Promise<void> {
    this.logger.log(`Seeding ${storesSeed.length} stores...`);
    const repository = this.dataSource.getRepository(Store);

    for (const storeData of storesSeed) {
      const existing = await repository.findOne({
        where: { code: storeData.code },
      });

      if (!existing) {
        const store = repository.create(storeData);
        await repository.save(store);
        this.logger.log(`  ✓ Store created: ${storeData.code}`);
      } else {
        this.logger.log(`  ⊙ Store already exists: ${storeData.code}`);
      }
    }
  }

  private async seedShiftCodes(): Promise<void> {
    this.logger.log(`Seeding ${shiftCodesSeed.length} shift codes...`);
    const repository = this.dataSource.getRepository(ShiftCode);

    for (const shiftCodeData of shiftCodesSeed) {
      const existing = await repository.findOne({
        where: { code: shiftCodeData.code },
      });

      if (!existing) {
        const shiftCode = repository.create({
          ...shiftCodeData,
          startTime: shiftCodeData.startTime || undefined,
          endTime: shiftCodeData.endTime || undefined,
        });
        await repository.save(shiftCode);
        this.logger.log(`  ✓ Shift code created: ${shiftCodeData.code}`);
      } else {
        this.logger.log(`  ⊙ Shift code already exists: ${shiftCodeData.code}`);
      }
    }
  }

  private async seedStoreStations(): Promise<void> {
    this.logger.log(`Seeding ${storeStationsSeed.length} Store-Station relationships...`);
    const storeRepository = this.dataSource.getRepository(Store);
    const stationRepository = this.dataSource.getRepository(Station);
    const storeStationRepository = this.dataSource.getRepository(StoreStation);

    for (const storeStationData of storeStationsSeed) {
      const store = await storeRepository.findOne({
        where: { code: storeStationData.storeCode },
      });

      const station = await stationRepository.findOne({
        where: { code: storeStationData.stationCode },
      });

      if (!store || !station) {
        this.logger.warn(
          `  ⚠ Store or station not found: ${storeStationData.storeCode} - ${storeStationData.stationCode}`,
        );
        continue;
      }

      const existing = await storeStationRepository.findOne({
        where: {
          store: { id: store.id },
          station: { id: station.id },
        },
      });

      if (!existing) {
        const storeStation = storeStationRepository.create({
          store,
          station,
          isEnabled: storeStationData.isEnabled,
        });
        await storeStationRepository.save(storeStation);
        this.logger.log(`  ✓ Relationship created: ${storeStationData.storeCode} - ${storeStationData.stationCode}`);
      } else {
        this.logger.log(`  ⊙ Relationship already exists: ${storeStationData.storeCode} - ${storeStationData.stationCode}`);
      }
    }
  }

  private async seedStoreStaffRequirements(): Promise<void> {
    this.logger.log(`Seeding ${staffRequirementsSeed.length} staff requirements...`);
    const storeRepository = this.dataSource.getRepository(Store);
    const stationRepository = this.dataSource.getRepository(Station);
    const requirementRepository = this.dataSource.getRepository(StoreStaffRequirement);

    for (const requirementData of staffRequirementsSeed) {
      const store = await storeRepository.findOne({
        where: { code: requirementData.storeCode },
      });

      const station = await stationRepository.findOne({
        where: { code: requirementData.stationCode },
      });

      if (!store || !station) {
        this.logger.warn(
          `  ⚠ Store or station not found: ${requirementData.storeCode} - ${requirementData.stationCode}`,
        );
        continue;
      }

      const existing = await requirementRepository.findOne({
        where: {
          store: { id: store.id },
          periodType: requirementData.periodType,
          station: { id: station.id },
        },
      });

      if (!existing) {
        const requirement = requirementRepository.create({
          store,
          periodType: requirementData.periodType,
          station,
          requiredStaff: requirementData.requiredStaff,
        });
        await requirementRepository.save(requirement);
        this.logger.log(
          `  ✓ Requirement created: ${requirementData.storeCode} - ${requirementData.periodType} - ${requirementData.stationCode}`,
        );
      } else {
        this.logger.log(
          `  ⊙ Requirement already exists: ${requirementData.storeCode} - ${requirementData.periodType} - ${requirementData.stationCode}`,
        );
      }
    }
  }

  private async seedSchedulePeriods(): Promise<void> {
    this.logger.log(`Seeding ${schedulePeriodsSeed.length} schedule periods...`);
    const storeRepository = this.dataSource.getRepository(Store);
    const periodRepository = this.dataSource.getRepository(SchedulePeriod);

    for (const periodData of schedulePeriodsSeed) {
      const store = await storeRepository.findOne({
        where: { code: periodData.storeCode },
      });

      if (!store) {
        this.logger.warn(`  ⚠ Store not found: ${periodData.storeCode}`);
        continue;
      }

      const existing = await periodRepository.findOne({
        where: {
          store: { id: store.id },
          startDate: new Date(periodData.startDate),
          endDate: new Date(periodData.endDate),
        },
      });

      if (!existing) {
        const period = periodRepository.create({
          store,
          name: periodData.name,
          startDate: new Date(periodData.startDate),
          endDate: new Date(periodData.endDate),
        });
        await periodRepository.save(period);
        this.logger.log(`  ✓ Period created: ${periodData.name}`);
      } else {
        this.logger.log(`  ⊙ Period already exists: ${periodData.name}`);
      }
    }
  }

  private async seedEmployees(): Promise<void> {
    this.logger.log(`Seeding ${employeesSeed.length} employees...`);
    const storeRepository = this.dataSource.getRepository(Store);
    const stationRepository = this.dataSource.getRepository(Station);
    const employeeRepository = this.dataSource.getRepository(Employee);

    for (const employeeData of employeesSeed) {
      const existing = await employeeRepository.findOne({
        where: { externalCode: employeeData.externalCode },
        relations: ['defaultStation'],
      });

      const store = await storeRepository.findOne({
        where: { code: employeeData.defaultStoreCode },
      });

      const station = employeeData.defaultStationCode
        ? await stationRepository.findOne({
            where: { code: employeeData.defaultStationCode },
          })
        : null;

      if (!store) {
        this.logger.warn(`  ⚠ Store not found: ${employeeData.defaultStoreCode}`);
        continue;
      }

      if (existing) {
        // Update existing employee's defaultStation if it changed or was null
        const currentStationCode = existing.defaultStation?.code;
        if (currentStationCode !== employeeData.defaultStationCode) {
          existing.defaultStation = station || undefined;
          await employeeRepository.save(existing);
          this.logger.log(`  ↻ Employee updated (station): ${employeeData.externalCode} → ${employeeData.defaultStationCode || 'null'}`);
        } else {
          this.logger.log(`  ⊙ Employee already exists: ${employeeData.externalCode}`);
        }
        continue;
      }

      const employee = employeeRepository.create({
        externalCode: employeeData.externalCode,
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        employmentType: employeeData.employmentType,
        role: employeeData.role,
        defaultStore: store,
        defaultStation: station || undefined,
      });

      await employeeRepository.save(employee);
      this.logger.log(
        `  ✓ Employee created: ${employeeData.externalCode} - ${employeeData.firstName} ${employeeData.lastName}`,
      );
    }
  }

  private async seedEmployeeAvailability(): Promise<void> {
    this.logger.log(`Seeding ${employeeAvailabilitySeed.length} availability records...`);
    const employeeRepository = this.dataSource.getRepository(Employee);
    const storeRepository = this.dataSource.getRepository(Store);
    const shiftCodeRepository = this.dataSource.getRepository(ShiftCode);
    const periodRepository = this.dataSource.getRepository(SchedulePeriod);
    const stationRepository = this.dataSource.getRepository(Station);
    const availabilityRepository = this.dataSource.getRepository(EmployeeAvailability);

    let created = 0;
    let skipped = 0;

    for (const availabilityData of employeeAvailabilitySeed) {
      const employee = await employeeRepository.findOne({
        where: { externalCode: availabilityData.externalCode },
      });

      if (!employee) {
        this.logger.warn(`  ⚠ Employee not found: ${availabilityData.externalCode}`);
        skipped++;
        continue;
      }

      const store = employee.defaultStore;
      if (!store) {
        this.logger.warn(`  ⚠ Employee ${availabilityData.externalCode} has no assigned store`);
        skipped++;
        continue;
      }

      const shiftCode = await shiftCodeRepository.findOne({
        where: { code: availabilityData.shiftCode },
      });

      if (!shiftCode) {
        this.logger.warn(`  ⚠ Shift code not found: ${availabilityData.shiftCode}`);
        skipped++;
        continue;
      }

      // Determine period based on date
      const date = new Date(availabilityData.date);
      date.setHours(0, 0, 0, 0); // Normalize to midnight for comparison

      const periods = await periodRepository.find({
        where: { store: { id: store.id } },
      });

      const period = periods.find((p) => {
        const startDate = new Date(p.startDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(p.endDate);
        endDate.setHours(23, 59, 59, 999);
        return date >= startDate && date <= endDate;
      });

      if (!period) {
        this.logger.warn(`  ⚠ Period not found for date: ${availabilityData.date}`);
        skipped++;
        continue;
      }

      // Check if already exists
      const existing = await availabilityRepository.findOne({
        where: {
          employee: { id: employee.id },
          schedulePeriod: { id: period.id },
          date,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Use employee's station as default (optional)
      const station = employee.defaultStation || undefined;

      const availability = availabilityRepository.create({
        employee,
        schedulePeriod: period,
        store,
        date,
        shiftCode,
        station,
      });

      await availabilityRepository.save(availability);
      created++;

      if (created % 50 === 0) {
        this.logger.log(`  Progress: ${created} records created...`);
      }
    }

    this.logger.log(`  ✓ Availability completed: ${created} created, ${skipped} skipped`);
  }

  private async seedSchedulingPolicies(): Promise<void> {
    this.logger.log(`Seeding ${schedulingPoliciesSeed.length} scheduling policies...`);
    const policyRepository = this.dataSource.getRepository(SchedulingPolicy);
    const storeRepository = this.dataSource.getRepository(Store);

    for (const policyData of schedulingPoliciesSeed) {
      const existing = await policyRepository.findOne({
        where: { name: policyData.name },
      });

      if (existing) {
        this.logger.log(`  ⊙ Policy already exists: ${policyData.name}`);
        continue;
      }

      let store: Store | null = null;
      if (policyData.storeCode) {
        store = await storeRepository.findOne({
          where: { code: policyData.storeCode },
        });
        if (!store) {
          this.logger.warn(`  ⚠ Store not found for policy: ${policyData.storeCode}`);
        }
      }

      const policy = policyRepository.create({
        ...policyData,
        store: store || undefined,
      });
      await policyRepository.save(policy);
      this.logger.log(`  ✓ Policy created: ${policyData.name}`);
    }
  }

  private async seedEmploymentTypeHoursPolicies(): Promise<void> {
    this.logger.log(`Seeding ${employmentTypeHoursSeed.length} employment type hours rules...`);
    const policyRepository = this.dataSource.getRepository(SchedulingPolicy);
    const ruleRepository = this.dataSource.getRepository(EmploymentTypeHoursPolicy);

    for (const ruleData of employmentTypeHoursSeed) {
      const policy = await policyRepository.findOne({
        where: { name: ruleData.policyName },
      });

      if (!policy) {
        this.logger.warn(
          `  ⚠ Policy ${ruleData.policyName} not found for employmentType ${ruleData.employmentType}`,
        );
        continue;
      }

      const existing = await ruleRepository.findOne({
        where: {
          policy: { id: policy.id },
          employmentType: ruleData.employmentType,
        },
      });

      if (existing) {
        this.logger.log(`  ⊙ Rule already exists: ${ruleData.policyName} - ${ruleData.employmentType}`);
        continue;
      }

      const rule = ruleRepository.create({
        policy,
        employmentType: ruleData.employmentType,
        minHoursWeek: ruleData.minHoursWeek,
        maxHoursWeek: ruleData.maxHoursWeek,
      });
      await ruleRepository.save(rule);
      this.logger.log(`  ✓ Rule created: ${ruleData.policyName} - ${ruleData.employmentType}`);
    }
  }

  private async seedPenaltyRules(): Promise<void> {
    this.logger.log(`Seeding ${penaltyRulesSeed.length} penalty rules...`);
    const repo = this.dataSource.getRepository(PenaltyRule);

    for (const rule of penaltyRulesSeed) {
      // Check by unique combination of dayOfWeek, startTime, endTime, isPublicHoliday
      const existing = await repo.findOne({
        where: {
          dayOfWeek: rule.dayOfWeek ?? undefined,
          startTime: rule.startTime ?? undefined,
          endTime: rule.endTime ?? undefined,
          isPublicHoliday: rule.isPublicHoliday,
        },
      });

      if (existing) {
        this.logger.log(`  ⊙ Rule already exists: ${rule.description ?? 'no desc'}`);
        continue;
      }

      const entity = repo.create({
        dayOfWeek: rule.dayOfWeek,
        startTime: rule.startTime,
        endTime: rule.endTime,
        employmentType: rule.employmentType,
        multiplier: rule.multiplier,
        isPublicHoliday: rule.isPublicHoliday,
        description: rule.description,
      });
      await repo.save(entity);
      this.logger.log(`  ✓ Rule created: ${rule.description ?? 'no desc'}`);
    }
  }
}
