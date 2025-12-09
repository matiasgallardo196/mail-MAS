import { IsUUID, IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSchedulePeriodDto {
  @ApiProperty({ description: 'ID de la tienda' })
  @IsUUID()
  storeId: string;

  @ApiPropertyOptional({ description: 'Nombre del período', example: 'Dec 9-22 2024' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Fecha de inicio', example: '2024-12-09' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Fecha de fin', example: '2024-12-22' })
  @IsDateString()
  endDate: string;
}

