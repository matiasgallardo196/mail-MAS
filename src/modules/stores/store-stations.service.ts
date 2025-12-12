import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreStation } from './entities/store-station.entity';
import { Store } from './entities/store.entity';
import { Station } from '../stations/entities/station.entity';
import { CreateStoreStationDto } from './dto/create-store-station.dto';
import { UpdateStoreStationDto } from './dto/update-store-station.dto';

@Injectable()
export class StoreStationsService {
  constructor(
    @InjectRepository(StoreStation)
    private readonly storeStationRepository: Repository<StoreStation>,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(Station)
    private readonly stationRepository: Repository<Station>,
  ) {}

  async create(createStoreStationDto: CreateStoreStationDto): Promise<StoreStation> {
    // Verify store exists
    const store = await this.storeRepository.findOne({
      where: { id: createStoreStationDto.storeId, isActive: true },
    });

    if (!store) {
      throw new NotFoundException(`Store with ID "${createStoreStationDto.storeId}" not found`);
    }

    // Verify station exists
    const station = await this.stationRepository.findOne({
      where: { id: createStoreStationDto.stationId, isActive: true },
    });

    if (!station) {
      throw new NotFoundException(`Station with ID "${createStoreStationDto.stationId}" not found`);
    }

    // Check if relationship already exists
    const existingRelation = await this.storeStationRepository.findOne({
      where: {
        store: { id: createStoreStationDto.storeId },
        station: { id: createStoreStationDto.stationId },
      },
    });

    if (existingRelation) {
      throw new ConflictException('The relationship between this store and station already exists');
    }

    const storeStation = this.storeStationRepository.create({
      store: { id: createStoreStationDto.storeId } as Store,
      station: { id: createStoreStationDto.stationId } as Station,
      isEnabled: createStoreStationDto.isEnabled ?? true,
    });

    return await this.storeStationRepository.save(storeStation);
  }

  async findAll(): Promise<StoreStation[]> {
    return await this.storeStationRepository.find({
      where: { isActive: true },
      relations: ['store', 'station'],
    });
  }

  async findOne(id: string): Promise<StoreStation> {
    const storeStation = await this.storeStationRepository.findOne({
      where: { id, isActive: true },
      relations: ['store', 'station'],
    });

    if (!storeStation) {
      throw new NotFoundException(`Store-Station relationship with ID "${id}" not found`);
    }

    return storeStation;
  }

  async update(id: string, updateStoreStationDto: UpdateStoreStationDto): Promise<StoreStation> {
    const storeStation = await this.findOne(id);

    // If updating store, verify it exists
    if (updateStoreStationDto.storeId) {
      const store = await this.storeRepository.findOne({
        where: { id: updateStoreStationDto.storeId, isActive: true },
      });

      if (!store) {
        throw new NotFoundException(`Store with ID "${updateStoreStationDto.storeId}" not found`);
      }
    }

    // If updating station, verify it exists
    if (updateStoreStationDto.stationId) {
      const station = await this.stationRepository.findOne({
        where: { id: updateStoreStationDto.stationId, isActive: true },
      });

      if (!station) {
        throw new NotFoundException(`Station with ID "${updateStoreStationDto.stationId}" not found`);
      }
    }

    // If updating both, verify the new relationship doesn't exist
    if (updateStoreStationDto.storeId && updateStoreStationDto.stationId) {
      const existingRelation = await this.storeStationRepository.findOne({
        where: {
          store: { id: updateStoreStationDto.storeId },
          station: { id: updateStoreStationDto.stationId },
        },
      });

      if (existingRelation && existingRelation.id !== id) {
        throw new ConflictException('The relationship between this store and station already exists');
      }
    }

    if (updateStoreStationDto.storeId) {
      storeStation.store = { id: updateStoreStationDto.storeId } as Store;
    }

    if (updateStoreStationDto.stationId) {
      storeStation.station = { id: updateStoreStationDto.stationId } as Station;
    }

    if (updateStoreStationDto.isEnabled !== undefined) {
      storeStation.isEnabled = updateStoreStationDto.isEnabled;
    }

    return await this.storeStationRepository.save(storeStation);
  }

  async remove(id: string): Promise<void> {
    const storeStation = await this.findOne(id);
    storeStation.isActive = false;
    await this.storeStationRepository.save(storeStation);
  }
}
