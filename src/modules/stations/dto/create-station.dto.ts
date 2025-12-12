import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStationDto {
  @ApiProperty({ description: 'Unique station code', example: 'KITCHEN' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Station name', example: 'Kitchen' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Station description' })
  @IsOptional()
  @IsString()
  description?: string;
}
