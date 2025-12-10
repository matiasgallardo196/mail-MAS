import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ShiftCodesService } from './shift-codes.service';
import { CreateShiftCodeDto } from './dto/create-shift-code.dto';
import { UpdateShiftCodeDto } from './dto/update-shift-code.dto';
import { ShiftCode } from './entities/shift-code.entity';

@ApiTags('shift-codes')
@Controller('shift-codes')
export class ShiftCodesController {
  constructor(private readonly shiftCodesService: ShiftCodesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo código de turno' })
  @ApiResponse({ status: 201, description: 'Código de turno creado exitosamente', type: ShiftCode })
  @ApiResponse({ status: 409, description: 'El código de turno ya existe' })
  create(@Body() createShiftCodeDto: CreateShiftCodeDto): Promise<ShiftCode> {
    return this.shiftCodesService.create(createShiftCodeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los códigos de turno activos' })
  @ApiResponse({ status: 200, description: 'Lista de códigos de turno', type: [ShiftCode] })
  findAll(): Promise<ShiftCode[]> {
    return this.shiftCodesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un código de turno por ID' })
  @ApiResponse({ status: 200, description: 'Código de turno encontrado', type: ShiftCode })
  @ApiResponse({ status: 404, description: 'Código de turno no encontrado' })
  findOne(@Param('id') id: string): Promise<ShiftCode> {
    return this.shiftCodesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un código de turno' })
  @ApiResponse({ status: 200, description: 'Código de turno actualizado exitosamente', type: ShiftCode })
  @ApiResponse({ status: 404, description: 'Código de turno no encontrado' })
  @ApiResponse({ status: 409, description: 'El código de turno ya existe' })
  update(@Param('id') id: string, @Body() updateShiftCodeDto: UpdateShiftCodeDto): Promise<ShiftCode> {
    return this.shiftCodesService.update(id, updateShiftCodeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un código de turno (soft delete)' })
  @ApiResponse({ status: 204, description: 'Código de turno eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Código de turno no encontrado' })
  remove(@Param('id') id: string): Promise<void> {
    return this.shiftCodesService.remove(id);
  }
}
