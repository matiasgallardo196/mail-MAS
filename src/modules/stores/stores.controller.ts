import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { Store } from './entities/store.entity';

@ApiTags('stores')
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva tienda' })
  @ApiResponse({ status: 201, description: 'Tienda creada exitosamente', type: Store })
  @ApiResponse({ status: 409, description: 'El código de tienda ya existe' })
  create(@Body() createStoreDto: CreateStoreDto): Promise<Store> {
    return this.storesService.create(createStoreDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las tiendas activas' })
  @ApiResponse({ status: 200, description: 'Lista de tiendas', type: [Store] })
  findAll(): Promise<Store[]> {
    return this.storesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una tienda por ID' })
  @ApiResponse({ status: 200, description: 'Tienda encontrada', type: Store })
  @ApiResponse({ status: 404, description: 'Tienda no encontrada' })
  findOne(@Param('id') id: string): Promise<Store> {
    return this.storesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una tienda' })
  @ApiResponse({ status: 200, description: 'Tienda actualizada exitosamente', type: Store })
  @ApiResponse({ status: 404, description: 'Tienda no encontrada' })
  @ApiResponse({ status: 409, description: 'El código de tienda ya existe' })
  update(@Param('id') id: string, @Body() updateStoreDto: UpdateStoreDto): Promise<Store> {
    return this.storesService.update(id, updateStoreDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una tienda (soft delete)' })
  @ApiResponse({ status: 204, description: 'Tienda eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Tienda no encontrada' })
  remove(@Param('id') id: string): Promise<void> {
    return this.storesService.remove(id);
  }
}
