import { IsUUID, IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSchedulePeriodDto {
  @ApiProperty({ description: 'Store ID' })
  @IsUUID()
  storeId: string;

  @ApiPropertyOptional({ description: 'Period name', example: 'Dec 9-22 2024' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Start date', example: '2024-12-09' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date', example: '2024-12-22' })
  @IsDateString()
  endDate: string;
}
