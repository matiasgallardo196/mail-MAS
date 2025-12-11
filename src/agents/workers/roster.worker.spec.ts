import { RosterWorker } from './roster.worker';

describe('RosterWorker', () => {
  let worker: RosterWorker;

  beforeEach(() => {
    worker = new RosterWorker();
  });

  describe('Worker Configuration', () => {
    it('should have the correct name', () => {
      expect(worker.name).toBe('RosterWorker');
    });

    it('should have instructions that mention key responsibilities', () => {
      expect(worker.instructions).toContain('disponibilidad');
      expect(worker.instructions).toContain('requerimientos');
      expect(worker.instructions).toContain('skills');
    });

    it('should have three tools defined', () => {
      expect(worker.tools).toBeDefined();
      expect(worker.tools?.length).toBe(3);
    });
  });

  describe('Tools Definition', () => {
    it('should have get_roster_context tool', () => {
      const tool = worker.tools?.find((t) => t.function?.name === 'get_roster_context');
      expect(tool).toBeDefined();
      expect(tool?.function?.description).toContain('contexto');
    });

    it('should have generate_initial_roster tool', () => {
      const tool = worker.tools?.find((t) => t.function?.name === 'generate_initial_roster');
      expect(tool).toBeDefined();
      expect(tool?.function?.description).toContain('asignación inicial');
    });

    it('should have validate_coverage tool', () => {
      const tool = worker.tools?.find((t) => t.function?.name === 'validate_coverage');
      expect(tool).toBeDefined();
      expect(tool?.function?.description).toContain('cobertura');
    });
  });

  describe('Tool Input Validation', () => {
    it('generate_initial_roster should validate input with Zod', async () => {
      const tool = worker.tools?.find((t) => t.function?.name === 'generate_initial_roster');
      expect(tool?.function?.parameters).toBeDefined();

      // Verificar que el schema tiene los campos requeridos
      const schema = tool?.function?.parameters;
      expect(schema).toHaveProperty('shape');
      expect(schema.shape).toHaveProperty('storeId');
      expect(schema.shape).toHaveProperty('weekStart');
    });

    it('get_roster_context should require storeId, weekStart, weekEnd', async () => {
      const tool = worker.tools?.find((t) => t.function?.name === 'get_roster_context');
      const schema = tool?.function?.parameters;
      expect(schema.shape).toHaveProperty('storeId');
      expect(schema.shape).toHaveProperty('weekStart');
      expect(schema.shape).toHaveProperty('weekEnd');
    });

    it('validate_coverage should require roster and staffRequirements', async () => {
      const tool = worker.tools?.find((t) => t.function?.name === 'validate_coverage');
      const schema = tool?.function?.parameters;
      expect(schema.shape).toHaveProperty('roster');
      expect(schema.shape).toHaveProperty('staffRequirements');
    });
  });

  // Nota: Los tests de integración que requieren DB están en los e2e tests
  // Estos tests unitarios solo verifican la estructura del worker
});
