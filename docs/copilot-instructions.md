# Copilot Instructions — OpenAI Agents Architecture (MAS)

Resumen:
Este documento define instrucciones concretas y reglas para asistentes de IA (Copilot) que trabajen en este repositorio y en la implementación del sistema MAS (Multi-Agent Scheduling). Está pensado para garantizar calidad de código, seguridad, cumplimiento normativo y coherencia con la arquitectura propuesta.

Principios generales ✅

- Habla en Español por defecto en documentación de proyecto, código y PR messages si el equipo trabaja en español.
- Mantener código limpio, testable, y documentado. Propón PRs pequeños y atómicos.
- Si la tarea es compleja: busca orientar a quien revise con una lista de pasos y pruebas para validar.
- Emplear tipado estricto (TypeScript, Zod para validación runtime) y `strict` config en `tsconfig.json`.
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

Procesos CI/CD y Tests:

- Crear pruebas unitarias (Jest) para:
  - Zod validators
  - Tools: e.g. `check_rest_period`, `calculate_penalty_rates`.
  - Roster generation properties (hard constraints satisfied)
- Añadir pruebas e2e simuladas para `SchedulingOrchestrator`.
- Incluir linters (ESLint), Prettier y `tsc` en la pipeline.

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
