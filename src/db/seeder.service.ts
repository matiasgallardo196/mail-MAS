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
import { stationsSeed } from './seeds/stations.seed';
import { storesSeed } from './seeds/stores.seed';
import { storeStationsSeed } from './seeds/store-stations.seed';
import { shiftCodesSeed } from './seeds/shift-codes.seed';
import { staffRequirementsSeed } from './seeds/store-staff-requirements.seed';
import { schedulePeriodsSeed } from './seeds/schedule-periods.seed';
import { employeesSeed } from './seeds/employees.seed';
import { employeeAvailabilitySeed } from './seeds/employee-availability.seed';

export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(private readonly dataSource: DataSource) {}

  async seedAll(): Promise<void> {
    this.logger.log('Iniciando proceso de seeding...');

    try {
      await this.seedStations();
      await this.seedStores();
      await this.seedShiftCodes();
      await this.seedStoreStations();
      await this.seedStoreStaffRequirements();
      await this.seedSchedulePeriods();
      await this.seedEmployees();
      await this.seedEmployeeAvailability();

      this.logger.log('✅ Seeding completado exitosamente');
    } catch (error) {
      this.logger.error('❌ Error durante el seeding:', error);
      throw error;
    }
  }

  private async seedStations(): Promise<void> {
    this.logger.log(`Sembrando ${stationsSeed.length} estaciones...`);
    const repository = this.dataSource.getRepository(Station);

    for (const stationData of stationsSeed) {
      const existing = await repository.findOne({
        where: { code: stationData.code },
      });

      if (!existing) {
        const station = repository.create(stationData);
        await repository.save(station);
        this.logger.log(`  ✓ Estación creada: ${stationData.code}`);
      } else {
        this.logger.log(`  ⊙ Estación ya existe: ${stationData.code}`);
      }
    }
  }

  private async seedStores(): Promise<void> {
    this.logger.log(`Sembrando ${storesSeed.length} tiendas...`);
    const repository = this.dataSource.getRepository(Store);

    for (const storeData of storesSeed) {
      const existing = await repository.findOne({
        where: { code: storeData.code },
      });

      if (!existing) {
        const store = repository.create(storeData);
        await repository.save(store);
        this.logger.log(`  ✓ Tienda creada: ${storeData.code}`);
      } else {
        this.logger.log(`  ⊙ Tienda ya existe: ${storeData.code}`);
      }
    }
  }

  private async seedShiftCodes(): Promise<void> {
    this.logger.log(`Sembrando ${shiftCodesSeed.length} códigos de turno...`);
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
        this.logger.log(`  ✓ Código de turno creado: ${shiftCodeData.code}`);
      } else {
        this.logger.log(`  ⊙ Código de turno ya existe: ${shiftCodeData.code}`);
      }
    }
  }

  private async seedStoreStations(): Promise<void> {
    this.logger.log(`Sembrando ${storeStationsSeed.length} relaciones Store-Station...`);
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
          `  ⚠ No se encontró store o station: ${storeStationData.storeCode} - ${storeStationData.stationCode}`,
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
        this.logger.log(
          `  ✓ Relación creada: ${storeStationData.storeCode} - ${storeStationData.stationCode}`,
        );
      } else {
        this.logger.log(
          `  ⊙ Relación ya existe: ${storeStationData.storeCode} - ${storeStationData.stationCode}`,
        );
      }
    }
  }

  private async seedStoreStaffRequirements(): Promise<void> {
    this.logger.log(
      `Sembrando ${staffRequirementsSeed.length} requisitos de personal...`,
    );
    const storeRepository = this.dataSource.getRepository(Store);
    const stationRepository = this.dataSource.getRepository(Station);
    const requirementRepository =
      this.dataSource.getRepository(StoreStaffRequirement);

    for (const requirementData of staffRequirementsSeed) {
      const store = await storeRepository.findOne({
        where: { code: requirementData.storeCode },
      });

      const station = await stationRepository.findOne({
        where: { code: requirementData.stationCode },
      });

      if (!store || !station) {
        this.logger.warn(
          `  ⚠ No se encontró store o station: ${requirementData.storeCode} - ${requirementData.stationCode}`,
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
          `  ✓ Requisito creado: ${requirementData.storeCode} - ${requirementData.periodType} - ${requirementData.stationCode}`,
        );
      } else {
        this.logger.log(
          `  ⊙ Requisito ya existe: ${requirementData.storeCode} - ${requirementData.periodType} - ${requirementData.stationCode}`,
        );
      }
    }
  }

  private async seedSchedulePeriods(): Promise<void> {
    this.logger.log(
      `Sembrando ${schedulePeriodsSeed.length} períodos de programación...`,
    );
    const storeRepository = this.dataSource.getRepository(Store);
    const periodRepository = this.dataSource.getRepository(SchedulePeriod);

    for (const periodData of schedulePeriodsSeed) {
      const store = await storeRepository.findOne({
        where: { code: periodData.storeCode },
      });

      if (!store) {
        this.logger.warn(
          `  ⚠ No se encontró store: ${periodData.storeCode}`,
        );
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
        this.logger.log(`  ✓ Período creado: ${periodData.name}`);
      } else {
        this.logger.log(`  ⊙ Período ya existe: ${periodData.name}`);
      }
    }
  }

  private async seedEmployees(): Promise<void> {
    this.logger.log(`Sembrando ${employeesSeed.length} empleados...`);
    const storeRepository = this.dataSource.getRepository(Store);
    const stationRepository = this.dataSource.getRepository(Station);
    const employeeRepository = this.dataSource.getRepository(Employee);

    for (const employeeData of employeesSeed) {
      const existing = await employeeRepository.findOne({
        where: { externalCode: employeeData.externalCode },
      });

      if (existing) {
        this.logger.log(
          `  ⊙ Empleado ya existe: ${employeeData.externalCode}`,
        );
        continue;
      }

      const store = await storeRepository.findOne({
        where: { code: employeeData.defaultStoreCode },
      });

      const station = employeeData.defaultStationCode
        ? await stationRepository.findOne({
            where: { code: employeeData.defaultStationCode },
          })
        : null;

      if (!store) {
        this.logger.warn(
          `  ⚠ No se encontró store: ${employeeData.defaultStoreCode}`,
        );
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
        `  ✓ Empleado creado: ${employeeData.externalCode} - ${employeeData.firstName} ${employeeData.lastName}`,
      );
    }
  }

  private async seedEmployeeAvailability(): Promise<void> {
    this.logger.log(
      `Sembrando ${employeeAvailabilitySeed.length} registros de disponibilidad...`,
    );
    const employeeRepository = this.dataSource.getRepository(Employee);
    const storeRepository = this.dataSource.getRepository(Store);
    const shiftCodeRepository = this.dataSource.getRepository(ShiftCode);
    const periodRepository = this.dataSource.getRepository(SchedulePeriod);
    const stationRepository = this.dataSource.getRepository(Station);
    const availabilityRepository =
      this.dataSource.getRepository(EmployeeAvailability);

    let created = 0;
    let skipped = 0;

    for (const availabilityData of employeeAvailabilitySeed) {
      const employee = await employeeRepository.findOne({
        where: { externalCode: availabilityData.externalCode },
      });

      if (!employee) {
        this.logger.warn(
          `  ⚠ No se encontró empleado: ${availabilityData.externalCode}`,
        );
        skipped++;
        continue;
      }

      const store = employee.defaultStore;
      if (!store) {
        this.logger.warn(
          `  ⚠ Empleado ${availabilityData.externalCode} no tiene store asignado`,
        );
        skipped++;
        continue;
      }

      const shiftCode = await shiftCodeRepository.findOne({
        where: { code: availabilityData.shiftCode },
      });

      if (!shiftCode) {
        this.logger.warn(
          `  ⚠ No se encontró código de turno: ${availabilityData.shiftCode}`,
        );
        skipped++;
        continue;
      }

      // Determinar el período basado en la fecha
      const date = new Date(availabilityData.date);
      date.setHours(0, 0, 0, 0); // Normalizar a medianoche para comparación
      
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
        this.logger.warn(
          `  ⚠ No se encontró período para la fecha: ${availabilityData.date}`,
        );
        skipped++;
        continue;
      }

      // Verificar si ya existe
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

      // Usar la estación del empleado como default (opcional)
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
        this.logger.log(`  Progreso: ${created} registros creados...`);
      }
    }

    this.logger.log(
      `  ✓ Disponibilidad completada: ${created} creados, ${skipped} omitidos`,
    );
  }
}

