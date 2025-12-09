import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from './entities/store.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
  ) {}

  async create(createStoreDto: CreateStoreDto): Promise<Store> {
    // Verificar si el código ya existe
    const existingStore = await this.storeRepository.findOne({
      where: { code: createStoreDto.code },
    });

    if (existingStore) {
      throw new ConflictException(
        `La tienda con código "${createStoreDto.code}" ya existe`,
      );
    }

    const store = this.storeRepository.create(createStoreDto);
    return await this.storeRepository.save(store);
  }

  async findAll(): Promise<Store[]> {
    return await this.storeRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Store> {
    const store = await this.storeRepository.findOne({
      where: { id, isActive: true },
    });

    if (!store) {
      throw new NotFoundException(`Tienda con ID "${id}" no encontrada`);
    }

    return store;
  }

  async update(id: string, updateStoreDto: UpdateStoreDto): Promise<Store> {
    const store = await this.findOne(id);

    // Si se está actualizando el código, verificar que no exista otro con el mismo código
    if (updateStoreDto.code && updateStoreDto.code !== store.code) {
      const existingStore = await this.storeRepository.findOne({
        where: { code: updateStoreDto.code },
      });

      if (existingStore) {
        throw new ConflictException(
          `La tienda con código "${updateStoreDto.code}" ya existe`,
        );
      }
    }

    Object.assign(store, updateStoreDto);
    return await this.storeRepository.save(store);
  }

  async remove(id: string): Promise<void> {
    const store = await this.findOne(id);
    store.isActive = false;
    await this.storeRepository.save(store);
  }
}

