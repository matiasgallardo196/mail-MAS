import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StationsService } from './stations.service';
import { CreateStationDto } from './dto/create-station.dto';
import { UpdateStationDto } from './dto/update-station.dto';
import { Station } from './entities/station.entity';

@ApiTags('stations')
@Controller('stations')
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva estación' })
  @ApiResponse({ status: 201, description: 'Estación creada exitosamente', type: Station })
  @ApiResponse({ status: 409, description: 'El código de estación ya existe' })
  create(@Body() createStationDto: CreateStationDto): Promise<Station> {
    return this.stationsService.create(createStationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las estaciones activas' })
  @ApiResponse({ status: 200, description: 'Lista de estaciones', type: [Station] })
  findAll(): Promise<Station[]> {
    return this.stationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una estación por ID' })
  @ApiResponse({ status: 200, description: 'Estación encontrada', type: Station })
  @ApiResponse({ status: 404, description: 'Estación no encontrada' })
  findOne(@Param('id') id: string): Promise<Station> {
    return this.stationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una estación' })
  @ApiResponse({ status: 200, description: 'Estación actualizada exitosamente', type: Station })
  @ApiResponse({ status: 404, description: 'Estación no encontrada' })
  @ApiResponse({ status: 409, description: 'El código de estación ya existe' })
  update(@Param('id') id: string, @Body() updateStationDto: UpdateStationDto): Promise<Station> {
    return this.stationsService.update(id, updateStationDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una estación (soft delete)' })
  @ApiResponse({ status: 204, description: 'Estación eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Estación no encontrada' })
  remove(@Param('id') id: string): Promise<void> {
    return this.stationsService.remove(id);
  }
}
