import { PartialType } from '@nestjs/swagger';
import { CreateStoreStationDto } from './create-store-station.dto';

export class UpdateStoreStationDto extends PartialType(CreateStoreStationDto) {}
