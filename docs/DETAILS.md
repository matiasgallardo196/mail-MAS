# Technical Details and Specific Functionalities

This document explains in detail all specific functionalities of the McDonald's Workforce Scheduling MAS: Multi-Agent System architecture, scheduling workflows, compliance validation, and core infrastructure.

---

## 🤖 Multi-Agent System (MAS) Architecture

### Overview

The MAS is designed to automate workforce scheduling while ensuring compliance with Australian Fair Work regulations. It uses a collaborative approach where specialized agents work together to generate optimal rosters.

### Orchestrator Service

**Location**: `src/agents/orchestrator.service.ts`

The Orchestrator is the central coordinator of the MAS. It manages the entire scheduling workflow:

```typescript
// Simplified workflow
async generateRoster(request: RosterRequest): Promise<RosterResult> {
  // 1. Initialize context
  const context = await this.buildContext(request);
  
  // 2. Generate initial roster
  const roster = await this.rosterWorker.generate(context);
  
  // 3. Validate compliance
  const compliance = await this.complianceWorker.validate(roster);
  
  // 4. Check for critical violations
  if (compliance.hasCriticalViolations()) {
    return { status: 'REQUIRES_REVIEW', violations: compliance.violations };
  }
  
  // 5. Optimize roster
  const optimized = await this.optimizationWorker.optimize(roster);
  
  // 6. Resolve conflicts
  const final = await this.conflictWorker.resolve(optimized);
  
  return { status: 'SUCCESS', roster: final };
}
```

**Key Features:**
- Request ID tracking for traceability
- Fallback mode when OpenAI is unavailable
- Timeout and max steps configuration
- Comprehensive error handling
- Metrics collection

### Workers

#### RosterWorker (`roster.worker.ts`)

Generates initial shift assignments based on store requirements.

**Tool**: `generate_initial_roster`

**Input:**
- Store ID
- Date range
- Staff requirements
- Employee availability

**Output:**
- Array of shift assignments
- Coverage metrics

**Algorithm:**
1. Fetch store requirements by time band
2. Get available employees for each day
3. Match employees to required stations
4. Assign shifts based on availability and skills
5. Balance hours across employees

---

#### ComplianceWorker (`compliance.worker.ts`)

Validates roster against Fair Work regulations.

**Tool**: `validate_fair_work_compliance`

**Checks performed:**
- Minimum 10-hour rest period between shifts
- Maximum weekly hours (38 for full-time, variable for part-time)
- Minimum weekly hours (contract requirements)
- Penalty rate calculations (weekends, public holidays)
- Break requirements

**Severity Levels:**

| Level | Description | Action |
|-------|-------------|--------|
| `CRITICAL` | Legal violation | Stop workflow, require human review |
| `MAJOR` | Policy violation | Flag for review, continue |
| `MINOR` | Optimization opportunity | Log only |

**Example Output:**
```json
{
  "isCompliant": false,
  "violations": [
    {
      "type": "REST_PERIOD_VIOLATION",
      "severity": "CRITICAL",
      "employeeId": "emp_123",
      "details": "Only 8 hours between shifts on 2025-01-06"
    }
  ],
  "warnings": [...]
}
```

---

#### OptimizationWorker (`optimization.worker.ts`)

Optimizes roster for cost efficiency and coverage balance.

**Tool**: `optimize_roster`

**Optimization Goals:**
1. Minimize total labor cost
2. Maximize coverage efficiency
3. Balance hours across employees
4. Prefer experienced staff for peak periods
5. Minimize overtime

**Strategies:**
- Shift consolidation (reduce fragmented shifts)
- Cost balancing (prefer lower-wage employees for non-peak)
- Coverage smoothing (avoid over/understaffing)

**Output:**
```json
{
  "roster": [...],
  "metrics": {
    "totalCost": 15420.50,
    "coverageScore": 0.95,
    "balanceScore": 0.88,
    "improvements": [
      "Reduced overtime by 12 hours",
      "Improved peak coverage by 8%"
    ]
  }
}
```

---

#### ConflictWorker (`conflict.worker.ts`)

Resolves scheduling conflicts and coverage gaps.

**Tool**: `resolve_conflicts`

**Types of Conflicts:**
- Understaffing (not enough employees for a time period)
- Overstaffing (too many employees scheduled)
- Skill gaps (required skills not available)
- Preference conflicts (employee requests violated)

**Resolution Strategies:**
1. Find replacement employees
2. Extend adjacent shifts
3. Split shifts between employees
4. Flag for manual intervention

---

### Tools

#### Fair Work Tools (`fairwork.tools.ts`)

```typescript
// Check rest periods
checkRestPeriod(shift1End: Date, shift2Start: Date): boolean

// Calculate penalty rates
calculatePenaltyRate(date: Date, time: string): number

// Get minimum rest period (10 hours)
getMinimumRestPeriod(): number
```

**Australian Penalty Rates:**
| Period | Rate |
|--------|------|
| Weekday | 1.0x |
| Saturday | 1.25x |
| Sunday | 1.5x |
| Public Holiday | 2.5x |

#### Employee Tools (`employee.tools.ts`)

```typescript
// Get employee availability
getAvailability(employeeId: string, dateRange: DateRange): Availability[]

// Get employee skills
getSkills(employeeId: string): Skill[]

// Check if employee can work shift
canWork(employeeId: string, shift: Shift): boolean
```

#### Store Tools (`store.tools.ts`)

```typescript
// Get staff requirements
getStaffRequirements(storeId: string, date: Date): Requirement[]

// Get operating hours
getOperatingHours(storeId: string, date: Date): Hours

// Get peak periods
getPeakPeriods(storeId: string): PeakPeriod[]
```

#### Australian Holidays (`australian-holidays.ts`)

Calculates Australian public holidays for accurate penalty rate calculations.

**Supported Holidays:**
- New Year's Day
- Australia Day
- Good Friday
- Easter Monday
- Anzac Day
- Queen's Birthday (varies by state)
- Christmas Day
- Boxing Day

---

## 📊 Database Entities

### SchedulePeriod

Represents a scheduling period (usually one week).

```typescript
@Entity()
class SchedulePeriod {
  id: number;
  storeId: number;
  startDate: Date;
  endDate: Date;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: Date;
}
```

### ShiftAssignment

Individual shift assigned to an employee.

```typescript
@Entity()
class ShiftAssignment {
  id: number;
  schedulePeriodId: number;
  employeeId: number;
  stationId: number;
  shiftCodeId: number;
  date: Date;
  startTime: string;
  endTime: string;
  breakMinutes: number;
}
```

### ShiftCode

Template for shift types.

```typescript
@Entity()
class ShiftCode {
  id: number;
  code: string;           // e.g., "MORNING", "AFTERNOON", "NIGHT"
  name: string;
  defaultStartTime: string;
  defaultEndTime: string;
  color: string;          // For UI display
}
```

### Employee

```typescript
@Entity()
class Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  contractType: 'FULL_TIME' | 'PART_TIME' | 'CASUAL';
  hourlyRate: number;
  minWeeklyHours: number;
  maxWeeklyHours: number;
  defaultStationCode: string;
  storeId: number;
}
```

### EmployeeAvailability

```typescript
@Entity()
class EmployeeAvailability {
  id: number;
  employeeId: number;
  dayOfWeek: number;      // 0-6 (Sunday-Saturday)
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}
```

### Store

```typescript
@Entity()
class Store {
  id: number;
  name: string;
  address: string;
  timezone: string;       // e.g., "Australia/Melbourne"
}
```

### Station

```typescript
@Entity()
class Station {
  id: number;
  code: string;           // e.g., "KITCHEN", "COUNTER", "DRIVE_THRU"
  name: string;
  storeId: number;
}
```

---

## 🔄 Scheduling Workflow

### 1. Request Initiation

```
POST /roster/generate
{
  "storeId": 1,
  "startDate": "2025-01-06",
  "endDate": "2025-01-12"
}
```

### 2. Context Building

The orchestrator gathers all necessary data:
- Store configuration and operating hours
- Staff requirements by time period
- Employee availability and skills
- Existing shift assignments (if any)

### 3. Initial Generation

RosterWorker creates a base roster:
- Assigns employees to required stations
- Respects availability constraints
- Meets minimum staffing levels

### 4. Compliance Validation

ComplianceWorker checks all Fair Work rules:
- Rest periods (min 10 hours)
- Maximum hours per week
- Penalty rate calculations

### 5. Optimization

OptimizationWorker improves the roster:
- Reduces labor cost
- Improves coverage balance
- Addresses minor violations

### 6. Conflict Resolution

ConflictWorker handles remaining issues:
- Fills coverage gaps
- Resolves double-bookings
- Flags unresolvable conflicts

### 7. Response

```json
{
  "status": "SUCCESS",
  "roster": {
    "periodId": 1,
    "shifts": [...],
    "metrics": {
      "totalCost": 15420.50,
      "coverageScore": 0.95,
      "complianceScore": 1.0
    }
  },
  "warnings": [],
  "executionTime": 2340
}
```

---

## 🚀 Execution Scripts

### `npm run start:dev`

**Full command:**
```bash
cross-env NODE_ENV=development nest start --watch
```

**Features:**
- Sets `NODE_ENV=development`
- Watch mode enabled (automatic reload)
- Real-time TypeScript compilation
- Loads variables from `.env.development`
- Swagger available at `/docs`
- Colored logs with `pino-pretty`

### `npm run start:prod`

**Full command:**
```bash
node dist/main
```

**Features:**
- Runs compiled JavaScript directly
- Requires prior `npm run build`
- Production optimizations enabled
- Swagger disabled

### `npm run seed`

**Full command:**
```bash
ts-node -r tsconfig-paths/register src/db/seed.command.ts
```

**Creates:**
- Sample stores with operating hours
- Employees with various contract types
- Work stations
- Employee availability schedules
- Staff requirements

---

## 🌍 Environment Configuration

### Loading System (`env.loader.ts`)

The project loads environment variables based on `NODE_ENV`:

```typescript
export const NODE_ENV = process.env.NODE_ENV || 'development';
const envFile = `.env.${NODE_ENV}`;
dotenvConfig({ path: envFile });
```

### Available Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `DATABASE_URL` | - | PostgreSQL connection string |
| `CORS_ORIGIN` | - | Allowed CORS origins |
| `LOGGER_LEVEL` | `debug`/`info` | Log level |
| `FULL_LOGS` | `false` | Complete request/response logging |
| `RATE_LIMIT_TTL` | `60` | Rate limit window (seconds) |
| `RATE_LIMIT_LIMIT` | `100` | Requests per window |
| `OPENAI_API_KEY` | - | OpenAI API key for AI agents |

---

## 📚 Swagger

### Configuration

Swagger is configured in `main.ts` and only available in development:

```typescript
if (IS_DEVELOPMENT) {
  const config = new DocumentBuilder()
    .setTitle('McDonald\'s Workforce Scheduling MAS')
    .setDescription('Multi-Agent System API')
    .setVersion('1.0')
    .build();
  
  SwaggerModule.setup('docs', app, document);
}
```

### Access

- URL: `http://localhost:<PORT>/docs`
- Interactive API testing
- Request/response examples

---

## 📝 Logging with Pino

### Log Levels

| Level | Description |
|-------|-------------|
| `fatal` | Only fatal errors |
| `error` | Error messages |
| `warn` | Warnings |
| `info` | General information (production default) |
| `debug` | Detailed information (development default) |
| `trace` | Very detailed tracing |

### Format

**Development:** Colored, human-readable (pino-pretty)
**Production:** JSON format for log aggregation

### Sensitive Data Redaction

Authorization and cookie headers are automatically redacted:
```typescript
redact: ['req.headers.authorization', 'req.headers.cookie']
```

---

## 🔐 Security

### Helmet

Helmet adds security headers:
- Content Security Policy (production only)
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security

### Rate Limiting (Throttler)

Protects API from abuse:
```typescript
ThrottlerModule.forRoot([{
  ttl: RATE_LIMIT_TTL,     // 60 seconds
  limit: RATE_LIMIT_LIMIT, // 100 requests
}])
```

---

## ✅ Global Validation (AppValidationPipe)

### Configuration

```typescript
{
  whitelist: true,              // Remove extra properties
  transform: true,              // Auto-convert types
  transformOptions: { enableImplicitConversion: true },
  forbidNonWhitelisted: IS_PRODUCTION,  // Strict in production
  disableErrorMessages: IS_PRODUCTION,   // Hide details in production
}
```

---

## 📡 ResponseInterceptor

All successful responses are wrapped in a standard format:

```json
{
  "statusCode": 200,
  "data": { /* response data */ },
  "path": "/roster/generate",
  "method": "POST",
  "requestId": "abc-123",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

Use `@SkipResponseWrapper()` decorator to bypass for specific endpoints (e.g., `/health`).

---

## 🛡 Global Error Handling

All exceptions are caught and formatted consistently:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "path": "/roster/generate",
  "method": "POST",
  "requestId": "abc-123",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

In production, 500 error details are hidden for security.

---

## 📚 Additional Resources

- [Official NestJS Documentation](https://docs.nestjs.com)
- [OpenAI Agents SDK](https://github.com/openai/openai-agents-js)
- [Fair Work Australia](https://www.fairwork.gov.au/)
- [TypeORM Documentation](https://typeorm.io/)
- [Zod Documentation](https://zod.dev/)
