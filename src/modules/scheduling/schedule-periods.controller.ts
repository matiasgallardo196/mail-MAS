import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SchedulePeriodsService } from './schedule-periods.service';
import { CreateSchedulePeriodDto } from './dto/create-schedule-period.dto';
import { UpdateSchedulePeriodDto } from './dto/update-schedule-period.dto';
import { SchedulePeriod } from './entities/schedule-period.entity';

@ApiTags('schedule-periods')
@Controller('schedule-periods')
export class SchedulePeriodsController {
  constructor(private readonly schedulePeriodsService: SchedulePeriodsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo período de programación' })
  @ApiResponse({ status: 201, description: 'Período creado exitosamente', type: SchedulePeriod })
  @ApiResponse({ status: 404, description: 'Tienda no encontrada' })
  @ApiResponse({ status: 400, description: 'La fecha de inicio debe ser anterior a la fecha de fin' })
  create(@Body() createSchedulePeriodDto: CreateSchedulePeriodDto): Promise<SchedulePeriod> {
    return this.schedulePeriodsService.create(createSchedulePeriodDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los períodos de programación activos' })
  @ApiResponse({ status: 200, description: 'Lista de períodos', type: [SchedulePeriod] })
  findAll(): Promise<SchedulePeriod[]> {
    return this.schedulePeriodsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un período de programación por ID' })
  @ApiResponse({ status: 200, description: 'Período encontrado', type: SchedulePeriod })
  @ApiResponse({ status: 404, description: 'Período no encontrado' })
  findOne(@Param('id') id: string): Promise<SchedulePeriod> {
    return this.schedulePeriodsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un período de programación' })
  @ApiResponse({ status: 200, description: 'Período actualizado exitosamente', type: SchedulePeriod })
  @ApiResponse({ status: 404, description: 'Período o tienda no encontrada' })
  @ApiResponse({ status: 400, description: 'La fecha de inicio debe ser anterior a la fecha de fin' })
  update(@Param('id') id: string, @Body() updateSchedulePeriodDto: UpdateSchedulePeriodDto): Promise<SchedulePeriod> {
    return this.schedulePeriodsService.update(id, updateSchedulePeriodDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un período de programación (soft delete)' })
  @ApiResponse({ status: 204, description: 'Período eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Período no encontrado' })
  remove(@Param('id') id: string): Promise<void> {
    return this.schedulePeriodsService.remove(id);
  }
}
