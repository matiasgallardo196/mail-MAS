import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShiftAssignment } from './entities/shift-assignment.entity';
import { Employee } from '../employees/entities/employee.entity';
import { SchedulePeriod } from './entities/schedule-period.entity';
import { Store } from '../stores/entities/store.entity';
import { ShiftCode } from './entities/shift-code.entity';
import { Station } from '../stations/entities/station.entity';
import { CreateShiftAssignmentDto } from './dto/create-shift-assignment.dto';
import { UpdateShiftAssignmentDto } from './dto/update-shift-assignment.dto';

@Injectable()
export class ShiftAssignmentsService {
  constructor(
    @InjectRepository(ShiftAssignment)
    private readonly assignmentRepository: Repository<ShiftAssignment>,
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

  async create(createAssignmentDto: CreateShiftAssignmentDto): Promise<ShiftAssignment> {
    // Verify all relationships
    const employee = await this.employeeRepository.findOne({
      where: { id: createAssignmentDto.employeeId, isActive: true },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID "${createAssignmentDto.employeeId}" not found`);
    }

    const schedulePeriod = await this.schedulePeriodRepository.findOne({
      where: { id: createAssignmentDto.schedulePeriodId, isActive: true },
    });
    if (!schedulePeriod) {
      throw new NotFoundException(`Schedule period with ID "${createAssignmentDto.schedulePeriodId}" not found`);
    }

    const store = await this.storeRepository.findOne({
      where: { id: createAssignmentDto.storeId, isActive: true },
    });
    if (!store) {
      throw new NotFoundException(`Store with ID "${createAssignmentDto.storeId}" not found`);
    }

    const shiftCode = await this.shiftCodeRepository.findOne({
      where: { id: createAssignmentDto.shiftCodeId, isActive: true },
    });
    if (!shiftCode) {
      throw new NotFoundException(`Shift code with ID "${createAssignmentDto.shiftCodeId}" not found`);
    }

    const station = await this.stationRepository.findOne({
      where: { id: createAssignmentDto.stationId, isActive: true },
    });
    if (!station) {
      throw new NotFoundException(`Station with ID "${createAssignmentDto.stationId}" not found`);
    }

    // Check uniqueness
    const existingAssignment = await this.assignmentRepository.findOne({
      where: {
        employee: { id: createAssignmentDto.employeeId },
        date: new Date(createAssignmentDto.date),
        shiftCode: { id: createAssignmentDto.shiftCodeId },
        station: { id: createAssignmentDto.stationId },
      },
    });

    if (existingAssignment) {
      throw new ConflictException('An assignment already exists for this employee, date, shift code and station');
    }

    const assignment = this.assignmentRepository.create({
      employee: { id: createAssignmentDto.employeeId } as Employee,
      schedulePeriod: { id: createAssignmentDto.schedulePeriodId } as SchedulePeriod,
      store: { id: createAssignmentDto.storeId } as Store,
      date: new Date(createAssignmentDto.date),
      shiftCode: { id: createAssignmentDto.shiftCodeId } as ShiftCode,
      station: { id: createAssignmentDto.stationId } as Station,
      createdBy: createAssignmentDto.createdBy,
    });

    return await this.assignmentRepository.save(assignment);
  }

  async findAll(): Promise<ShiftAssignment[]> {
    return await this.assignmentRepository.find({
      where: { isActive: true },
      relations: ['employee', 'schedulePeriod', 'store', 'shiftCode', 'station'],
      order: { date: 'ASC' },
    });
  }

  async findOne(id: string): Promise<ShiftAssignment> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id, isActive: true },
      relations: ['employee', 'schedulePeriod', 'store', 'shiftCode', 'station'],
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID "${id}" not found`);
    }

    return assignment;
  }

  async update(id: string, updateAssignmentDto: UpdateShiftAssignmentDto): Promise<ShiftAssignment> {
    const assignment = await this.findOne(id);

    // Verify relationships if updating
    if (updateAssignmentDto.employeeId) {
      const employee = await this.employeeRepository.findOne({
        where: { id: updateAssignmentDto.employeeId, isActive: true },
      });
      if (!employee) throw new NotFoundException(`Employee not found`);
    }

    if (updateAssignmentDto.schedulePeriodId) {
      const schedulePeriod = await this.schedulePeriodRepository.findOne({
        where: { id: updateAssignmentDto.schedulePeriodId, isActive: true },
      });
      if (!schedulePeriod) throw new NotFoundException(`Schedule period not found`);
    }

    if (updateAssignmentDto.storeId) {
      const store = await this.storeRepository.findOne({
        where: { id: updateAssignmentDto.storeId, isActive: true },
      });
      if (!store) throw new NotFoundException(`Store not found`);
    }

    if (updateAssignmentDto.shiftCodeId) {
      const shiftCode = await this.shiftCodeRepository.findOne({
        where: { id: updateAssignmentDto.shiftCodeId, isActive: true },
      });
      if (!shiftCode) throw new NotFoundException(`Shift code not found`);
    }

    if (updateAssignmentDto.stationId) {
      const station = await this.stationRepository.findOne({
        where: { id: updateAssignmentDto.stationId, isActive: true },
      });
      if (!station) throw new NotFoundException(`Station not found`);
    }

    // Check uniqueness
    if (
      updateAssignmentDto.employeeId ||
      updateAssignmentDto.date ||
      updateAssignmentDto.shiftCodeId ||
      updateAssignmentDto.stationId
    ) {
      const employeeId = updateAssignmentDto.employeeId || assignment.employee.id;
      const date = updateAssignmentDto.date ? new Date(updateAssignmentDto.date) : assignment.date;
      const shiftCodeId = updateAssignmentDto.shiftCodeId || assignment.shiftCode.id;
      const stationId = updateAssignmentDto.stationId || assignment.station.id;

      const existingAssignment = await this.assignmentRepository.findOne({
        where: {
          employee: { id: employeeId },
          date,
          shiftCode: { id: shiftCodeId },
          station: { id: stationId },
        },
      });

      if (existingAssignment && existingAssignment.id !== id) {
        throw new ConflictException('An assignment already exists for this combination');
      }
    }

    // Update fields
    if (updateAssignmentDto.employeeId) {
      assignment.employee = { id: updateAssignmentDto.employeeId } as Employee;
    }
    if (updateAssignmentDto.schedulePeriodId) {
      assignment.schedulePeriod = { id: updateAssignmentDto.schedulePeriodId } as SchedulePeriod;
    }
    if (updateAssignmentDto.storeId) {
      assignment.store = { id: updateAssignmentDto.storeId } as Store;
    }
    if (updateAssignmentDto.date) {
      assignment.date = new Date(updateAssignmentDto.date);
    }
    if (updateAssignmentDto.shiftCodeId) {
      assignment.shiftCode = { id: updateAssignmentDto.shiftCodeId } as ShiftCode;
    }
    if (updateAssignmentDto.stationId) {
      assignment.station = { id: updateAssignmentDto.stationId } as Station;
    }
    if (updateAssignmentDto.createdBy !== undefined) {
      assignment.createdBy = updateAssignmentDto.createdBy;
    }

    return await this.assignmentRepository.save(assignment);
  }

  async remove(id: string): Promise<void> {
    const assignment = await this.findOne(id);
    assignment.isActive = false;
    await this.assignmentRepository.save(assignment);
  }
}
