import { IsUUID, IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShiftAssignmentDto {
  @ApiProperty({ description: 'Employee ID' })
  @IsUUID()
  employeeId: string;

  @ApiProperty({ description: 'Schedule period ID' })
  @IsUUID()
  schedulePeriodId: string;

  @ApiProperty({ description: 'Store ID' })
  @IsUUID()
  storeId: string;

  @ApiProperty({ description: 'Assignment date', example: '2024-12-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Shift code ID' })
  @IsUUID()
  shiftCodeId: string;

  @ApiProperty({ description: 'Station ID' })
  @IsUUID()
  stationId: string;

  @ApiPropertyOptional({ description: 'Creator ID (planner/system)' })
  @IsOptional()
  @IsString()
  createdBy?: string;
}
