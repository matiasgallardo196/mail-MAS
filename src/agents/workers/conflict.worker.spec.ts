import { ConflictWorker } from './conflict.worker';

describe('ConflictWorker', () => {
  let worker: ConflictWorker;

  beforeEach(() => {
    worker = new ConflictWorker();
  });

  describe('Worker Configuration', () => {
    it('should have the correct name', () => {
      expect(worker.name).toBe('ConflictWorker');
    });

    it('should have instructions mentioning key responsibilities', () => {
      expect(worker.instructions).toContain('APLICAR CORRECCIONES');
      expect(worker.instructions).toContain('GAPS DE COBERTURA');
      expect(worker.instructions).toContain('CONFLICTOS IRRESOLUBLES');
    });

    it('should have three tools defined', () => {
      expect(worker.tools).toBeDefined();
      expect(worker.tools?.length).toBe(3);
    });
  });

  describe('Tools Definition', () => {
    it('should have apply_suggestions tool', () => {
      const tool = worker.tools?.find((t) => t.function?.name === 'apply_suggestions');
      expect(tool).toBeDefined();
      expect(tool?.function?.description).toContain('sugerencias');
    });

    it('should have resolve_coverage_gaps tool', () => {
      const tool = worker.tools?.find((t) => t.function?.name === 'resolve_coverage_gaps');
      expect(tool).toBeDefined();
      expect(tool?.function?.description).toContain('gaps');
    });

    it('should have request_human_review tool', () => {
      const tool = worker.tools?.find((t) => t.function?.name === 'request_human_review');
      expect(tool).toBeDefined();
      expect(tool?.function?.description).toContain('revisión humana');
    });
  });

  describe('apply_suggestions Tool', () => {
    it('should apply EXTEND_SHIFT suggestion', async () => {
      const tool = worker.tools?.find((t) => t.function?.name === 'apply_suggestions');
      expect(tool).toBeDefined();

      const roster = {
        storeId: 'store-1',
        weekStart: '2024-12-09',
        roster: [
          {
            employeeId: 'emp-1',
            start: '2024-12-09T06:30:00',
            end: '2024-12-09T08:00:00', // Only 1.5h - too short
            station: 'KITCHEN',
          },
        ],
        generatedAt: new Date().toISOString(),
      };

      const suggestions = [
        {
          type: 'EXTEND_SHIFT',
          employeeId: 'emp-1',
          shiftIndex: 0,
          reason: 'Extender a mínimo 3h',
          suggestedChange: {
            newEnd: '2024-12-09T09:30:00',
          },
          relatedIssue: 'MIN_SHIFT_LENGTH_VIOLATION',
        },
      ];

      const result = await tool!.function.execute({ roster, suggestions });

      expect(result.resolved).toBe(1);
      expect(result.unresolved).toBe(0);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].success).toBe(true);
      expect(result.roster.roster[0].end).toBe('2024-12-09T09:30:00');
    });

    it('should apply MOVE_SHIFT suggestion', async () => {
      const tool = worker.tools?.find((t) => t.function?.name === 'apply_suggestions');

      const roster = {
        storeId: 'store-1',
        weekStart: '2024-12-09',
        roster: [
          {
            employeeId: 'emp-1',
            start: '2024-12-09T06:30:00',
            end: '2024-12-09T15:30:00',
            station: 'KITCHEN',
          },
        ],
        generatedAt: new Date().toISOString(),
      };

      const suggestions = [
        {
          type: 'MOVE_SHIFT',
          employeeId: 'emp-1',
          shiftIndex: 0,
          reason: 'Mover para respetar descanso mínimo',
          suggestedChange: {
            newStart: '2024-12-09T08:00:00',
            newEnd: '2024-12-09T17:00:00',
          },
        },
      ];

      const result = await tool!.function.execute({ roster, suggestions });

      expect(result.resolved).toBe(1);
      expect(result.roster.roster[0].start).toBe('2024-12-09T08:00:00');
      expect(result.roster.roster[0].end).toBe('2024-12-09T17:00:00');
    });

    it('should apply REMOVE_SHIFT suggestion', async () => {
      const tool = worker.tools?.find((t) => t.function?.name === 'apply_suggestions');

      const roster = {
        storeId: 'store-1',
        weekStart: '2024-12-09',
        roster: [
          {
            employeeId: 'emp-1',
            start: '2024-12-09T06:30:00',
            end: '2024-12-09T15:30:00',
            station: 'KITCHEN',
          },
          {
            employeeId: 'emp-2',
            start: '2024-12-09T14:00:00',
            end: '2024-12-09T23:00:00',
            station: 'COUNTER',
          },
        ],
        generatedAt: new Date().toISOString(),
      };

      const suggestions = [
        {
          type: 'REMOVE_SHIFT',
          employeeId: 'emp-1',
          shiftIndex: 0,
          reason: 'Empleado excede horas semanales',
        },
      ];

      const result = await tool!.function.execute({ roster, suggestions });

      expect(result.resolved).toBe(1);
      expect(result.roster.roster).toHaveLength(1);
      expect(result.roster.roster[0].employeeId).toBe('emp-2');
    });

    it('should handle invalid shift index gracefully', async () => {
      const tool = worker.tools?.find((t) => t.function?.name === 'apply_suggestions');

      const roster = {
        storeId: 'store-1',
        weekStart: '2024-12-09',
        roster: [],
        generatedAt: new Date().toISOString(),
      };

      const suggestions = [
        {
          type: 'EXTEND_SHIFT',
          employeeId: 'emp-1',
          shiftIndex: 99, // Invalid index
          suggestedChange: { newEnd: '2024-12-09T10:00:00' },
        },
      ];

      const result = await tool!.function.execute({ roster, suggestions });

      expect(result.resolved).toBe(0);
      expect(result.unresolved).toBe(1);
      expect(result.requiresHumanReview).toBe(true);
    });
  });

  describe('request_human_review Tool', () => {
    it('should mark issues for human review', async () => {
      const tool = worker.tools?.find((t) => t.function?.name === 'request_human_review');

      const roster = {
        storeId: 'store-1',
        weekStart: '2024-12-09',
        roster: [],
        generatedAt: new Date().toISOString(),
      };

      const issues = [
        {
          type: 'UNRESOLVABLE_GAP',
          description: 'No hay empleados disponibles para KITCHEN el domingo',
          severity: 'CRITICAL' as const,
          affectedEmployeeIds: [],
        },
      ];

      const result = await tool!.function.execute({ roster, issues });

      expect(result.requiresHumanReview).toBe(true);
      expect(result.unresolved).toBe(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('CRITICAL');
    });
  });
});
