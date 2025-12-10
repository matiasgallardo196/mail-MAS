# Planificación de Implementación — OpenAI Agents (MAS)

Objetivo: Implementar un sistema híbrido de agentes (MAS) para scheduling de tienda McDonald's, garantizando cumplimiento legal, optimización de costos y satisfacción de empleados. Aquí se presenta un plan por fases, tareas concretas y estimaciones.

## Resumen Ejecutivo

- Arquitectura: `src/agents/` (planners, workers, tools, orchestrator) + módulos tradicionales en `src/modules/`.
- Fases principales: Setup, Prototipo, Integración, Testing & Validación, Optimización y Producción.
- Hitos clave: MVP (generar roster de prueba), cumplimiento de Fair Work, integración con store & employee modules.

---

## Estructura de carpetas (reconfirmada)

src/
├── agents/
│ ├── planner/
│ │ ├── scheduling.planner.ts
│ │ └── orchestration.planner.ts
│ ├── workers/
│ │ ├── roster.worker.ts
│ │ ├── compliance.worker.ts
│ │ ├── optimization.worker.ts
│ │ ├── conflict.worker.ts
│ │ └── validation.worker.ts
│ ├── tools/
│ │ ├── store.tools.ts
│ │ ├── employee.tools.ts
│ │ ├── constraint.tools.ts
│ │ └── fairwork.tools.ts
│ └── orchestrator.service.ts
├── modules/
│ ├── employees/
│ ├── stores/
│ └── scheduling/
└── shared/
├── schemas/
└── types/

---

## Fase 0 — Preparación (1-2 días)

Objetivo: Tener entorno de desarrollo y dependencias listas.

Tareas:

- [ ] Añadir dependencia `@openai/agents` y `@openai/agents-nest` (o su equivalente). (1h)
- [ ] Añadir `zod`, `jest`, `ts-jest`, `@types/jest`, `eslint`, `prettier`. (1h)
- [ ] Documentar variables de entorno requeridas en `.env.example` (OPENAI_API_KEY, OPENAI_ORG_ID). (30min)
- [ ] Crear archivo `scheduling.module.ts` y configurar `OpenAIModule.forRoot(...)` usando `process.env`.

Entregables:

- `package.json` actualizado
- `docs/` con decisiones de infraestructura.

---

## Plan rápido — Lanzamiento Mañana (MVP)

Objetivo: Tener un flujo mínimo y seguro para generar un roster para una tienda en un entorno local o staging, con validación de cumplimiento y fallback.

Requerimientos mínimos para el MVP:

- `SchedulingPlanner` (skeleton)
- `RosterWorker` (ya implementado, generate_initial_roster)
- `ComplianceWorker` (validate_fair_work_compliance)
- `OptimizationWorker` (skeleton - optimize_roster)
- `roster.tools`, `fairwork.tools`, `store.tools`, `employee.tools` (mocks o reales)
- `SchedulingOrchestrator` con fallback (roster → compliance → optimization)

Flujo mínimo (secuencial determinista):

1. Orchestrator recibe la solicitud y crea `requestId`.
2. Planner / Orchestrator obtiene contexto con `store.tools` y `employee.tools`.
3. Se genera un roster inicial con `RosterWorker.generate_initial_roster`.
4. Se valida el roster con `ComplianceWorker.validate_fair_work_compliance` (Zod validation).

- Si existe `severity === 'CRITICAL'` → detener el flujo y marcar para revisión humana.
- Si no, continuar.

5. Ejecutar `OptimizationWorker.optimize_roster` (mejora del roster, score) si está disponible.
6. Guardar roster (persistir) y devolver resultado con `metrics`, `compliance` y `status`.

Guardrails y reglas mínimas (para mañana):

- Validación Zod para TODO input/output
- Evitar `any` en la API pública: tipar `Worker` tools y `Orchestrator` run
- `requestId` en logs y outputs
- Timeout de orquestación y `maxSteps` limitado (ej.: 20-100) para evitar costes y latencia
- Si `CRITICAL` compliance → stop & human review

Commands y checks (quick launch):

1. Clona el repositorio y configura `.env.development` con placeholders
2. Instala dependencias:

```bash
npm install
```

3. Compila & Tests:

```bash
npm run build
npm test
```

4. Arranca servidor en desarrollo:

```bash
PORT=3002 npm run start:dev
```

5. Validación rápida:

- Ver `GET /health` (opcional) para comprobar servidor.
- Ejecutar la suite de integración: `npm run test:e2e` (aún por crear) / o `npm test` ya valida la orquestación en tests.

Checklist (día antes):

- Verificar `.env` y eliminar secretos de repositorios.
- Verificar `noImplicitAny` y `eslint` reglas (al menos en warnings) para detectar `any` críticos.
- Confirmar fallback del Orchestrator activa si no se carga `@openai/agents`.
- Confirmar `ComplianceWorker` y `fairwork.tools` cubren mínimos de Fair Work (descanso mínimo + penalties).
- Notificar al equipo de operaciones y compliance para revisión si se encuentra `CRITICAL` durante pruebas.

Notas finales:

- Este plan está pensado para un lanzamiento controlado y rápido. No es el plan completo de producción; es un MVP operativo con seguridad por `CRITICAL` compliance y con opciones de rollback (revert to previous roster) si el optimization degrada cobertura.

---

## Fase 1 — Prototipado de Orquestación y Planners (2-3 días)

Objetivo: Implementar el Planner y Orchestrator básico que llame a un worker (RosterWorker) y devuelva un resultado.

Tareas (COMPLETADO):

- [ ] Crear skeleton de `SchedulingPlanner` con instrucciones y esquemas simples (zod). (0.5d)
- [ ] Crear `SchedulingOrchestrator` con `Orchestrator` y configuración `maxSteps`, `timeout`. (0.5d)
- [ ] Implementar `RosterWorker` con herramienta `generate_initial_roster` (solo prototipo lógico) y zod validation. (0.5d)
- [ ] Implementar UnitTests para validated tool input/output. (0.5d)

Criterios de éxito:

- `orchestrator.run` genera resultados sintéticos para una store de prueba.

Estado: Fase 1 implementada (skeletons, RosterWorker, Roster tool, basic tests).

Archivos creados en esta fase:

- `src/agents/planner/scheduling.planner.ts` (planner skeleton)
- `src/agents/planner/orchestration.planner.ts` (orchestration planner skeleton)
- `src/agents/workers/roster.worker.ts` (RosterWorker w/ generate_initial_roster tool)
- `src/agents/tools/roster.tools.ts` (tool implementation using zod)
- `src/shared/schemas/shift.schema.ts`, `src/shared/schemas/roster.schema.ts` (zod schemas)
- `src/agents/orchestrator.service.ts` (orchestrator integrated with fallback)
- Unit tests: `src/agents/(...)*.spec.ts`

Criterios de éxito:

- `orchestrator.run` genera resultados sintéticos para una store de prueba.

---

## Fase 2 — Tools y Workers Especializados (3-6 días)

Objetivo: Añadir Tools robustas y Workers especializados (Compliance, Optimization, Conflict, Validation).

Tareas:

- [x] Implementar `fairwork.tools.ts` con `check_rest_period` y `calculate_penalty_rates`. (1-1.5d)
- [ ] Implementar `employee.tools.ts` para obtener disponibilidad, skills y contratos. (1d)
- [ ] Implementar `store.tools.ts` con forecast, opening-hours y peak times. (1d)
- [x] Implement `ComplianceWorker` con `validate_fair_work_compliance` que reciba roster y contracts; test coverage completo. (1d)
- [ ] Implement `OptimizationWorker` skeleton y herramientas para cost estimation y shift smoothing. (1d)

Criterios de éxito:

- Workers pueden ejecutar herramientas y devolver JSON validado.

---

## Fase 3 — Orquestación avanzada y colaboración entre agents (3-5 días)

Objetivo: Coordinar Planner y Workers con flujo real: Planificar, generar, validar, optimizar y resolver conflictos.

Tareas:

- [ ] Planner envía tasks a Workers según flujos (roster → compliance → optimization → conflict). (1-2d)
- [ ] Añadir metadata y logs por `taskId` para trazabilidad. (0.5d)
- [ ] Implementar `ConflictWorker` para resolver problemas (ej. falta de coverage). (1d)
- [ ] Implementar `ValidationWorker` para checks finales y `orchestrator` decide si repetir pasos. (0.5-1d)
- [ ] Añadir cost-estimation y stop-on-critical-violation logic. (0.5d)

Criterios de éxito:

- Orchestrator completa un ciclo de `run` con multiple worker calls, produce roster final y score.

---

## Fase 4 — Testeo y Validación (2-4 días)

Objetivo: Verificar que el pipeline cumple constraints y escala.

Tareas:

- [ ] Unittest de cada tool y worker con escenarios de borde. (1-2d)
- [ ] Integration tests para `SchedulingOrchestrator` (use fixtures: store, employees, forecast). (1d)
- [ ] E2E tests para flujos importantes con `test/*.e2e-spec.ts` (1d)
- [ ] Validar compliance scenarios: rest-period violation, understaffing, penalty calculations. (0.5d)

Criterios de éxito:

- Tests de e2e pasan en CI y respetan timeouts aceptables.

---

## Fase 5 — Deploy, Observability y Cost Management (2-3 días)

Objetivo: Integrar en stack de producción, añadir trazabilidad y manejo de costos.

Tareas:

- [ ] Integrar métricas: Prometheus/Grafana, log agregación (ELK/Datadog). (1d)
- [ ] Añadir `costTracking` por ejecución; aproximación de tokens y microcostos. (0.5d)
- [ ] Ajustar `rateLimit` y concurrency del `agentConfig`. (0.5d)
- [ ] Crear runbooks y procesos para manejo de fallos y escalamiento. (0.5d)

Criterios de éxito:

- Deployment en environment staging; métricas disponibles.

---

## Fase 6 — Iteración y ML feedback (opcional)

- Aprendizaje: recolectar ejemplos (inputs + choices + final roster) para mejorar heuristics.
- Implementar logging de `decisionReasoning` para entrenamiento futuro.
- Auto-tuning: hyper-parameters en `OptimizationWorker`.

---

## Esquemas Zod y Types (recomendados)

Crear en `src/shared/schemas/*` y `src/shared/types/*`:

- EmployeeAvailabilitySchema
- EmployeeContractSchema
- RosterShiftSchema
- RosterSchema (array de shifts + metadata)
- StoreForecastSchema

Ejemplo de zod:

```ts
import { z } from 'zod';

export const ShiftSchema = z.object({
  employeeId: z.string(),
  start: z.string(),
  end: z.string(),
  station: z.string().optional(),
  isPeak: z.boolean().default(false),
});
export type Shift = z.infer<typeof ShiftSchema>;
```

---

## Best Practices de Prompting y Contratos de Interfaces

- Prompts para `workers`: contexto, objetivos, constraints, heuristics, schema de entrada y salida esperados.
- IT IS MANDATORY: When returning JSON outputs from the agent, match the zod schema; runs should validate with `z.parse`.

---

## Consideraciones de Compliance y Legal

- ComplianceWorker es el único con la responsabilidad de validar requisitos legales y devolver warnings/mustFix.
- Agregar un `complianceSeverity` en la salida: `CRITICAL`, `MAJOR`, `MINOR`.
- Cualquier `CRITICAL` complianceFlag debe pararse automáticamente y levantar una review humana.

---

## Timeline aproximado (MVP)

- 2 semanas para MVP (Fases 0 a 3, con tests base)
- +1 semana para tests completos y deploy to staging
- +1 semana para observability, cost tracking y optimizations

---

## Riesgos y mitigaciones

- Costos de API: Implementar `costEstimation` y poner un cap en `Orchestrator`. Hacer un plan con batch processing.
- Latencia: fallback a algoritmos tradicionales si timeouts o cost thresholds se exceden.
- Legales: Review formal por experto en Fair Work Act antes de producción.

---

## Checklist de lanzamiento (MVP)

- [ ] `OpenAIModule` in `scheduling.module.ts` configured
- [ ] `SchedulingOrchestrator` implemented with `SchedulingPlanner` and `RosterWorker`
- [ ] `fairwork.tools.ts` base implemented
- [ ] Tests: unit, integration, e2e passing
- [ ] Cost Tracking enabled and rate limiting configured
- [ ] Playbook for compliance review included

---

## Apéndice: Ejemplo de `SchedulingOrchestrator` (breve)

```ts
export class SchedulingOrchestrator {
  constructor() {
    const planner = new SchedulingPlanner();
    const workers = [new RosterWorker(), new ComplianceWorker(), new OptimizationWorker()];

    this.orchestrator = new Orchestrator({
      planner,
      workers,
      config: { maxSteps: 100, timeout: 180_000 },
    });
  }
}
```

---

Versión del documento: 1.0
Fecha: 2025-12-09
Autor: Equipo MAS
