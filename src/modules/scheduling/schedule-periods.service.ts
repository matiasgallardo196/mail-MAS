import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchedulePeriod } from './entities/schedule-period.entity';
import { Store } from '../stores/entities/store.entity';
import { CreateSchedulePeriodDto } from './dto/create-schedule-period.dto';
import { UpdateSchedulePeriodDto } from './dto/update-schedule-period.dto';

@Injectable()
export class SchedulePeriodsService {
  constructor(
    @InjectRepository(SchedulePeriod)
    private readonly schedulePeriodRepository: Repository<SchedulePeriod>,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
  ) {}

  async create(createSchedulePeriodDto: CreateSchedulePeriodDto): Promise<SchedulePeriod> {
    // Verificar que la tienda existe
    const store = await this.storeRepository.findOne({
      where: { id: createSchedulePeriodDto.storeId, isActive: true },
    });

    if (!store) {
      throw new NotFoundException(`Tienda con ID "${createSchedulePeriodDto.storeId}" no encontrada`);
    }

    const startDate = new Date(createSchedulePeriodDto.startDate);
    const endDate = new Date(createSchedulePeriodDto.endDate);

    // Verificar que la fecha de inicio sea anterior a la fecha de fin
    if (startDate >= endDate) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    const schedulePeriod = this.schedulePeriodRepository.create({
      store: { id: createSchedulePeriodDto.storeId } as Store,
      name: createSchedulePeriodDto.name,
      startDate,
      endDate,
    });

    return await this.schedulePeriodRepository.save(schedulePeriod);
  }

  async findAll(): Promise<SchedulePeriod[]> {
    return await this.schedulePeriodRepository.find({
      where: { isActive: true },
      relations: ['store'],
      order: { startDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<SchedulePeriod> {
    const schedulePeriod = await this.schedulePeriodRepository.findOne({
      where: { id, isActive: true },
      relations: ['store'],
    });

    if (!schedulePeriod) {
      throw new NotFoundException(`Período de programación con ID "${id}" no encontrado`);
    }

    return schedulePeriod;
  }

  async update(id: string, updateSchedulePeriodDto: UpdateSchedulePeriodDto): Promise<SchedulePeriod> {
    const schedulePeriod = await this.findOne(id);

    // Verificar tienda si se actualiza
    if (updateSchedulePeriodDto.storeId) {
      const store = await this.storeRepository.findOne({
        where: { id: updateSchedulePeriodDto.storeId, isActive: true },
      });

      if (!store) {
        throw new NotFoundException(`Tienda con ID "${updateSchedulePeriodDto.storeId}" no encontrada`);
      }
    }

    // Validar fechas si se actualizan
    const startDate = updateSchedulePeriodDto.startDate
      ? new Date(updateSchedulePeriodDto.startDate)
      : schedulePeriod.startDate;
    const endDate = updateSchedulePeriodDto.endDate
      ? new Date(updateSchedulePeriodDto.endDate)
      : schedulePeriod.endDate;

    if (startDate >= endDate) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    if (updateSchedulePeriodDto.storeId) {
      schedulePeriod.store = { id: updateSchedulePeriodDto.storeId } as Store;
    }

    if (updateSchedulePeriodDto.name !== undefined) {
      schedulePeriod.name = updateSchedulePeriodDto.name;
    }

    if (updateSchedulePeriodDto.startDate) {
      schedulePeriod.startDate = startDate;
    }

    if (updateSchedulePeriodDto.endDate) {
      schedulePeriod.endDate = endDate;
    }

    return await this.schedulePeriodRepository.save(schedulePeriod);
  }

  async remove(id: string): Promise<void> {
    const schedulePeriod = await this.findOne(id);
    schedulePeriod.isActive = false;
    await this.schedulePeriodRepository.save(schedulePeriod);
  }
}
