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
  @ApiOperation({ summary: 'Create a new employee availability' })
  @ApiResponse({ status: 201, description: 'Availability created successfully', type: EmployeeAvailability })
  @ApiResponse({ status: 404, description: 'Employee, period, store, shift code or station not found' })
  @ApiResponse({ status: 409, description: 'Availability already exists for this employee, period and date' })
  create(@Body() createAvailabilityDto: CreateEmployeeAvailabilityDto): Promise<EmployeeAvailability> {
    return this.employeeAvailabilityService.create(createAvailabilityDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active availabilities' })
  @ApiResponse({ status: 200, description: 'List of availabilities', type: [EmployeeAvailability] })
  findAll(): Promise<EmployeeAvailability[]> {
    return this.employeeAvailabilityService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an availability by ID' })
  @ApiResponse({ status: 200, description: 'Availability found', type: EmployeeAvailability })
  @ApiResponse({ status: 404, description: 'Availability not found' })
  findOne(@Param('id') id: string): Promise<EmployeeAvailability> {
    return this.employeeAvailabilityService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an availability' })
  @ApiResponse({ status: 200, description: 'Availability updated successfully', type: EmployeeAvailability })
  @ApiResponse({ status: 404, description: 'Availability or relation not found' })
  @ApiResponse({ status: 409, description: 'Availability already exists for this employee, period and date' })
  update(
    @Param('id') id: string,
    @Body() updateAvailabilityDto: UpdateEmployeeAvailabilityDto,
  ): Promise<EmployeeAvailability> {
    return this.employeeAvailabilityService.update(id, updateAvailabilityDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an availability (soft delete)' })
  @ApiResponse({ status: 204, description: 'Availability deleted successfully' })
  @ApiResponse({ status: 404, description: 'Availability not found' })
  remove(@Param('id') id: string): Promise<void> {
    return this.employeeAvailabilityService.remove(id);
  }
}
