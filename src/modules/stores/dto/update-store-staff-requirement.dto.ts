import { PartialType } from '@nestjs/swagger';
import { CreateStoreStaffRequirementDto } from './create-store-staff-requirement.dto';

export class UpdateStoreStaffRequirementDto extends PartialType(CreateStoreStaffRequirementDto) {}
