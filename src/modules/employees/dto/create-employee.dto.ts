import { IsString, IsEnum, IsInt, IsUUID, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentType, EmployeeRole } from '../../../common/enums/enums';

export class CreateEmployeeDto {
  @ApiProperty({ description: 'Unique external employee code', example: 1001 })
  @IsInt()
  @Min(1)
  externalCode: number;

  @ApiProperty({ description: 'Employee first name' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Employee last name' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Employment type', enum: EmploymentType })
  @IsEnum(EmploymentType)
  employmentType: EmploymentType;

  @ApiProperty({ description: 'Employee role', enum: EmployeeRole })
  @IsEnum(EmployeeRole)
  role: EmployeeRole;

  @ApiProperty({ description: 'Default store ID' })
  @IsUUID()
  defaultStoreId: string;

  @ApiPropertyOptional({ description: 'Default station ID' })
  @IsOptional()
  @IsUUID()
  defaultStationId?: string;
}
