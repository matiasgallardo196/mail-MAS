import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StoreLocationType } from '../../../common/enums/enums';

export class CreateStoreDto {
  @ApiProperty({ description: 'Código único de la tienda', example: 'Store_1' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Nombre de la tienda', example: 'CBD Core Area' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Tipo de ubicación', enum: StoreLocationType })
  @IsEnum(StoreLocationType)
  locationType: StoreLocationType;

  @ApiPropertyOptional({ description: 'Nivel de ingresos', example: 'High' })
  @IsOptional()
  @IsString()
  revenueLevel?: string;

  @ApiPropertyOptional({ description: 'Tipo de tienda', example: 'Non-24H' })
  @IsOptional()
  @IsString()
  storeType?: string;

  @ApiPropertyOptional({ description: 'Hora de apertura', example: '06:00:00' })
  @IsOptional()
  @IsString()
  openingTime?: string;

  @ApiPropertyOptional({ description: 'Hora de cierre', example: '22:00:00' })
  @IsOptional()
  @IsString()
  closingTime?: string;
}
