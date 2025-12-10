import { IsUUID, IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeAvailabilityDto {
  @ApiProperty({ description: 'ID del empleado' })
  @IsUUID()
  employeeId: string;

  @ApiProperty({ description: 'ID del período de programación' })
  @IsUUID()
  schedulePeriodId: string;

  @ApiProperty({ description: 'ID de la tienda' })
  @IsUUID()
  storeId: string;

  @ApiProperty({ description: 'Fecha de disponibilidad', example: '2024-12-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'ID del código de turno' })
  @IsUUID()
  shiftCodeId: string;

  @ApiPropertyOptional({ description: 'ID de la estación' })
  @IsOptional()
  @IsUUID()
  stationId?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsOptional()
  @IsString()
  notes?: string;
}
