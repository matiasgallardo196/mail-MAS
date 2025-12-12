# Project Architecture

This document describes the architecture, structure, and organization of the McDonald's Workforce Scheduling MAS (Multi-Agent System).

---

## 🚀 Technology Stack

- **Node.js 18+** - JavaScript runtime
- **NestJS 11** - Node.js framework based on Express
- **TypeScript** - Programming language
- **OpenAI Agents SDK** (`@openai/agents`) - Multi-Agent orchestration framework
- **PostgreSQL** - Relational database
- **TypeORM** - Object-Relational Mapping
- **Zod** - Runtime schema validation
- **Pino** via `nestjs-pino` - Structured logging system
- **class-transformer** - Object serialization and transformation
- **class-validator** - DTO validation
- **Helmet** - HTTP security headers
- **@nestjs/throttler** - Rate limiting and attack protection
- **Swagger** (`@nestjs/swagger`) - Automatic API documentation

---

## 🧱 Folder Structure

```
src/
  ├── app.module.ts                    # Root module: global configuration
  ├── main.ts                          # Application bootstrap
  │
  ├── agents/                          # Multi-Agent System (MAS)
  │   ├── orchestrator.service.ts      # Main orchestrator coordinating all agents
  │   ├── planner/
  │   │   └── orchestration.planner.ts # Planning and task distribution
  │   ├── workers/
  │   │   ├── roster.worker.ts         # Initial roster generation
  │   │   ├── compliance.worker.ts     # Fair Work compliance validation
  │   │   ├── optimization.worker.ts   # Cost and coverage optimization
  │   │   └── conflict.worker.ts       # Conflict resolution
  │   └── tools/
  │       ├── roster.tools.ts          # Roster manipulation tools
  │       ├── fairwork.tools.ts        # Fair Work compliance tools
  │       ├── employee.tools.ts        # Employee data tools
  │       ├── store.tools.ts           # Store data tools
  │       └── australian-holidays.ts   # Australian holiday calculations
  │
  ├── config/
  │   └── env.loader.ts                # Environment variable loading
  │
  ├── common/
  │   ├── logger/
  │   │   └── logger.module.ts         # Central Pino logging configuration
  │   ├── filters/
  │   │   └── all-exceptions.filter.ts # Global exception filter
  │   ├── interceptors/
  │   │   └── response.interceptor.ts  # Response formatting interceptor
  │   ├── pipes/
  │   │   └── app-validation.pipe.ts   # Global validation pipe
  │   └── decorators/
  │       └── skip-response-wrapper.decorator.ts
  │
  ├── db/
  │   ├── database.module.ts           # TypeORM database configuration
  │   ├── seeder.service.ts            # Database seeding service
  │   ├── seed.command.ts              # Seed command runner
  │   └── seeds/                       # Seed data files
  │
  ├── modules/
  │   ├── employees/
  │   │   ├── employee.module.ts
  │   │   ├── employee.controller.ts
  │   │   ├── employee.service.ts
  │   │   └── entities/
  │   │       ├── employee.entity.ts
  │   │       ├── employee-availability.entity.ts
  │   │       └── employee-skill.entity.ts
  │   │
  │   ├── stores/
  │   │   ├── store.module.ts
  │   │   ├── store.controller.ts
  │   │   ├── store.service.ts
  │   │   └── entities/
  │   │       ├── store.entity.ts
  │   │       ├── store-staff-requirement.entity.ts
  │   │       └── store-operating-hours.entity.ts
  │   │
  │   ├── stations/
  │   │   ├── stations.module.ts
  │   │   ├── stations.controller.ts
  │   │   ├── stations.service.ts
  │   │   └── entities/station.entity.ts
  │   │
  │   ├── scheduling/
  │   │   ├── scheduling.module.ts
  │   │   ├── roster.controller.ts      # Roster generation endpoints
  │   │   ├── schedule-periods.controller.ts
  │   │   ├── schedule-periods.service.ts
  │   │   ├── shift-assignments.controller.ts
  │   │   ├── shift-assignments.service.ts
  │   │   ├── shift-codes.controller.ts
  │   │   ├── shift-codes.service.ts
  │   │   └── entities/
  │   │       ├── schedule-period.entity.ts
  │   │       ├── shift-assignment.entity.ts
  │   │       └── shift-code.entity.ts
  │   │
  │   ├── health/
  │   │   ├── health.module.ts
  │   │   └── health.controller.ts
  │   │
  │   └── openai/
  │       └── openai.module.ts         # OpenAI SDK configuration
  │
  └── shared/
      ├── schemas/                     # Zod validation schemas
      │   ├── roster.schema.ts
      │   ├── shift.schema.ts
      │   ├── employee.schema.ts
      │   ├── compliance.schema.ts
      │   ├── optimization.schema.ts
      │   ├── policy.schema.ts
      │   └── roster-context.schema.ts
      ├── types/                       # TypeScript type definitions
      │   ├── agent.ts
      │   ├── compliance.ts
      │   ├── employee.ts
      │   ├── optimization.ts
      │   ├── roster.ts
      │   ├── shift.ts
      │   └── tool.ts
      ├── constants/                   # Application constants
      └── utils/                       # Utility functions
```

---

## 🤖 Multi-Agent System (MAS) Components

### 1. Orchestrator (`orchestrator.service.ts`)

The central coordinator that manages the entire scheduling workflow:

- Receives roster generation requests
- Coordinates worker execution in sequence
- Handles fallback mode when OpenAI is unavailable
- Manages error recovery and retries
- Tracks metrics and performance

### 2. Planner (`orchestration.planner.ts`)

Responsible for high-level task planning:

- Analyzes scheduling requirements
- Determines task priorities
- Distributes work to appropriate workers

### 3. Workers

Specialized agents that perform specific tasks:

| Worker | Responsibility |
|--------|----------------|
| **RosterWorker** | Generates initial shift assignments based on staff requirements |
| **ComplianceWorker** | Validates roster against Fair Work regulations (rest periods, max hours, penalties) |
| **OptimizationWorker** | Optimizes roster for cost efficiency and coverage balance |
| **ConflictWorker** | Resolves scheduling conflicts and coverage gaps |

### 4. Tools

Functions that workers can invoke:

| Tool | Description |
|------|-------------|
| `roster.tools.ts` | Create, modify, and validate rosters |
| `fairwork.tools.ts` | Check rest periods, calculate penalty rates |
| `employee.tools.ts` | Access employee availability and skills |
| `store.tools.ts` | Retrieve store requirements and hours |
| `australian-holidays.ts` | Calculate Australian public holidays |

---

## 🔄 MAS Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Orchestrator                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
    ┌───────────────────────┼───────────────────────┐
    ▼                       ▼                       ▼
┌─────────┐          ┌─────────────┐         ┌──────────────┐
│ Planner │ ──────▶  │ RosterWorker│ ──────▶ │ComplianceWork│
└─────────┘          └─────────────┘         └──────────────┘
                            │                       │
                            │                       ▼
                            │               ┌──────────────┐
                            │               │ Optimization │
                            │               │    Worker    │
                            │               └──────────────┘
                            │                       │
                            ▼                       ▼
                     ┌─────────────┐         ┌──────────────┐
                     │   Conflict  │ ◀────── │    Final     │
                     │   Worker    │         │   Roster     │
                     └─────────────┘         └──────────────┘
```

**Flow:**
1. Orchestrator receives roster generation request
2. Planner analyzes requirements and creates task plan
3. RosterWorker generates initial roster based on staff requirements
4. ComplianceWorker validates Fair Work compliance
5. OptimizationWorker optimizes for cost and coverage
6. ConflictWorker resolves any remaining issues
7. Final roster is returned with metrics

---

## 📋 Main Modules

### Scheduling Module
Handles all roster and shift management:
- Schedule periods (weekly/bi-weekly schedules)
- Shift assignments (individual employee shifts)
- Shift codes (shift templates like "MORNING", "AFTERNOON")

### Employee Module
Manages employee data:
- Employee profiles (name, contract type, wages)
- Availability schedules
- Skills and certifications

### Store Module
Manages store configuration:
- Store information
- Operating hours
- Staff requirements by time period

### Station Module
Manages work stations:
- Station definitions (Kitchen, Counter, Drive-Thru, etc.)
- Station requirements

---

## 🔐 Security & Infrastructure

### Global Providers (app.module.ts)

- `APP_FILTER` → `AllExceptionsFilter` - Global error handling
- `APP_PIPE` → `AppValidationPipe` - Global DTO validation
- `APP_INTERCEPTOR` → `ResponseInterceptor` - Response formatting
- `APP_GUARD` → `ThrottlerGuard` - Rate limiting

### Request Flow

1. **Request arrives** → ThrottlerGuard checks rate limit
2. **Passes rate limit** → AppValidationPipe validates DTOs
3. **Validation OK** → Controller processes request
4. **Controller returns** → ResponseInterceptor wraps response
5. **If error** → AllExceptionsFilter catches and formats error
6. **Logging** → AppLoggerModule records structured logs

---

## 🎯 Conventions

- **DTOs**: Use `class-validator` decorators for validation
- **Schemas**: Use Zod for runtime validation in MAS
- **Responses**: `ResponseInterceptor` automatically wraps them
- **Errors**: Throw `HttpException` or its derivatives
- **Logging**: Use injected `Logger` from `nestjs-pino`
- **Environment**: Define in `env.loader.ts` and use from there
