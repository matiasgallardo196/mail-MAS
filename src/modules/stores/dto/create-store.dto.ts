import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StoreLocationType } from '../../../common/enums/enums';

export class CreateStoreDto {
  @ApiProperty({ description: 'Unique store code', example: 'Store_1' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Store name', example: 'CBD Core Area' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Location type', enum: StoreLocationType })
  @IsEnum(StoreLocationType)
  locationType: StoreLocationType;

  @ApiPropertyOptional({ description: 'Revenue level', example: 'High' })
  @IsOptional()
  @IsString()
  revenueLevel?: string;

  @ApiPropertyOptional({ description: 'Store type', example: 'Non-24H' })
  @IsOptional()
  @IsString()
  storeType?: string;

  @ApiPropertyOptional({ description: 'Opening time', example: '06:00:00' })
  @IsOptional()
  @IsString()
  openingTime?: string;

  @ApiPropertyOptional({ description: 'Closing time', example: '22:00:00' })
  @IsOptional()
  @IsString()
  closingTime?: string;
}
