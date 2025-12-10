# Copilot Instructions — OpenAI Agents Architecture (MAS)

Resumen:
Este documento define instrucciones concretas y reglas para asistentes de IA (Copilot) que trabajen en este repositorio y en la implementación del sistema MAS (Multi-Agent Scheduling). Está pensado para garantizar calidad de código, seguridad, cumplimiento normativo y coherencia con la arquitectura propuesta.

Principios generales ✅

- Habla en Español por defecto en documentación de proyecto, código y PR messages si el equipo trabaja en español.
- Mantener código limpio, testable, y documentado. Propón PRs pequeños y atómicos.
- Si la tarea es compleja: busca orientar a quien revise con una lista de pasos y pruebas para validar.
- Emplear tipado estricto (TypeScript, Zod para validación runtime) y `strict` config en `tsconfig.json`.
- Tipado y generacion de tipos: siempre usar `types`/`interfaces` para definir estructuras. Si NO existe un type para una estructura necesaria, generar un `type`/`interface` en `src/shared/types` para ese caso de uso. Evitar `any` salvo justificación, y preferir la reutilización de tipos ya existentes para prevenir duplicación.
- Fomentar re-uso y separación de responsabilidades entre agendadores (planners), workers y tools.

Normas de seguridad y privacidad ⚠️

- NUNCA exponer claves de API o secretos en el repositorio. Usar variables de entorno (`.env*`) y `process.env`.
- Evitar almacenar información privada (PII) en prompts; cuando sea necesario, desidentificar.
- Si se requieren logs sensibles, cifrarlos o marcarlos como `sensitive` y evitar su subida a servicios de terceros.

Actualización de documentación 📚

- Cada nuevo agente (planner/worker) debe incluir un README con:
  - Responsabilidad del agente
  - Entrada esperada y esquema Zod
  - Salida esperada y esquema Zod
  - Limitaciones y supuestos
  - Tests unitarios y escenarios de integración

Instrucciones específicas para IA (Copilot / asistentes) 🤖

- Usa la estructura propuesta en `src/agents/` y no introduzcas servicios que rompan la arquitectura.
- Requisitos de prompts y handlers:
  - Cada agente debe contar con un `instructions` string claro y un `tools` array con funciones y schemas Zod.
  - Usa `zod` tanto para validación de parámetros de entrada como de salida.
  - Preferir outputs estructurados (JSON) en lugar de texto libre cuando sea posible.
- Propón pruebas unitarias (Jest) por cualquier algoritmo (roster generation, compliance checking, optimization).
- Mínimo logging: `info` y `error` con correlación de requestId.
- Para problemas legales (ej. Fair Work), nunca sustituir la recomendación del ComplianceWorker por la interpretación humana final: sugiere acciones, pero siempre incluir un resultado verificable con `validate_fair_work_compliance`.

Política de prompts y temperatura:

- Prompts deben incluir contexto, objetivos y salidas esperadas (ej. `instructions`) como JSON.
- Valores recomendados para inferencia de planificación y decisiones: `temperature: 0.1` (determinístico), `maxTokens` razonable.

Estándares técnicos y prácticas recomendadas 🔧

- Usar `zod` para validación structure/contract. Añadir tests para validaciones.
- Todas las funciones `execute` en `tools` deben ser puras o con efectos controlados y documentados.
- Mantener interfaces/DTOs en `src/shared/types` y zod `src/shared/schemas`.

- Genera types a partir de los `zod` schemas cuando sea posible (ej.: `export type T = z.infer<typeof Schema>`). Preferir un único «source of truth» (schema) y derivar types para evitar inconsistencias.
- Si una estructura es compartida entre módulos, muévela a `src/shared/types` y documenta su uso; evitar duplicar definiciones en cada módulo.
- No usar `any` salvo casos muy justificables; si se hace, documentar la razón en la PR y crear una tarea para tiparlo posteriormente.
- Al crear nuevos `types`/`interfaces`, añade tests y ejemplos de uso en `src/shared/types` (README o docblock) para fomentar su reutilización.
- Añadir `OpenAIModule` para integraciones e inyectar la configuración desde `process.env`.
- Manejar rate-limiting, retries y backoff en llamadas a la API.
- Añadir un `orchestrator.service.ts` con config para `maxSteps`, `timeout`, y `monitoring`.

Política de colaboración entre agentes:

- Los planners orquestan y defienden su razonamiento; los workers devuelven evidencias (doc, arrays) y metadatos de decisión.
- Hard constraints: validar y abortar si un worker devuelve inconsistencia.
- Soft constraints: añadir métricas y scores en outputs.

Métricas y alertas:

- Registrar métricas por ejecución: duration, costEstimate, success/fail flags, complianceFlags.
- Añadir `costEstimation` en el output para poder auditar facturación.

Estrategia mínima para lanzamiento (MVP):

- Comunicación: mensajes JSON tipados (Zod) entre `Orchestrator` → `Planner` → `Workers` → `Tools`.
- Flujo mínimo para lanzar mañana: Orchestrator secuencial (Roster → Compliance → Optimization), validaciones Zod, fallback humano si CRITICAL.
- Reglas: todo input/output validado por Zod; evitar `any`; tipos en `src/shared/types`.

Mensajes y contratos (tipados)
Estructura general de request entre componentes:

JSON Task (Planner→Worker)

```
{
  requestId: string,
  task: string,
  context: {
    storeId: string,
    weekStart: string,
    priorities?: { hard: string[]; soft: string[] }
  },
  input: Record<string, unknown>, // typed/validated with zod
  constraints: { hard: string[]; soft: string[] }
}
```

Worker Result (Worker→Planner)

```
{
  requestId: string,
  worker: string,
  result: object,         // validado con Zod schema
  evidence?: any[],       // lista de acciones o logs
  metrics?: { durationMs: number; score?: number },
  complianceFlags?: { severity: 'CRITICAL'|'MAJOR'|'MINOR'; message: string }[]
}
```

Flujos de decisión (secuencial y determinista — temp 0.1)

1. Orchestrator recibe request y crea `requestId`.
2. Planner consulta `store.tools` y `employee.tools` para obtener contexto.
3. Planner delega a `RosterWorker` para generar el roster inicial (`generate_initial_roster`).
4. Se valida roster con `ComplianceWorker` (`validate_fair_work_compliance`).

- Si existe `severity: CRITICAL` → detener el flujo y marcar para revisión humana.
- Si no, continuar.

5. `OptimizationWorker` intenta reducir costos (`optimize_roster`) y devuelve roster optimizado + score.
6. `ConflictWorker` (si existe) revisa solapamientos/gaps; intenta arreglar y devuelve cambios.
7. Planner consolida (scores, costEstimation, compliance), Orchestrator persiste y entrega resultado.

Guardrails y criterios de seguridad:

- `maxSteps` / `timeout` (orchestrator config) → cortar ejecución si se excede.
- Request tracing: añadir `requestId` en logs y en respuestas.
- Retry/backoff para llamadas a servicios externos (store/employee fetch, APIs).
- Abort en `CRITICAL` compliance; return con evidencia y marcar revisión humana.

Ejemplo implementable (resumen):

- Requerimientos mínimos: `SchedulingPlanner`, `RosterWorker`, `ComplianceWorker`, `OptimizationWorker (skeleton)`, `roster.tools`, `fairwork.tools`, `store.tools (mock)`, `employee.tools (mock)`, `Orchestrator` secuencial con `callWorkerTool`.

Nota: la información detallada sobre testing y pipelines sigue estando disponible en la documentación del equipo; para el MVP nos centramos en el flujo mínimo y las validaciones Zod.

Documentación y guía de PRs:

- PR debe incluir:
  - Resumen técnico sucinto
  - Arquitectura afectada y diagramas si aplica
  - Qué tests se agregaron
  - Checklist de validación de compliance y cost tests

Reglas para Change-Management:

- Cualquier cambio que afecte `Fair Work` o constraints debe incluir una revisión legal/subject-matter expert o checklist.

Notas finales 💡

- Si la implementación se vuelve cost-prohibitive o la latencia inaceptable, sugerir alternativas: fallback algos tradicionales, caching o batching.
- Mantener la escalabilidad de workers por diseño: stateless y con almacenamiento de estado (Redis / DB) si es necesario.

---

Versión del documento: 1.0
Fecha: 2025-12-09
Responsable: Equipo de Iniciativa MAS
