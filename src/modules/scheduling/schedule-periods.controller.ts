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
  @ApiOperation({ summary: 'Create a new schedule period' })
  @ApiResponse({ status: 201, description: 'Period created successfully', type: SchedulePeriod })
  @ApiResponse({ status: 404, description: 'Store not found' })
  @ApiResponse({ status: 400, description: 'Start date must be before end date' })
  create(@Body() createSchedulePeriodDto: CreateSchedulePeriodDto): Promise<SchedulePeriod> {
    return this.schedulePeriodsService.create(createSchedulePeriodDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active schedule periods' })
  @ApiResponse({ status: 200, description: 'List of periods', type: [SchedulePeriod] })
  findAll(): Promise<SchedulePeriod[]> {
    return this.schedulePeriodsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a schedule period by ID' })
  @ApiResponse({ status: 200, description: 'Period found', type: SchedulePeriod })
  @ApiResponse({ status: 404, description: 'Period not found' })
  findOne(@Param('id') id: string): Promise<SchedulePeriod> {
    return this.schedulePeriodsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a schedule period' })
  @ApiResponse({ status: 200, description: 'Period updated successfully', type: SchedulePeriod })
  @ApiResponse({ status: 404, description: 'Period or store not found' })
  @ApiResponse({ status: 400, description: 'Start date must be before end date' })
  update(@Param('id') id: string, @Body() updateSchedulePeriodDto: UpdateSchedulePeriodDto): Promise<SchedulePeriod> {
    return this.schedulePeriodsService.update(id, updateSchedulePeriodDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a schedule period (soft delete)' })
  @ApiResponse({ status: 204, description: 'Period deleted successfully' })
  @ApiResponse({ status: 404, description: 'Period not found' })
  remove(@Param('id') id: string): Promise<void> {
    return this.schedulePeriodsService.remove(id);
  }
}
