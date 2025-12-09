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
let openAiImports = [] as any[];
try {
  // Require dynamically so module is optional in dev environments without the SDK
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const OpenAIModule = require('@openai/agents-nest').OpenAIModule;
  openAiImports.push(
    OpenAIModule.forRoot({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORG_ID,
      defaultOptions: {
        model: process.env.AGENT_MODEL || 'gpt-4-turbo-preview',
        temperature: Number(process.env.AGENT_TEMPERATURE || 0.1),
      },
    }),
  );
} catch (err) {
  logger.warn('@openai/agents-nest not available; skipping OpenAI Agent integration');
}

@Module({
  imports: [
    ...openAiImports,
    EmployeeModule,
    StoreModule,
    TypeOrmModule.forFeature([
      ShiftCode,
      SchedulePeriod,
      ShiftAssignment,
      Store,
      Employee,
      Station,
    ]),
  ],
  controllers: [
    ShiftCodesController,
    SchedulePeriodsController,
    ShiftAssignmentsController,
  ],
  providers: [
    SchedulingOrchestrator,
    ShiftCodesService,
    SchedulePeriodsService,
    ShiftAssignmentsService,
  ],
  exports: [
    SchedulingOrchestrator,
    ShiftCodesService,
    SchedulePeriodsService,
    ShiftAssignmentsService,
  ],
})
export class SchedulingModule {}
