import { Module, Logger } from '@nestjs/common';
import { SchedulingOrchestrator } from '../../agents/orchestrator.service';
import { EmployeeModule } from '../employees/employee.module';
import { StoreModule } from '../stores/store.module';

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
  imports: [...openAiImports, EmployeeModule, StoreModule],
  providers: [SchedulingOrchestrator],
  exports: [SchedulingOrchestrator],
})
export class SchedulingModule {}
