import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmployeeAvailabilityService } from './employee-availability.service';
import { CreateEmployeeAvailabilityDto } from './dto/create-employee-availability.dto';
import { UpdateEmployeeAvailabilityDto } from './dto/update-employee-availability.dto';
import { EmployeeAvailability } from './entities/employee-availability.entity';

@ApiTags('employee-availability')
@Controller('employee-availability')
export class EmployeeAvailabilityController {
  constructor(private readonly employeeAvailabilityService: EmployeeAvailabilityService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva disponibilidad de empleado' })
  @ApiResponse({ status: 201, description: 'Disponibilidad creada exitosamente', type: EmployeeAvailability })
  @ApiResponse({ status: 404, description: 'Empleado, período, tienda, código de turno o estación no encontrado' })
  @ApiResponse({ status: 409, description: 'Ya existe una disponibilidad para este empleado, período y fecha' })
  create(@Body() createAvailabilityDto: CreateEmployeeAvailabilityDto): Promise<EmployeeAvailability> {
    return this.employeeAvailabilityService.create(createAvailabilityDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las disponibilidades activas' })
  @ApiResponse({ status: 200, description: 'Lista de disponibilidades', type: [EmployeeAvailability] })
  findAll(): Promise<EmployeeAvailability[]> {
    return this.employeeAvailabilityService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una disponibilidad por ID' })
  @ApiResponse({ status: 200, description: 'Disponibilidad encontrada', type: EmployeeAvailability })
  @ApiResponse({ status: 404, description: 'Disponibilidad no encontrada' })
  findOne(@Param('id') id: string): Promise<EmployeeAvailability> {
    return this.employeeAvailabilityService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una disponibilidad' })
  @ApiResponse({ status: 200, description: 'Disponibilidad actualizada exitosamente', type: EmployeeAvailability })
  @ApiResponse({ status: 404, description: 'Disponibilidad o relación no encontrada' })
  @ApiResponse({ status: 409, description: 'Ya existe una disponibilidad para este empleado, período y fecha' })
  update(
    @Param('id') id: string,
    @Body() updateAvailabilityDto: UpdateEmployeeAvailabilityDto,
  ): Promise<EmployeeAvailability> {
    return this.employeeAvailabilityService.update(id, updateAvailabilityDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una disponibilidad (soft delete)' })
  @ApiResponse({ status: 204, description: 'Disponibilidad eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Disponibilidad no encontrada' })
  remove(@Param('id') id: string): Promise<void> {
    return this.employeeAvailabilityService.remove(id);
  }
}
