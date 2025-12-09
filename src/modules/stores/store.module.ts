import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { StoreStationsService } from './store-stations.service';
import { StoreStationsController } from './store-stations.controller';
import { StoreStaffRequirementsService } from './store-staff-requirements.service';
import { StoreStaffRequirementsController } from './store-staff-requirements.controller';
import { Store } from './entities/store.entity';
import { StoreStation } from './entities/store-station.entity';
import { StoreStaffRequirement } from './entities/store-staff-requirement.entity';
import { Station } from '../stations/entities/station.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Store, StoreStation, StoreStaffRequirement, Station]),
  ],
  controllers: [
    StoresController,
    StoreStationsController,
    StoreStaffRequirementsController,
  ],
  providers: [
    StoresService,
    StoreStationsService,
    StoreStaffRequirementsService,
  ],
  exports: [StoresService, StoreStationsService, StoreStaffRequirementsService],
})
export class StoreModule {}
