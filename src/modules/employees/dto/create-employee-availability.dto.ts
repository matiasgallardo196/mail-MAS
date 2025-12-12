import { IsUUID, IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeAvailabilityDto {
  @ApiProperty({ description: 'Employee ID' })
  @IsUUID()
  employeeId: string;

  @ApiProperty({ description: 'Schedule period ID' })
  @IsUUID()
  schedulePeriodId: string;

  @ApiProperty({ description: 'Store ID' })
  @IsUUID()
  storeId: string;

  @ApiProperty({ description: 'Availability date', example: '2024-12-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Shift code ID' })
  @IsUUID()
  shiftCodeId: string;

  @ApiPropertyOptional({ description: 'Station ID' })
  @IsOptional()
  @IsUUID()
  stationId?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
