import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StoreStationsService } from './store-stations.service';
import { CreateStoreStationDto } from './dto/create-store-station.dto';
import { UpdateStoreStationDto } from './dto/update-store-station.dto';
import { StoreStation } from './entities/store-station.entity';

@ApiTags('store-stations')
@Controller('store-stations')
export class StoreStationsController {
  constructor(private readonly storeStationsService: StoreStationsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva relación Store-Station' })
  @ApiResponse({ status: 201, description: 'Relación creada exitosamente', type: StoreStation })
  @ApiResponse({ status: 404, description: 'Tienda o estación no encontrada' })
  @ApiResponse({ status: 409, description: 'La relación ya existe' })
  create(@Body() createStoreStationDto: CreateStoreStationDto): Promise<StoreStation> {
    return this.storeStationsService.create(createStoreStationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las relaciones Store-Station activas' })
  @ApiResponse({ status: 200, description: 'Lista de relaciones', type: [StoreStation] })
  findAll(): Promise<StoreStation[]> {
    return this.storeStationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una relación Store-Station por ID' })
  @ApiResponse({ status: 200, description: 'Relación encontrada', type: StoreStation })
  @ApiResponse({ status: 404, description: 'Relación no encontrada' })
  findOne(@Param('id') id: string): Promise<StoreStation> {
    return this.storeStationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una relación Store-Station' })
  @ApiResponse({ status: 200, description: 'Relación actualizada exitosamente', type: StoreStation })
  @ApiResponse({ status: 404, description: 'Relación, tienda o estación no encontrada' })
  @ApiResponse({ status: 409, description: 'La nueva relación ya existe' })
  update(@Param('id') id: string, @Body() updateStoreStationDto: UpdateStoreStationDto): Promise<StoreStation> {
    return this.storeStationsService.update(id, updateStoreStationDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una relación Store-Station (soft delete)' })
  @ApiResponse({ status: 204, description: 'Relación eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Relación no encontrada' })
  remove(@Param('id') id: string): Promise<void> {
    return this.storeStationsService.remove(id);
  }
}
