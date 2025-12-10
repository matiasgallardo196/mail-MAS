import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { EmployeeAvailabilityService } from './employee-availability.service';
import { EmployeeAvailabilityController } from './employee-availability.controller';
import { Employee } from './entities/employee.entity';
import { EmployeeAvailability } from './entities/employee-availability.entity';
import { Store } from '../stores/entities/store.entity';
import { Station } from '../stations/entities/station.entity';
import { SchedulePeriod } from '../scheduling/entities/schedule-period.entity';
import { ShiftCode } from '../scheduling/entities/shift-code.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, EmployeeAvailability, Store, Station, SchedulePeriod, ShiftCode])],
  controllers: [EmployeesController, EmployeeAvailabilityController],
  providers: [EmployeesService, EmployeeAvailabilityService],
  exports: [EmployeesService, EmployeeAvailabilityService],
})
export class EmployeeModule {}
