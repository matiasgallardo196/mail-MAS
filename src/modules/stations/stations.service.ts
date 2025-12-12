import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Station } from './entities/station.entity';
import { CreateStationDto } from './dto/create-station.dto';
import { UpdateStationDto } from './dto/update-station.dto';

@Injectable()
export class StationsService {
  constructor(
    @InjectRepository(Station)
    private readonly stationRepository: Repository<Station>,
  ) {}

  async create(createStationDto: CreateStationDto): Promise<Station> {
    // Check if code already exists
    const existingStation = await this.stationRepository.findOne({
      where: { code: createStationDto.code },
    });

    if (existingStation) {
      throw new ConflictException(`Station with code "${createStationDto.code}" already exists`);
    }

    const station = this.stationRepository.create(createStationDto);
    return await this.stationRepository.save(station);
  }

  async findAll(): Promise<Station[]> {
    return await this.stationRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Station> {
    const station = await this.stationRepository.findOne({
      where: { id, isActive: true },
    });

    if (!station) {
      throw new NotFoundException(`Station with ID "${id}" not found`);
    }

    return station;
  }

  async update(id: string, updateStationDto: UpdateStationDto): Promise<Station> {
    const station = await this.findOne(id);

    // If updating code, verify no other station has it
    if (updateStationDto.code && updateStationDto.code !== station.code) {
      const existingStation = await this.stationRepository.findOne({
        where: { code: updateStationDto.code },
      });

      if (existingStation) {
        throw new ConflictException(`Station with code "${updateStationDto.code}" already exists`);
      }
    }

    Object.assign(station, updateStationDto);
    return await this.stationRepository.save(station);
  }

  async remove(id: string): Promise<void> {
    const station = await this.findOne(id);
    station.isActive = false;
    await this.stationRepository.save(station);
  }
}
