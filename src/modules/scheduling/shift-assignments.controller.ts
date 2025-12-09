import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ShiftAssignmentsService } from './shift-assignments.service';
import { CreateShiftAssignmentDto } from './dto/create-shift-assignment.dto';
import { UpdateShiftAssignmentDto } from './dto/update-shift-assignment.dto';
import { ShiftAssignment } from './entities/shift-assignment.entity';

@ApiTags('shift-assignments')
@Controller('shift-assignments')
export class ShiftAssignmentsController {
  constructor(
    private readonly shiftAssignmentsService: ShiftAssignmentsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva asignación de turno' })
  @ApiResponse({ status: 201, description: 'Asignación creada exitosamente', type: ShiftAssignment })
  @ApiResponse({ status: 404, description: 'Relación no encontrada' })
  @ApiResponse({ status: 409, description: 'La asignación ya existe' })
  create(@Body() createAssignmentDto: CreateShiftAssignmentDto): Promise<ShiftAssignment> {
    return this.shiftAssignmentsService.create(createAssignmentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las asignaciones activas' })
  @ApiResponse({ status: 200, description: 'Lista de asignaciones', type: [ShiftAssignment] })
  findAll(): Promise<ShiftAssignment[]> {
    return this.shiftAssignmentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una asignación por ID' })
  @ApiResponse({ status: 200, description: 'Asignación encontrada', type: ShiftAssignment })
  @ApiResponse({ status: 404, description: 'Asignación no encontrada' })
  findOne(@Param('id') id: string): Promise<ShiftAssignment> {
    return this.shiftAssignmentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una asignación' })
  @ApiResponse({ status: 200, description: 'Asignación actualizada exitosamente', type: ShiftAssignment })
  @ApiResponse({ status: 404, description: 'Asignación o relación no encontrada' })
  @ApiResponse({ status: 409, description: 'La nueva asignación ya existe' })
  update(
    @Param('id') id: string,
    @Body() updateAssignmentDto: UpdateShiftAssignmentDto,
  ): Promise<ShiftAssignment> {
    return this.shiftAssignmentsService.update(id, updateAssignmentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una asignación (soft delete)' })
  @ApiResponse({ status: 204, description: 'Asignación eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Asignación no encontrada' })
  remove(@Param('id') id: string): Promise<void> {
    return this.shiftAssignmentsService.remove(id);
  }
}

