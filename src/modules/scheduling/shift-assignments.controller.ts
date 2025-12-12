import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ShiftAssignmentsService } from './shift-assignments.service';
import { CreateShiftAssignmentDto } from './dto/create-shift-assignment.dto';
import { UpdateShiftAssignmentDto } from './dto/update-shift-assignment.dto';
import { ShiftAssignment } from './entities/shift-assignment.entity';

@ApiTags('shift-assignments')
@Controller('shift-assignments')
export class ShiftAssignmentsController {
  constructor(private readonly shiftAssignmentsService: ShiftAssignmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new shift assignment' })
  @ApiResponse({ status: 201, description: 'Assignment created successfully', type: ShiftAssignment })
  @ApiResponse({ status: 404, description: 'Relation not found' })
  @ApiResponse({ status: 409, description: 'Assignment already exists' })
  create(@Body() createAssignmentDto: CreateShiftAssignmentDto): Promise<ShiftAssignment> {
    return this.shiftAssignmentsService.create(createAssignmentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active assignments' })
  @ApiResponse({ status: 200, description: 'List of assignments', type: [ShiftAssignment] })
  findAll(): Promise<ShiftAssignment[]> {
    return this.shiftAssignmentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an assignment by ID' })
  @ApiResponse({ status: 200, description: 'Assignment found', type: ShiftAssignment })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  findOne(@Param('id') id: string): Promise<ShiftAssignment> {
    return this.shiftAssignmentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an assignment' })
  @ApiResponse({ status: 200, description: 'Assignment updated successfully', type: ShiftAssignment })
  @ApiResponse({ status: 404, description: 'Assignment or relation not found' })
  @ApiResponse({ status: 409, description: 'New assignment already exists' })
  update(@Param('id') id: string, @Body() updateAssignmentDto: UpdateShiftAssignmentDto): Promise<ShiftAssignment> {
    return this.shiftAssignmentsService.update(id, updateAssignmentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an assignment (soft delete)' })
  @ApiResponse({ status: 204, description: 'Assignment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  remove(@Param('id') id: string): Promise<void> {
    return this.shiftAssignmentsService.remove(id);
  }
}
