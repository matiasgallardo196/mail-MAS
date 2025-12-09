import { PartialType } from '@nestjs/swagger';
import { CreateShiftCodeDto } from './create-shift-code.dto';

export class UpdateShiftCodeDto extends PartialType(CreateShiftCodeDto) {}

