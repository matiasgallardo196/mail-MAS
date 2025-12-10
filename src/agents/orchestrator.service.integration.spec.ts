import { Test, TestingModule } from '@nestjs/testing';
import { SchedulingOrchestrator } from './orchestrator.service';

describe('SchedulingOrchestrator Integration (fallback)', () => {
  let orchestrator: SchedulingOrchestrator;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SchedulingOrchestrator],
    }).compile();
    orchestrator = module.get<SchedulingOrchestrator>(SchedulingOrchestrator);
  });

  it('should produce a roster via fallback run', async () => {
    const res = await orchestrator.generateRoster('store-2', new Date('2025-01-01'));
    const roster = 'storeId' in res ? res : res.roster;
    expect(roster).toHaveProperty('storeId', 'store-2');
    expect(roster).toHaveProperty('roster');
    expect(Array.isArray(roster.roster)).toBe(true);
  });
});
