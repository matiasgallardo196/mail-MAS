import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShiftCode } from './entities/shift-code.entity';
import { CreateShiftCodeDto } from './dto/create-shift-code.dto';
import { UpdateShiftCodeDto } from './dto/update-shift-code.dto';

@Injectable()
export class ShiftCodesService {
  constructor(
    @InjectRepository(ShiftCode)
    private readonly shiftCodeRepository: Repository<ShiftCode>,
  ) {}

  async create(createShiftCodeDto: CreateShiftCodeDto): Promise<ShiftCode> {
    // Verificar si el código ya existe
    const existingShiftCode = await this.shiftCodeRepository.findOne({
      where: { code: createShiftCodeDto.code },
    });

    if (existingShiftCode) {
      throw new ConflictException(
        `El código de turno "${createShiftCodeDto.code}" ya existe`,
      );
    }

    const shiftCode = this.shiftCodeRepository.create({
      ...createShiftCodeDto,
      isAvailable: createShiftCodeDto.isAvailable ?? true,
      isManagement: createShiftCodeDto.isManagement ?? false,
    });

    return await this.shiftCodeRepository.save(shiftCode);
  }

  async findAll(): Promise<ShiftCode[]> {
    return await this.shiftCodeRepository.find({
      where: { isActive: true },
      order: { code: 'ASC' },
    });
  }

  async findOne(id: string): Promise<ShiftCode> {
    const shiftCode = await this.shiftCodeRepository.findOne({
      where: { id, isActive: true },
    });

    if (!shiftCode) {
      throw new NotFoundException(`Código de turno con ID "${id}" no encontrado`);
    }

    return shiftCode;
  }

  async update(id: string, updateShiftCodeDto: UpdateShiftCodeDto): Promise<ShiftCode> {
    const shiftCode = await this.findOne(id);

    // Si se está actualizando el código, verificar que no exista otro con el mismo código
    if (updateShiftCodeDto.code && updateShiftCodeDto.code !== shiftCode.code) {
      const existingShiftCode = await this.shiftCodeRepository.findOne({
        where: { code: updateShiftCodeDto.code },
      });

      if (existingShiftCode) {
        throw new ConflictException(
          `El código de turno "${updateShiftCodeDto.code}" ya existe`,
        );
      }
    }

    Object.assign(shiftCode, updateShiftCodeDto);
    return await this.shiftCodeRepository.save(shiftCode);
  }

  async remove(id: string): Promise<void> {
    const shiftCode = await this.findOne(id);
    shiftCode.isActive = false;
    await this.shiftCodeRepository.save(shiftCode);
  }
}

