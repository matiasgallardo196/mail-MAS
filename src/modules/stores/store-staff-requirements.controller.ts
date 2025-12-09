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
import { StoreStaffRequirementsService } from './store-staff-requirements.service';
import { CreateStoreStaffRequirementDto } from './dto/create-store-staff-requirement.dto';
import { UpdateStoreStaffRequirementDto } from './dto/update-store-staff-requirement.dto';
import { StoreStaffRequirement } from './entities/store-staff-requirement.entity';

@ApiTags('store-staff-requirements')
@Controller('store-staff-requirements')
export class StoreStaffRequirementsController {
  constructor(
    private readonly storeStaffRequirementsService: StoreStaffRequirementsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo requisito de personal' })
  @ApiResponse({ status: 201, description: 'Requisito creado exitosamente', type: StoreStaffRequirement })
  @ApiResponse({ status: 404, description: 'Tienda o estación no encontrada' })
  @ApiResponse({ status: 409, description: 'El requisito ya existe para esta combinación' })
  create(
    @Body() createRequirementDto: CreateStoreStaffRequirementDto,
  ): Promise<StoreStaffRequirement> {
    return this.storeStaffRequirementsService.create(createRequirementDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los requisitos de personal activos' })
  @ApiResponse({ status: 200, description: 'Lista de requisitos', type: [StoreStaffRequirement] })
  findAll(): Promise<StoreStaffRequirement[]> {
    return this.storeStaffRequirementsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un requisito de personal por ID' })
  @ApiResponse({ status: 200, description: 'Requisito encontrado', type: StoreStaffRequirement })
  @ApiResponse({ status: 404, description: 'Requisito no encontrado' })
  findOne(@Param('id') id: string): Promise<StoreStaffRequirement> {
    return this.storeStaffRequirementsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un requisito de personal' })
  @ApiResponse({ status: 200, description: 'Requisito actualizado exitosamente', type: StoreStaffRequirement })
  @ApiResponse({ status: 404, description: 'Requisito, tienda o estación no encontrada' })
  @ApiResponse({ status: 409, description: 'El nuevo requisito ya existe para esta combinación' })
  update(
    @Param('id') id: string,
    @Body() updateRequirementDto: UpdateStoreStaffRequirementDto,
  ): Promise<StoreStaffRequirement> {
    return this.storeStaffRequirementsService.update(id, updateRequirementDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un requisito de personal (soft delete)' })
  @ApiResponse({ status: 204, description: 'Requisito eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Requisito no encontrado' })
  remove(@Param('id') id: string): Promise<void> {
    return this.storeStaffRequirementsService.remove(id);
  }
}

