import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ShiftCodesService } from './shift-codes.service';
import { CreateShiftCodeDto } from './dto/create-shift-code.dto';
import { UpdateShiftCodeDto } from './dto/update-shift-code.dto';
import { ShiftCode } from './entities/shift-code.entity';

@ApiTags('shift-codes')
@Controller('shift-codes')
export class ShiftCodesController {
  constructor(private readonly shiftCodesService: ShiftCodesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new shift code' })
  @ApiResponse({ status: 201, description: 'Shift code created successfully', type: ShiftCode })
  @ApiResponse({ status: 409, description: 'Shift code already exists' })
  create(@Body() createShiftCodeDto: CreateShiftCodeDto): Promise<ShiftCode> {
    return this.shiftCodesService.create(createShiftCodeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active shift codes' })
  @ApiResponse({ status: 200, description: 'List of shift codes', type: [ShiftCode] })
  findAll(): Promise<ShiftCode[]> {
    return this.shiftCodesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a shift code by ID' })
  @ApiResponse({ status: 200, description: 'Shift code found', type: ShiftCode })
  @ApiResponse({ status: 404, description: 'Shift code not found' })
  findOne(@Param('id') id: string): Promise<ShiftCode> {
    return this.shiftCodesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a shift code' })
  @ApiResponse({ status: 200, description: 'Shift code updated successfully', type: ShiftCode })
  @ApiResponse({ status: 404, description: 'Shift code not found' })
  @ApiResponse({ status: 409, description: 'Shift code already exists' })
  update(@Param('id') id: string, @Body() updateShiftCodeDto: UpdateShiftCodeDto): Promise<ShiftCode> {
    return this.shiftCodesService.update(id, updateShiftCodeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a shift code (soft delete)' })
  @ApiResponse({ status: 204, description: 'Shift code deleted successfully' })
  @ApiResponse({ status: 404, description: 'Shift code not found' })
  remove(@Param('id') id: string): Promise<void> {
    return this.shiftCodesService.remove(id);
  }
}
