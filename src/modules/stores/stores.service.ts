import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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
    // Check if code already exists
    const existingStore = await this.storeRepository.findOne({
      where: { code: createStoreDto.code },
    });

    if (existingStore) {
      throw new ConflictException(`Store with code "${createStoreDto.code}" already exists`);
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
      throw new NotFoundException(`Store with ID "${id}" not found`);
    }

    return store;
  }

  async update(id: string, updateStoreDto: UpdateStoreDto): Promise<Store> {
    const store = await this.findOne(id);

    // If updating code, verify no other store has it
    if (updateStoreDto.code && updateStoreDto.code !== store.code) {
      const existingStore = await this.storeRepository.findOne({
        where: { code: updateStoreDto.code },
      });

      if (existingStore) {
        throw new ConflictException(`Store with code "${updateStoreDto.code}" already exists`);
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
