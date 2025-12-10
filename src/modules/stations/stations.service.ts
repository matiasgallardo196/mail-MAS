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
    // Verificar si el código ya existe
    const existingStation = await this.stationRepository.findOne({
      where: { code: createStationDto.code },
    });

    if (existingStation) {
      throw new ConflictException(`La estación con código "${createStationDto.code}" ya existe`);
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
      throw new NotFoundException(`Estación con ID "${id}" no encontrada`);
    }

    return station;
  }

  async update(id: string, updateStationDto: UpdateStationDto): Promise<Station> {
    const station = await this.findOne(id);

    // Si se está actualizando el código, verificar que no exista otro con el mismo código
    if (updateStationDto.code && updateStationDto.code !== station.code) {
      const existingStation = await this.stationRepository.findOne({
        where: { code: updateStationDto.code },
      });

      if (existingStation) {
        throw new ConflictException(`La estación con código "${updateStationDto.code}" ya existe`);
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
