import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreStaffRequirement } from './entities/store-staff-requirement.entity';
import { Store } from './entities/store.entity';
import { Station } from '../stations/entities/station.entity';
import { CreateStoreStaffRequirementDto } from './dto/create-store-staff-requirement.dto';
import { UpdateStoreStaffRequirementDto } from './dto/update-store-staff-requirement.dto';

@Injectable()
export class StoreStaffRequirementsService {
  constructor(
    @InjectRepository(StoreStaffRequirement)
    private readonly requirementRepository: Repository<StoreStaffRequirement>,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(Station)
    private readonly stationRepository: Repository<Station>,
  ) {}

  async create(
    createRequirementDto: CreateStoreStaffRequirementDto,
  ): Promise<StoreStaffRequirement> {
    // Verificar que la tienda existe
    const store = await this.storeRepository.findOne({
      where: { id: createRequirementDto.storeId, isActive: true },
    });

    if (!store) {
      throw new NotFoundException(
        `Tienda con ID "${createRequirementDto.storeId}" no encontrada`,
      );
    }

    // Verificar que la estación existe
    const station = await this.stationRepository.findOne({
      where: { id: createRequirementDto.stationId, isActive: true },
    });

    if (!station) {
      throw new NotFoundException(
        `Estación con ID "${createRequirementDto.stationId}" no encontrada`,
      );
    }

    // Verificar si la combinación ya existe
    const existingRequirement = await this.requirementRepository.findOne({
      where: {
        store: { id: createRequirementDto.storeId },
        periodType: createRequirementDto.periodType,
        station: { id: createRequirementDto.stationId },
      },
    });

    if (existingRequirement) {
      throw new ConflictException(
        'Ya existe un requisito de personal para esta combinación de tienda, período y estación',
      );
    }

    const requirement = this.requirementRepository.create({
      store: { id: createRequirementDto.storeId } as Store,
      periodType: createRequirementDto.periodType,
      station: { id: createRequirementDto.stationId } as Station,
      requiredStaff: createRequirementDto.requiredStaff,
    });

    return await this.requirementRepository.save(requirement);
  }

  async findAll(): Promise<StoreStaffRequirement[]> {
    return await this.requirementRepository.find({
      where: { isActive: true },
      relations: ['store', 'station'],
    });
  }

  async findOne(id: string): Promise<StoreStaffRequirement> {
    const requirement = await this.requirementRepository.findOne({
      where: { id, isActive: true },
      relations: ['store', 'station'],
    });

    if (!requirement) {
      throw new NotFoundException(
        `Requisito de personal con ID "${id}" no encontrado`,
      );
    }

    return requirement;
  }

  async update(
    id: string,
    updateRequirementDto: UpdateStoreStaffRequirementDto,
  ): Promise<StoreStaffRequirement> {
    const requirement = await this.findOne(id);

    // Verificar tienda si se actualiza
    if (updateRequirementDto.storeId) {
      const store = await this.storeRepository.findOne({
        where: { id: updateRequirementDto.storeId, isActive: true },
      });

      if (!store) {
        throw new NotFoundException(
          `Tienda con ID "${updateRequirementDto.storeId}" no encontrada`,
        );
      }
    }

    // Verificar estación si se actualiza
    if (updateRequirementDto.stationId) {
      const station = await this.stationRepository.findOne({
        where: { id: updateRequirementDto.stationId, isActive: true },
      });

      if (!station) {
        throw new NotFoundException(
          `Estación con ID "${updateRequirementDto.stationId}" no encontrada`,
        );
      }
    }

    // Verificar unicidad si se actualizan los campos únicos
    if (
      updateRequirementDto.storeId ||
      updateRequirementDto.periodType ||
      updateRequirementDto.stationId
    ) {
      const storeId = updateRequirementDto.storeId || requirement.store.id;
      const periodType = updateRequirementDto.periodType || requirement.periodType;
      const stationId = updateRequirementDto.stationId || requirement.station.id;

      const existingRequirement = await this.requirementRepository.findOne({
        where: {
          store: { id: storeId },
          periodType,
          station: { id: stationId },
        },
      });

      if (existingRequirement && existingRequirement.id !== id) {
        throw new ConflictException(
          'Ya existe un requisito de personal para esta combinación de tienda, período y estación',
        );
      }
    }

    if (updateRequirementDto.storeId) {
      requirement.store = { id: updateRequirementDto.storeId } as Store;
    }

    if (updateRequirementDto.periodType) {
      requirement.periodType = updateRequirementDto.periodType;
    }

    if (updateRequirementDto.stationId) {
      requirement.station = { id: updateRequirementDto.stationId } as Station;
    }

    if (updateRequirementDto.requiredStaff !== undefined) {
      requirement.requiredStaff = updateRequirementDto.requiredStaff;
    }

    return await this.requirementRepository.save(requirement);
  }

  async remove(id: string): Promise<void> {
    const requirement = await this.findOne(id);
    requirement.isActive = false;
    await this.requirementRepository.save(requirement);
  }
}

