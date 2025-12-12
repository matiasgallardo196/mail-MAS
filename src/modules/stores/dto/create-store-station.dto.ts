import { IsUUID, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStoreStationDto {
  @ApiProperty({ description: 'Store ID' })
  @IsUUID()
  storeId: string;

  @ApiProperty({ description: 'Station ID' })
  @IsUUID()
  stationId: string;

  @ApiPropertyOptional({ description: 'Whether the station is enabled for this store', default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
