import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStationDto {
  @ApiProperty({ description: 'Código único de la estación', example: 'KITCHEN' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Nombre de la estación', example: 'Kitchen' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Descripción de la estación' })
  @IsOptional()
  @IsString()
  description?: string;
}

