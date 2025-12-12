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
  @ApiOperation({ summary: 'Create a new Store-Station relationship' })
  @ApiResponse({ status: 201, description: 'Relationship created successfully', type: StoreStation })
  @ApiResponse({ status: 404, description: 'Store or station not found' })
  @ApiResponse({ status: 409, description: 'Relationship already exists' })
  create(@Body() createStoreStationDto: CreateStoreStationDto): Promise<StoreStation> {
    return this.storeStationsService.create(createStoreStationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active Store-Station relationships' })
  @ApiResponse({ status: 200, description: 'List of relationships', type: [StoreStation] })
  findAll(): Promise<StoreStation[]> {
    return this.storeStationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a Store-Station relationship by ID' })
  @ApiResponse({ status: 200, description: 'Relationship found', type: StoreStation })
  @ApiResponse({ status: 404, description: 'Relationship not found' })
  findOne(@Param('id') id: string): Promise<StoreStation> {
    return this.storeStationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a Store-Station relationship' })
  @ApiResponse({ status: 200, description: 'Relationship updated successfully', type: StoreStation })
  @ApiResponse({ status: 404, description: 'Relationship, store or station not found' })
  @ApiResponse({ status: 409, description: 'New relationship already exists' })
  update(@Param('id') id: string, @Body() updateStoreStationDto: UpdateStoreStationDto): Promise<StoreStation> {
    return this.storeStationsService.update(id, updateStoreStationDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a Store-Station relationship (soft delete)' })
  @ApiResponse({ status: 204, description: 'Relationship deleted successfully' })
  @ApiResponse({ status: 404, description: 'Relationship not found' })
  remove(@Param('id') id: string): Promise<void> {
    return this.storeStationsService.remove(id);
  }
}
