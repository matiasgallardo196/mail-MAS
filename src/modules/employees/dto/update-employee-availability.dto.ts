import { PartialType } from '@nestjs/swagger';
import { CreateEmployeeAvailabilityDto } from './create-employee-availability.dto';

export class UpdateEmployeeAvailabilityDto extends PartialType(CreateEmployeeAvailabilityDto) {}

