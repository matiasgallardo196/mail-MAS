import { IsString, IsEnum, IsInt, IsUUID, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentType, EmployeeRole } from '../../../common/enums/enums';

export class CreateEmployeeDto {
  @ApiProperty({ description: 'Código externo único del empleado', example: 1001 })
  @IsInt()
  @Min(1)
  externalCode: number;

  @ApiProperty({ description: 'Nombre del empleado' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Apellido del empleado' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Tipo de empleo', enum: EmploymentType })
  @IsEnum(EmploymentType)
  employmentType: EmploymentType;

  @ApiProperty({ description: 'Rol del empleado', enum: EmployeeRole })
  @IsEnum(EmployeeRole)
  role: EmployeeRole;

  @ApiProperty({ description: 'ID de la tienda por defecto' })
  @IsUUID()
  defaultStoreId: string;

  @ApiPropertyOptional({ description: 'ID de la estación por defecto' })
  @IsOptional()
  @IsUUID()
  defaultStationId?: string;
}
