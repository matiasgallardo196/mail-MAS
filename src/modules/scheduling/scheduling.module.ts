import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulingOrchestrator } from '../../agents/orchestrator.service';
import { EmployeeModule } from '../employees/employee.module';
import { StoreModule } from '../stores/store.module';
import { ShiftCodesService } from './shift-codes.service';
import { ShiftCodesController } from './shift-codes.controller';
import { SchedulePeriodsService } from './schedule-periods.service';
import { SchedulePeriodsController } from './schedule-periods.controller';
import { ShiftAssignmentsService } from './shift-assignments.service';
import { ShiftAssignmentsController } from './shift-assignments.controller';
import { ShiftCode } from './entities/shift-code.entity';
import { SchedulePeriod } from './entities/schedule-period.entity';
import { ShiftAssignment } from './entities/shift-assignment.entity';
import { Store } from '../stores/entities/store.entity';
import { Employee } from '../employees/entities/employee.entity';
import { Station } from '../stations/entities/station.entity';

const logger = new Logger('SchedulingModule');


@Module({
  imports: [

    EmployeeModule,
    StoreModule,
    TypeOrmModule.forFeature([ShiftCode, SchedulePeriod, ShiftAssignment, Store, Employee, Station]),
  ],
  controllers: [ShiftCodesController, SchedulePeriodsController, ShiftAssignmentsController],
  providers: [SchedulingOrchestrator, ShiftCodesService, SchedulePeriodsService, ShiftAssignmentsService],
  exports: [SchedulingOrchestrator, ShiftCodesService, SchedulePeriodsService, ShiftAssignmentsService],
})
export class SchedulingModule { }
