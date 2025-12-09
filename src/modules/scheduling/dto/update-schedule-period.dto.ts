import { PartialType } from '@nestjs/swagger';
import { CreateSchedulePeriodDto } from './create-schedule-period.dto';

export class UpdateSchedulePeriodDto extends PartialType(CreateSchedulePeriodDto) {}

