import { IsUUID, IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShiftAssignmentDto {
  @ApiProperty({ description: 'ID del empleado' })
  @IsUUID()
  employeeId: string;

  @ApiProperty({ description: 'ID del período de programación' })
  @IsUUID()
  schedulePeriodId: string;

  @ApiProperty({ description: 'ID de la tienda' })
  @IsUUID()
  storeId: string;

  @ApiProperty({ description: 'Fecha de la asignación', example: '2024-12-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'ID del código de turno' })
  @IsUUID()
  shiftCodeId: string;

  @ApiProperty({ description: 'ID de la estación' })
  @IsUUID()
  stationId: string;

  @ApiPropertyOptional({ description: 'ID del creador (planner/sistema)' })
  @IsOptional()
  @IsString()
  createdBy?: string;
}
