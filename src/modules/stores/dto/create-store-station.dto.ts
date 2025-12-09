import { IsUUID, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStoreStationDto {
  @ApiProperty({ description: 'ID de la tienda' })
  @IsUUID()
  storeId: string;

  @ApiProperty({ description: 'ID de la estación' })
  @IsUUID()
  stationId: string;

  @ApiPropertyOptional({ description: 'Si la estación está habilitada en la tienda', default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

