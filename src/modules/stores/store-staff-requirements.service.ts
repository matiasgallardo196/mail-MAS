import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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

  async create(createRequirementDto: CreateStoreStaffRequirementDto): Promise<StoreStaffRequirement> {
    // Verify store exists
    const store = await this.storeRepository.findOne({
      where: { id: createRequirementDto.storeId, isActive: true },
    });

    if (!store) {
      throw new NotFoundException(`Store with ID "${createRequirementDto.storeId}" not found`);
    }

    // Verify station exists
    const station = await this.stationRepository.findOne({
      where: { id: createRequirementDto.stationId, isActive: true },
    });

    if (!station) {
      throw new NotFoundException(`Station with ID "${createRequirementDto.stationId}" not found`);
    }

    // Check if combination already exists
    const existingRequirement = await this.requirementRepository.findOne({
      where: {
        store: { id: createRequirementDto.storeId },
        periodType: createRequirementDto.periodType,
        station: { id: createRequirementDto.stationId },
      },
    });

    if (existingRequirement) {
      throw new ConflictException(
        'A staff requirement already exists for this store, period and station combination',
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
      throw new NotFoundException(`Staff requirement with ID "${id}" not found`);
    }

    return requirement;
  }

  async update(id: string, updateRequirementDto: UpdateStoreStaffRequirementDto): Promise<StoreStaffRequirement> {
    const requirement = await this.findOne(id);

    // Verify store if updating
    if (updateRequirementDto.storeId) {
      const store = await this.storeRepository.findOne({
        where: { id: updateRequirementDto.storeId, isActive: true },
      });

      if (!store) {
        throw new NotFoundException(`Store with ID "${updateRequirementDto.storeId}" not found`);
      }
    }

    // Verify station if updating
    if (updateRequirementDto.stationId) {
      const station = await this.stationRepository.findOne({
        where: { id: updateRequirementDto.stationId, isActive: true },
      });

      if (!station) {
        throw new NotFoundException(`Station with ID "${updateRequirementDto.stationId}" not found`);
      }
    }

    // Check uniqueness if updating unique fields
    if (updateRequirementDto.storeId || updateRequirementDto.periodType || updateRequirementDto.stationId) {
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
          'A staff requirement already exists for this store, period and station combination',
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
