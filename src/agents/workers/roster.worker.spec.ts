import { RosterWorker } from './roster.worker';

describe('RosterWorker', () => {
  it('should have generate_initial_roster tool that returns a roster', async () => {
    const worker = new RosterWorker();
    const tool = worker.tools?.find((t) => t.function?.name === 'generate_initial_roster');
    expect(tool).toBeDefined();

    const args = {
      storeId: 'store-1',
      weekStart: '2025-01-01',
    };

    const res = await tool.function.execute(args);
    expect(res).toHaveProperty('storeId', 'store-1');
    expect(res).toHaveProperty('roster');
    expect(Array.isArray(res.roster)).toBe(true);
  });
});
