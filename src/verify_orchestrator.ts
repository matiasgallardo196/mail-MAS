import { Test } from '@nestjs/testing';
import { SchedulingOrchestrator } from './agents/orchestrator.service';

async function run() {
    console.log('--- Starting Verification ---');
    const moduleRef = await Test.createTestingModule({
        providers: [SchedulingOrchestrator],
    }).compile();

    const orchestrator = moduleRef.get(SchedulingOrchestrator);
    try {
        const result = await orchestrator.generateRoster('store-1', new Date());
        console.log('--- Result ---');
        console.log(JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('Error:', err);
    }
}
run();
