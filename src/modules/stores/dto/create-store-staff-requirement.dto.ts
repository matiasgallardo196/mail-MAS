import { IsUUID, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PeriodType } from '../../../common/enums/enums';

export class CreateStoreStaffRequirementDto {
  @ApiProperty({ description: 'Store ID' })
  @IsUUID()
  storeId: string;

  @ApiProperty({ description: 'Period type', enum: PeriodType })
  @IsEnum(PeriodType)
  periodType: PeriodType;

  @ApiProperty({ description: 'Station ID' })
  @IsUUID()
  stationId: string;

  @ApiProperty({ description: 'Number of required staff', minimum: 0 })
  @IsInt()
  @Min(0)
  requiredStaff: number;
}
