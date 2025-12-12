# OpenAI Agents MAS - Implementation Plan

## Overview

This document describes the Multi-Agent System (MAS) architecture implemented for McDonald's workforce scheduling. The system uses OpenAI Agents SDK to orchestrate intelligent roster generation, compliance validation, and optimization.

---

## Executive Summary

- **Architecture**: `src/agents/` (orchestrator, planner, workers, tools) + traditional modules in `src/modules/`
- **Key Components**: Orchestrator, RosterWorker, ComplianceWorker, OptimizationWorker, ConflictWorker
- **Compliance**: Built-in Fair Work Australia validation
- **Fallback**: Deterministic algorithms when OpenAI is unavailable

---

## Folder Structure

```
src/
├── agents/
│   ├── orchestrator.service.ts      # Main orchestrator
│   ├── planner/
│   │   └── orchestration.planner.ts # Task planning
│   ├── workers/
│   │   ├── roster.worker.ts         # Initial roster generation
│   │   ├── compliance.worker.ts     # Fair Work compliance
│   │   ├── optimization.worker.ts   # Cost/coverage optimization
│   │   └── conflict.worker.ts       # Conflict resolution
│   └── tools/
│       ├── roster.tools.ts          # Roster manipulation
│       ├── fairwork.tools.ts        # Compliance checks
│       ├── employee.tools.ts        # Employee data access
│       ├── store.tools.ts           # Store data access
│       └── australian-holidays.ts   # Holiday calculations
├── modules/
│   ├── employees/                   # Employee management
│   ├── stores/                      # Store management
│   ├── stations/                    # Station management
│   └── scheduling/                  # Schedule management
└── shared/
    ├── schemas/                     # Zod validation schemas
    └── types/                       # TypeScript types
```

---

## Implementation Status

### Phase 1 - Core Infrastructure ✅

- [x] Project scaffolding with NestJS 11
- [x] TypeORM database integration with PostgreSQL
- [x] Environment configuration system
- [x] Logging with Pino
- [x] Global validation and error handling
- [x] Rate limiting and security (Helmet)

### Phase 2 - MAS Foundation ✅

- [x] Orchestrator service with fallback mode
- [x] Orchestration planner
- [x] RosterWorker with initial roster generation
- [x] Roster tools with Zod validation
- [x] Unit tests for orchestrator

### Phase 3 - Compliance ✅

- [x] ComplianceWorker implementation
- [x] Fair Work tools (rest periods, penalty rates)
- [x] Australian holidays calculation
- [x] Violation severity levels (CRITICAL, MAJOR, MINOR)
- [x] Compliance tests

### Phase 4 - Optimization ✅

- [x] OptimizationWorker implementation
- [x] Cost optimization strategies
- [x] Coverage balancing
- [x] Shift consolidation
- [x] Optimization tests

### Phase 5 - Conflict Resolution ✅

- [x] ConflictWorker implementation
- [x] Understaffing resolution
- [x] Skill gap handling
- [x] Conflict tests

### Phase 6 - API & Integration ✅

- [x] Roster generation endpoint
- [x] Employee module
- [x] Store module
- [x] Station module
- [x] Scheduling module
- [x] Database seeding

---

## MAS Workflow

```
Request → Orchestrator → Planner → RosterWorker → ComplianceWorker
                                        ↓
                              OptimizationWorker → ConflictWorker → Response
```

### Detailed Flow

1. **Request received** at `/roster/generate`
2. **Orchestrator** creates request context with unique ID
3. **Planner** analyzes requirements and creates task plan
4. **RosterWorker** generates initial shift assignments
5. **ComplianceWorker** validates Fair Work compliance
   - CRITICAL violations → Stop and require human review
   - Other violations → Continue with warnings
6. **OptimizationWorker** optimizes for cost and coverage
7. **ConflictWorker** resolves remaining issues
8. **Response** returned with roster and metrics

---

## Guardrails and Safety

### Compliance Severity

| Level | Action |
|-------|--------|
| `CRITICAL` | Stop workflow, require human review |
| `MAJOR` | Flag for review, continue processing |
| `MINOR` | Log warning, continue processing |

### Runtime Validation

- All tool inputs/outputs validated with Zod schemas
- Strict TypeScript typing (no `any` in public API)
- Request ID tracking for traceability

### Resource Limits

- Configurable timeout for orchestration
- Maximum steps limit to prevent runaway execution
- Rate limiting on API endpoints

### Fallback Mode

When OpenAI API is unavailable:
- Orchestrator switches to deterministic algorithms
- Basic roster generation continues
- Compliance validation still enforced
- Optimization uses rule-based heuristics

---

## Zod Schemas

Located in `src/shared/schemas/`:

```typescript
// shift.schema.ts
export const ShiftSchema = z.object({
  employeeId: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  stationCode: z.string().optional(),
});

// roster.schema.ts
export const RosterSchema = z.object({
  periodId: z.number(),
  storeId: z.number(),
  shifts: z.array(ShiftSchema),
});

// compliance.schema.ts
export const ComplianceResultSchema = z.object({
  isCompliant: z.boolean(),
  violations: z.array(ViolationSchema),
  warnings: z.array(WarningSchema),
});
```

---

## Fair Work Compliance

### Implemented Rules

| Rule | Requirement |
|------|-------------|
| Rest Period | Minimum 10 hours between shifts |
| Weekly Hours | Maximum 38 hours (full-time) |
| Break Time | Required breaks based on shift length |
| Penalty Rates | Saturday (1.25x), Sunday (1.5x), Public Holiday (2.5x) |

### Australian Holidays

The system calculates Australian public holidays for accurate penalty rates:
- New Year's Day
- Australia Day
- Good Friday & Easter Monday
- Anzac Day
- Queen's Birthday
- Christmas & Boxing Day

---

## API Endpoints

### Roster Generation

```
POST /roster/generate
{
  "storeId": number,
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD"
}

Response:
{
  "status": "SUCCESS" | "REQUIRES_REVIEW" | "FAILED",
  "roster": { ... },
  "metrics": { ... },
  "violations": [ ... ],
  "executionTime": number
}
```

### Supporting Endpoints

- `GET /stores` - List stores
- `GET /employees` - List employees
- `GET /stations` - List stations
- `GET /schedule-periods` - List schedule periods
- `GET /shift-assignments` - List shift assignments
- `GET /shift-codes` - List shift codes

---

## Testing

### Unit Tests

```bash
npm test
```

Tests cover:
- Orchestrator service
- Each worker (Roster, Compliance, Optimization, Conflict)
- Fair Work tools
- Australian holidays

### Integration Tests

```bash
npm run test:e2e
```

Tests the complete workflow:
- Roster generation with fallback mode
- Compliance validation
- Optimization passes

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0 | 2025-12-09 | Initial MAS implementation |
| 1.1 | 2025-12-11 | Added ConflictWorker and optimization strategies |
| 1.2 | 2025-12-12 | Frontend integration and final testing |
