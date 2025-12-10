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
    // Verificar que la tienda existe
    const store = await this.storeRepository.findOne({
      where: { id: createStoreStationDto.storeId, isActive: true },
    });

    if (!store) {
      throw new NotFoundException(`Tienda con ID "${createStoreStationDto.storeId}" no encontrada`);
    }

    // Verificar que la estación existe
    const station = await this.stationRepository.findOne({
      where: { id: createStoreStationDto.stationId, isActive: true },
    });

    if (!station) {
      throw new NotFoundException(`Estación con ID "${createStoreStationDto.stationId}" no encontrada`);
    }

    // Verificar si la relación ya existe
    const existingRelation = await this.storeStationRepository.findOne({
      where: {
        store: { id: createStoreStationDto.storeId },
        station: { id: createStoreStationDto.stationId },
      },
    });

    if (existingRelation) {
      throw new ConflictException('La relación entre esta tienda y estación ya existe');
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
      throw new NotFoundException(`Relación Store-Station con ID "${id}" no encontrada`);
    }

    return storeStation;
  }

  async update(id: string, updateStoreStationDto: UpdateStoreStationDto): Promise<StoreStation> {
    const storeStation = await this.findOne(id);

    // Si se está actualizando la tienda, verificar que existe
    if (updateStoreStationDto.storeId) {
      const store = await this.storeRepository.findOne({
        where: { id: updateStoreStationDto.storeId, isActive: true },
      });

      if (!store) {
        throw new NotFoundException(`Tienda con ID "${updateStoreStationDto.storeId}" no encontrada`);
      }
    }

    // Si se está actualizando la estación, verificar que existe
    if (updateStoreStationDto.stationId) {
      const station = await this.stationRepository.findOne({
        where: { id: updateStoreStationDto.stationId, isActive: true },
      });

      if (!station) {
        throw new NotFoundException(`Estación con ID "${updateStoreStationDto.stationId}" no encontrada`);
      }
    }

    // Si se están actualizando ambos, verificar que la nueva relación no exista
    if (updateStoreStationDto.storeId && updateStoreStationDto.stationId) {
      const existingRelation = await this.storeStationRepository.findOne({
        where: {
          store: { id: updateStoreStationDto.storeId },
          station: { id: updateStoreStationDto.stationId },
        },
      });

      if (existingRelation && existingRelation.id !== id) {
        throw new ConflictException('La relación entre esta tienda y estación ya existe');
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
