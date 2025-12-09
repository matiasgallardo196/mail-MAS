import { IsString, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShiftCodeDto {
  @ApiProperty({ description: 'Código único del turno', example: 'S' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Nombre del turno', example: 'Day Shift' })
  @IsString()
  shiftName: string;

  @ApiPropertyOptional({ description: 'Hora de inicio', example: '06:00:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Hora de fin', example: '14:00:00' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Número de horas', example: 8 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hours?: number;

  @ApiPropertyOptional({ description: 'Descripción del turno' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Si el turno está disponible', default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ description: 'Si es un turno de gestión', default: false })
  @IsOptional()
  @IsBoolean()
  isManagement?: boolean;
}

