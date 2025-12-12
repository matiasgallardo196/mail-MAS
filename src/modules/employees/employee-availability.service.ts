import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeAvailability } from './entities/employee-availability.entity';
import { Employee } from './entities/employee.entity';
import { SchedulePeriod } from '../scheduling/entities/schedule-period.entity';
import { Store } from '../stores/entities/store.entity';
import { ShiftCode } from '../scheduling/entities/shift-code.entity';
import { Station } from '../stations/entities/station.entity';
import { CreateEmployeeAvailabilityDto } from './dto/create-employee-availability.dto';
import { UpdateEmployeeAvailabilityDto } from './dto/update-employee-availability.dto';

@Injectable()
export class EmployeeAvailabilityService {
  constructor(
    @InjectRepository(EmployeeAvailability)
    private readonly availabilityRepository: Repository<EmployeeAvailability>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(SchedulePeriod)
    private readonly schedulePeriodRepository: Repository<SchedulePeriod>,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(ShiftCode)
    private readonly shiftCodeRepository: Repository<ShiftCode>,
    @InjectRepository(Station)
    private readonly stationRepository: Repository<Station>,
  ) {}

  async create(createAvailabilityDto: CreateEmployeeAvailabilityDto): Promise<EmployeeAvailability> {
    // Verify employee exists
    const employee = await this.employeeRepository.findOne({
      where: { id: createAvailabilityDto.employeeId, isActive: true },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID "${createAvailabilityDto.employeeId}" not found`);
    }

    // Verify schedule period exists
    const schedulePeriod = await this.schedulePeriodRepository.findOne({
      where: { id: createAvailabilityDto.schedulePeriodId, isActive: true },
    });

    if (!schedulePeriod) {
      throw new NotFoundException(
        `Schedule period with ID "${createAvailabilityDto.schedulePeriodId}" not found`,
      );
    }

    // Verify store exists
    const store = await this.storeRepository.findOne({
      where: { id: createAvailabilityDto.storeId, isActive: true },
    });

    if (!store) {
      throw new NotFoundException(`Store with ID "${createAvailabilityDto.storeId}" not found`);
    }

    // Verify shift code exists
    const shiftCode = await this.shiftCodeRepository.findOne({
      where: { id: createAvailabilityDto.shiftCodeId, isActive: true },
    });

    if (!shiftCode) {
      throw new NotFoundException(`Shift code with ID "${createAvailabilityDto.shiftCodeId}" not found`);
    }

    // Verify station exists if provided
    if (createAvailabilityDto.stationId) {
      const station = await this.stationRepository.findOne({
        where: { id: createAvailabilityDto.stationId, isActive: true },
      });

      if (!station) {
        throw new NotFoundException(`Station with ID "${createAvailabilityDto.stationId}" not found`);
      }
    }

    // Check uniqueness (employee, schedulePeriod, date)
    const existingAvailability = await this.availabilityRepository.findOne({
      where: {
        employee: { id: createAvailabilityDto.employeeId },
        schedulePeriod: { id: createAvailabilityDto.schedulePeriodId },
        date: new Date(createAvailabilityDto.date),
      },
    });

    if (existingAvailability) {
      throw new ConflictException('An availability already exists for this employee, period and date');
    }

    const availability = this.availabilityRepository.create({
      employee: { id: createAvailabilityDto.employeeId } as Employee,
      schedulePeriod: { id: createAvailabilityDto.schedulePeriodId } as SchedulePeriod,
      store: { id: createAvailabilityDto.storeId } as Store,
      date: new Date(createAvailabilityDto.date),
      shiftCode: { id: createAvailabilityDto.shiftCodeId } as ShiftCode,
      station: createAvailabilityDto.stationId ? ({ id: createAvailabilityDto.stationId } as Station) : undefined,
      notes: createAvailabilityDto.notes,
    });

    return await this.availabilityRepository.save(availability);
  }

  async findAll(): Promise<EmployeeAvailability[]> {
    return await this.availabilityRepository.find({
      where: { isActive: true },
      relations: ['employee', 'schedulePeriod', 'store', 'shiftCode', 'station'],
      order: { date: 'ASC' },
    });
  }

  async findOne(id: string): Promise<EmployeeAvailability> {
    const availability = await this.availabilityRepository.findOne({
      where: { id, isActive: true },
      relations: ['employee', 'schedulePeriod', 'store', 'shiftCode', 'station'],
    });

    if (!availability) {
      throw new NotFoundException(`Availability with ID "${id}" not found`);
    }

    return availability;
  }

  async update(id: string, updateAvailabilityDto: UpdateEmployeeAvailabilityDto): Promise<EmployeeAvailability> {
    const availability = await this.findOne(id);

    // Verify relationships if updating
    if (updateAvailabilityDto.employeeId) {
      const employee = await this.employeeRepository.findOne({
        where: { id: updateAvailabilityDto.employeeId, isActive: true },
      });

      if (!employee) {
        throw new NotFoundException(`Employee with ID "${updateAvailabilityDto.employeeId}" not found`);
      }
    }

    if (updateAvailabilityDto.schedulePeriodId) {
      const schedulePeriod = await this.schedulePeriodRepository.findOne({
        where: { id: updateAvailabilityDto.schedulePeriodId, isActive: true },
      });

      if (!schedulePeriod) {
        throw new NotFoundException(
          `Schedule period with ID "${updateAvailabilityDto.schedulePeriodId}" not found`,
        );
      }
    }

    if (updateAvailabilityDto.storeId) {
      const store = await this.storeRepository.findOne({
        where: { id: updateAvailabilityDto.storeId, isActive: true },
      });

      if (!store) {
        throw new NotFoundException(`Store with ID "${updateAvailabilityDto.storeId}" not found`);
      }
    }

    if (updateAvailabilityDto.shiftCodeId) {
      const shiftCode = await this.shiftCodeRepository.findOne({
        where: { id: updateAvailabilityDto.shiftCodeId, isActive: true },
      });

      if (!shiftCode) {
        throw new NotFoundException(`Shift code with ID "${updateAvailabilityDto.shiftCodeId}" not found`);
      }
    }

    if (updateAvailabilityDto.stationId !== undefined) {
      if (updateAvailabilityDto.stationId) {
        const station = await this.stationRepository.findOne({
          where: { id: updateAvailabilityDto.stationId, isActive: true },
        });

        if (!station) {
          throw new NotFoundException(`Station with ID "${updateAvailabilityDto.stationId}" not found`);
        }
      }
    }

    // Check uniqueness if updating unique fields
    if (updateAvailabilityDto.employeeId || updateAvailabilityDto.schedulePeriodId || updateAvailabilityDto.date) {
      const employeeId = updateAvailabilityDto.employeeId || availability.employee.id;
      const schedulePeriodId = updateAvailabilityDto.schedulePeriodId || availability.schedulePeriod.id;
      const date = updateAvailabilityDto.date ? new Date(updateAvailabilityDto.date) : availability.date;

      const existingAvailability = await this.availabilityRepository.findOne({
        where: {
          employee: { id: employeeId },
          schedulePeriod: { id: schedulePeriodId },
          date,
        },
      });

      if (existingAvailability && existingAvailability.id !== id) {
        throw new ConflictException('An availability already exists for this employee, period and date');
      }
    }

    if (updateAvailabilityDto.employeeId) {
      availability.employee = { id: updateAvailabilityDto.employeeId } as Employee;
    }

    if (updateAvailabilityDto.schedulePeriodId) {
      availability.schedulePeriod = { id: updateAvailabilityDto.schedulePeriodId } as SchedulePeriod;
    }

    if (updateAvailabilityDto.storeId) {
      availability.store = { id: updateAvailabilityDto.storeId } as Store;
    }

    if (updateAvailabilityDto.date) {
      availability.date = new Date(updateAvailabilityDto.date);
    }

    if (updateAvailabilityDto.shiftCodeId) {
      availability.shiftCode = { id: updateAvailabilityDto.shiftCodeId } as ShiftCode;
    }

    if (updateAvailabilityDto.stationId !== undefined) {
      availability.station = updateAvailabilityDto.stationId
        ? ({ id: updateAvailabilityDto.stationId } as Station)
        : undefined;
    }

    if (updateAvailabilityDto.notes !== undefined) {
      availability.notes = updateAvailabilityDto.notes;
    }

    return await this.availabilityRepository.save(availability);
  }

  async remove(id: string): Promise<void> {
    const availability = await this.findOne(id);
    availability.isActive = false;
    await this.availabilityRepository.save(availability);
  }
}
