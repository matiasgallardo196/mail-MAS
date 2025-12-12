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
  @ApiOperation({ summary: 'Create a new station' })
  @ApiResponse({ status: 201, description: 'Station created successfully', type: Station })
  @ApiResponse({ status: 409, description: 'Station code already exists' })
  create(@Body() createStationDto: CreateStationDto): Promise<Station> {
    return this.stationsService.create(createStationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active stations' })
  @ApiResponse({ status: 200, description: 'List of stations', type: [Station] })
  findAll(): Promise<Station[]> {
    return this.stationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a station by ID' })
  @ApiResponse({ status: 200, description: 'Station found', type: Station })
  @ApiResponse({ status: 404, description: 'Station not found' })
  findOne(@Param('id') id: string): Promise<Station> {
    return this.stationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a station' })
  @ApiResponse({ status: 200, description: 'Station updated successfully', type: Station })
  @ApiResponse({ status: 404, description: 'Station not found' })
  @ApiResponse({ status: 409, description: 'Station code already exists' })
  update(@Param('id') id: string, @Body() updateStationDto: UpdateStationDto): Promise<Station> {
    return this.stationsService.update(id, updateStationDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a station (soft delete)' })
  @ApiResponse({ status: 204, description: 'Station deleted successfully' })
  @ApiResponse({ status: 404, description: 'Station not found' })
  remove(@Param('id') id: string): Promise<void> {
    return this.stationsService.remove(id);
  }
}
