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
import { SchedulingPolicy } from './entities/scheduling-policy.entity';
import { EmploymentTypeHoursPolicy } from './entities/employment-type-hours-policy.entity';
import { SchedulingPolicyService } from './scheduling-policy.service';

import { SchedulingOrchestratorController } from './orchestrator.controller';

const logger = new Logger('SchedulingModule');

@Module({
  imports: [
    EmployeeModule,
    StoreModule,
    TypeOrmModule.forFeature([
      ShiftCode,
      SchedulePeriod,
      ShiftAssignment,
      Store,
      Employee,
      Station,
      SchedulingPolicy,
      EmploymentTypeHoursPolicy,
    ]),
  ],
  controllers: [
    ShiftCodesController,
    SchedulePeriodsController,
    ShiftAssignmentsController,
    SchedulingOrchestratorController,
  ],
  providers: [
    SchedulingOrchestrator,
    ShiftCodesService,
    SchedulePeriodsService,
    ShiftAssignmentsService,
    SchedulingPolicyService,
  ],
  exports: [
    SchedulingOrchestrator,
    ShiftCodesService,
    SchedulePeriodsService,
    ShiftAssignmentsService,
    SchedulingPolicyService,
  ],
})
export class SchedulingModule { }
