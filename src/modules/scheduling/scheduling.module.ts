import { Module } from '@nestjs/common';
import { SchedulingController } from './scheduling.controller';
import { SchedulingService } from './scheduling.service';
import { StoreDemandAgent } from './agents/store-demand.agent';
import { StaffProfileAgent } from './agents/staff-profile.agent';
import { SchedulerAgent } from './agents/scheduler.agent';
import { ComplianceAgent } from './agents/compliance.agent';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  controllers: [SchedulingController],
  providers: [
    SchedulingService,
    StoreDemandAgent,
    StaffProfileAgent,
    SchedulerAgent,
    ComplianceAgent,
  ],
})
export class SchedulingModule {}

