import { IsString, IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateRosterDto {
  @ApiProperty({
    description: 'Store identifier',
    example: 'store-001',
  })
  @IsString()
  storeId: string;

  @ApiProperty({
    description: 'Start date in ISO 8601 format',
    example: '2024-01-01T00:00:00Z',
  })
  @IsISO8601()
  startDate: string;

  @ApiProperty({
    description: 'End date in ISO 8601 format',
    example: '2024-01-14T23:59:59Z',
  })
  @IsISO8601()
  endDate: string;
}

