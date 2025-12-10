import { IsUUID, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PeriodType } from '../../../common/enums/enums';

export class CreateStoreStaffRequirementDto {
  @ApiProperty({ description: 'ID de la tienda' })
  @IsUUID()
  storeId: string;

  @ApiProperty({ description: 'Tipo de período', enum: PeriodType })
  @IsEnum(PeriodType)
  periodType: PeriodType;

  @ApiProperty({ description: 'ID de la estación' })
  @IsUUID()
  stationId: string;

  @ApiProperty({ description: 'Número de personal requerido', minimum: 0 })
  @IsInt()
  @Min(0)
  requiredStaff: number;
}
