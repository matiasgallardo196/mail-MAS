import { Test, TestingModule } from '@nestjs/testing';
import { SchedulingOrchestrator } from './orchestrator.service';

describe('SchedulingOrchestrator (stub)', () => {
  let orchestrator: SchedulingOrchestrator;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SchedulingOrchestrator],
    }).compile();
    orchestrator = module.get<SchedulingOrchestrator>(SchedulingOrchestrator);
  });

  it('should return a placeholder roster', async () => {
    const res = await orchestrator.generateRoster('store-1', new Date('2025-01-01'));
    expect(res).toHaveProperty('storeId', 'store-1');
    expect(res).toHaveProperty('roster');
    expect(Array.isArray(res.roster)).toBe(true);
  });
});
