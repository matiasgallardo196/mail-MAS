import type { WorkerOptions } from '../../shared/types/agent';
import type { ToolDef } from '../../shared/types/tool';

// WorkerBase fallback - @openai/agents SDK doesn't export a Worker class
// We use a local implementation that mimics the expected interface
const WorkerBase = class {
  name?: string;
  instructions?: string;
  tools?: ToolDef[];
  constructor(opts: WorkerOptions = { name: 'fallback' } as WorkerOptions) {
    this.name = opts.name;
    this.instructions = opts.instructions;
    this.tools = opts.tools as ToolDef[];
  }
};

import { z } from 'zod';
import {
  GenerateInitialRosterParams,
  GenerateInitialRosterParamsType,
  GetRosterContextParams,
  GetRosterContextParamsType,
  ValidateCoverageParams,
  ValidateCoverageParamsType,
  generateInitialRoster,
  getRosterContext,
  validateCoverage,
} from '../tools/roster.tools';
import { RosterSchema } from '../../shared/schemas/roster.schema';
import { RosterContextSchema, CoverageMetricsSchema } from '../../shared/schemas/roster-context.schema';
import type { Roster } from '../../shared/types/roster';
import type { RosterContext, CoverageMetrics } from '../../shared/schemas/roster-context.schema';

/**
 * RosterWorker - Experto en generación de turnos
 *
 * Responsabilidades:
 * - Consultar disponibilidad de empleados vía employee.tools
 * - Consultar requerimientos de staff vía store.tools
 * - Generar asignaciones respetando constraints
 * - Validar cobertura y generar métricas
 *
 * Colaboración con otros agents:
 * - Recibe requests del Orchestrator/Planner
 * - Su output es validado por ComplianceWorker
 * - Puede aplicar suggestions del ComplianceWorker o ConflictWorker
 */
export class RosterWorker extends WorkerBase {
  constructor() {
    super({
      name: 'RosterWorker',
      instructions: `
        Eres un experto en asignación de turnos para tiendas McDonald's. Tu tarea es:

        1. OBTENER CONTEXTO:
           - Consultar disponibilidad declarada de empleados (shift codes: 1F, 2F, 3F)
           - Consultar requerimientos de staff por estación (KITCHEN, COUNTER, MCCAFE, etc.)
           - Consultar skills de cada empleado para matching con estaciones

        2. GENERAR ROSTER:
           - Solo asignar empleados que estén disponibles en esa fecha
           - Respetar los horarios del shift code declarado (1F=06:30-15:30, 2F=14:00-23:00, etc.)
           - Matchear empleados con sus estaciones por defecto cuando sea posible
           - Balancear la carga de turnos entre empleados
           - Intentar cubrir los requerimientos mínimos de staff por estación

        3. VALIDAR COBERTURA:
           - Verificar que cada estación tenga el staff mínimo requerido
           - Generar warnings si hay gaps de cobertura
           - Calcular métricas de calidad del roster

        4. RESPONDER CON EVIDENCIA:
           - Incluir métricas de cobertura en el output
           - Listar warnings de gaps si existen
           - Proporcionar datos que ComplianceWorker pueda validar

        CONSTRAINTS IMPORTANTES:
        - No asignar empleados no disponibles
        - Respetar shift codes declarados (no inventar horarios)
        - Priorizar cobertura de estaciones sobre balance perfecto
      `,
      tools: [
        // Tool 1: Obtener contexto completo
        {
          type: 'function',
          function: {
            name: 'get_roster_context',
            description: 'Obtiene todo el contexto necesario para generar un roster: disponibilidad de empleados, requerimientos de staff, skills y contratos. Consulta la DB vía employee.tools y store.tools.',
            parameters: GetRosterContextParams,
            execute: async (args: unknown) => {
              const parsed = GetRosterContextParams.parse(args);
              const result = await getRosterContext(parsed);
              return RosterContextSchema.parse(result);
            },
          },
        },
        // Tool 2: Generar roster inicial
        {
          type: 'function',
          function: {
            name: 'generate_initial_roster',
            description:
              'Genera una asignación inicial de turnos basada en disponibilidad, skills y requerimientos de staff. Consulta la DB automáticamente y aplica lógica de matching.',
            parameters: GenerateInitialRosterParams,
            execute: async (args: unknown) => {
              const parsed = GenerateInitialRosterParams.parse(args);
              const result = await generateInitialRoster(parsed);
              // El resultado incluye roster + métricas
              return RosterSchema.extend({
                metrics: z.object({
                  totalShifts: z.number(),
                  employeesAssigned: z.number(),
                  daysProcessed: z.number().optional(),
                  avgShiftsPerEmployee: z.number().optional(),
                  warnings: z.array(z.string()),
                }).optional(),
              }).parse(result);
            },
          },
        },
        // Tool 3: Validar cobertura
        {
          type: 'function',
          function: {
            name: 'validate_coverage',
            description:
              'Valida que un roster cumpla con los requerimientos de staff por estación. Retorna métricas de cobertura y warnings de gaps.',
            parameters: ValidateCoverageParams,
            execute: async (args: unknown) => {
              const parsed = ValidateCoverageParams.parse(args);
              const result = await validateCoverage(parsed);
              return CoverageMetricsSchema.parse(result);
            },
          },
        },
      ] as ToolDef<
        GetRosterContextParamsType | GenerateInitialRosterParamsType | ValidateCoverageParamsType,
        RosterContext | Roster | CoverageMetrics
      >[],
    });
  }
}
