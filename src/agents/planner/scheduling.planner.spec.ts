import { SchedulingPlanner } from './scheduling.planner';

describe('SchedulingPlanner skeleton', () => {
  it('should initialize with a name', () => {
    const planner = new SchedulingPlanner();
    expect(planner).toBeDefined();
    expect(planner.name).toBe('SchedulingPlanner');
  });
});
