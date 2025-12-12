import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StoreStaffRequirementsService } from './store-staff-requirements.service';
import { CreateStoreStaffRequirementDto } from './dto/create-store-staff-requirement.dto';
import { UpdateStoreStaffRequirementDto } from './dto/update-store-staff-requirement.dto';
import { StoreStaffRequirement } from './entities/store-staff-requirement.entity';

@ApiTags('store-staff-requirements')
@Controller('store-staff-requirements')
export class StoreStaffRequirementsController {
  constructor(private readonly storeStaffRequirementsService: StoreStaffRequirementsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new staff requirement' })
  @ApiResponse({ status: 201, description: 'Requirement created successfully', type: StoreStaffRequirement })
  @ApiResponse({ status: 404, description: 'Store or station not found' })
  @ApiResponse({ status: 409, description: 'Requirement already exists for this combination' })
  create(@Body() createRequirementDto: CreateStoreStaffRequirementDto): Promise<StoreStaffRequirement> {
    return this.storeStaffRequirementsService.create(createRequirementDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active staff requirements' })
  @ApiResponse({ status: 200, description: 'List of requirements', type: [StoreStaffRequirement] })
  findAll(): Promise<StoreStaffRequirement[]> {
    return this.storeStaffRequirementsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a staff requirement by ID' })
  @ApiResponse({ status: 200, description: 'Requirement found', type: StoreStaffRequirement })
  @ApiResponse({ status: 404, description: 'Requirement not found' })
  findOne(@Param('id') id: string): Promise<StoreStaffRequirement> {
    return this.storeStaffRequirementsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a staff requirement' })
  @ApiResponse({ status: 200, description: 'Requirement updated successfully', type: StoreStaffRequirement })
  @ApiResponse({ status: 404, description: 'Requirement, store or station not found' })
  @ApiResponse({ status: 409, description: 'New requirement already exists for this combination' })
  update(
    @Param('id') id: string,
    @Body() updateRequirementDto: UpdateStoreStaffRequirementDto,
  ): Promise<StoreStaffRequirement> {
    return this.storeStaffRequirementsService.update(id, updateRequirementDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a staff requirement (soft delete)' })
  @ApiResponse({ status: 204, description: 'Requirement deleted successfully' })
  @ApiResponse({ status: 404, description: 'Requirement not found' })
  remove(@Param('id') id: string): Promise<void> {
    return this.storeStaffRequirementsService.remove(id);
  }
}
