import { IsString, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShiftCodeDto {
  @ApiProperty({ description: 'Unique shift code', example: 'S' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Shift name', example: 'Day Shift' })
  @IsString()
  shiftName: string;

  @ApiPropertyOptional({ description: 'Start time', example: '06:00:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time', example: '14:00:00' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Number of hours', example: 8 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hours?: number;

  @ApiPropertyOptional({ description: 'Shift description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether the shift is available', default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ description: 'Whether it is a management shift', default: false })
  @IsOptional()
  @IsBoolean()
  isManagement?: boolean;
}
