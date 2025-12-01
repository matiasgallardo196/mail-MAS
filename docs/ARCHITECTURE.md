# Project Architecture

This document describes the architecture, structure, and organization of the NestJS boilerplate.

---

## 🚀 Technology Stack

- **Node.js 18+** - JavaScript runtime
- **NestJS 11** - Node.js framework based on Express
- **TypeScript** - Programming language
- **Pino** via `nestjs-pino` - Structured logging system
- **class-transformer** - Object serialization and transformation
- **class-validator** - DTO validation
- **Helmet** - HTTP security headers
- **@nestjs/throttler** - Rate limiting and attack protection
- **Swagger** (`@nestjs/swagger`) - Automatic API documentation
- **dotenv** - Environment variable loading

---

## 🧱 Folder Structure

```
src/
  ├── app.module.ts                    # Root module: global configuration
  ├── main.ts                          # Application bootstrap
  │
  ├── config/
  │   └── env.loader.ts                # Environment variable loading according to NODE_ENV
  │
  ├── common/
  │   ├── logger/
  │   │   └── logger.module.ts         # Central configuration of nestjs-pino
  │   ├── filters/
  │   │   └── all-exceptions.filter.ts # Global exception filter
  │   ├── interceptors/
  │   │   └── response.interceptor.ts  # Global interceptor for formatting responses
  │   ├── pipes/
  │   │   └── app-validation.pipe.ts   # Global ValidationPipe with config by environment
  │   ├── decorators/
  │   │   └── skip-response-wrapper.decorator.ts  # Decorator to skip the response wrapper
  │   ├── middleware/                  # (Empty - for future use)
  │   └── utils/                       # (Empty - for future use)
  │
  ├── modules/
  │   └── health/
  │       ├── health.module.ts         # Health module
  │       └── health.controller.ts     # GET /health endpoint
  │
  └── shared/
      └── entities/                    # (Empty - for reusable DTOs, entities, etc.)
```

---

## 📋 Main Components

### 1. `app.module.ts` - Root Module

The main application module that configures:

**Imports:**
- `ThrottlerModule` - Rate limiting
- `AppLoggerModule` - Logging system
- `HealthModule` - Health check endpoint

**Global Providers:**
- `APP_FILTER` → `AllExceptionsFilter` - Global error handling
- `APP_PIPE` → `AppValidationPipe` - Global DTO validation
- `APP_INTERCEPTOR` → `ResponseInterceptor` - Response formatting
- `APP_GUARD` → `ThrottlerGuard` - Rate limiting applied globally

These providers are automatically applied to all controllers and endpoints in the application.

### 2. `main.ts` - Application Bootstrap

Application entry point. Configures:

1. **Logger** - Uses the nestjs-pino logger configured in `AppLoggerModule`
2. **ClassSerializerInterceptor** - Global serialization with class-transformer
3. **Helmet** - Security headers (CSP only in production)
4. **Swagger** - API documentation (development only)
5. **CORS** - Allowed origins configuration
6. **Port** - Listens on the configured port (default: 3000)

```12:17:src/main.ts
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Logger configuration
  const logger = app.get(Logger);
  app.useLogger(logger);
```

### 3. `config/env.loader.ts` - Environment Variable Loading

Custom system for loading environment variables according to `NODE_ENV`:

- Reads `NODE_ENV` from `process.env` (default: `'development'`)
- Loads the corresponding `.env.<NODE_ENV>` file (e.g., `.env.development`, `.env.production`)
- Exports typed constants for use throughout the application

**Exported constants:**
- `NODE_ENV`, `IS_PRODUCTION`, `IS_DEVELOPMENT`, `IS_TEST`
- `PORT` (default: 3000)
- `DATABASE_URL`
- `FRONTEND_URL`
- `CORS_ORIGIN`
- `LOGGER_LEVEL`
- `FULL_LOGS` (boolean)
- `RATE_LIMIT_TTL` (default: 60 seconds)
- `RATE_LIMIT_LIMIT` (default: 100 requests)

### 4. `common/logger/logger.module.ts` - Logging System

Centralized configuration of `nestjs-pino`:

**Features:**
- Log level configurable by environment
- Format: `pino-pretty` in development, JSON in production
- Redaction of sensitive headers (authorization, cookie)
- Verbosity control with `FULL_LOGS`

### 5. `common/filters/all-exceptions.filter.ts` - Global Error Handling

Filter that catches all unhandled exceptions:

- Catches any type of exception (`@Catch()` without parameters)
- Resolves status code and message according to error type
- In production, hides internal details of 500 errors
- Logs all information with Pino
- Formats error responses consistently

### 6. `common/interceptors/response.interceptor.ts` - Response Formatting

Interceptor that wraps all successful responses in a standard format:

- Adds `statusCode`, `data`, `path`, `method`, `requestId`, `timestamp`
- Can be skipped using the `@SkipResponseWrapper()` decorator
- Useful for maintaining consistency in API responses

### 7. `common/pipes/app-validation.pipe.ts` - Global Validation

ValidationPipe configured globally:

**Base configuration:**
- `whitelist: true` - Removes properties not defined in DTOs
- `transform: true` - Automatically converts types
- `enableImplicitConversion: true` - Implicit type conversion

**By environment:**
- **Development**: Detailed error messages, extra properties are removed (not rejected)
- **Production**: Error messages hidden, extra properties cause 400 error

### 8. `common/decorators/skip-response-wrapper.decorator.ts` - Custom Decorator

Allows skipping the response wrapper from `ResponseInterceptor`:

- Useful for endpoints like `/health` that need unwrapped responses
- Applied at method or controller level
- Used in `HealthController`

### 9. `modules/health/` - Health Check

Simple module that exposes a health endpoint:

- `GET /health` - Returns status, uptime, and timestamp
- Does not go through the response wrapper (uses `@SkipResponseWrapper()`)
- Ideal for infrastructure monitoring (Docker, Kubernetes, etc.)

---

## 🔄 Request Flow

1. **Request arrives** → ThrottlerGuard checks rate limit
2. **Passes rate limit** → AppValidationPipe validates DTOs (if applicable)
3. **Validation OK** → Controller processes the request
4. **Controller returns** → ResponseInterceptor wraps the response (if it doesn't have `@SkipResponseWrapper()`)
5. **If there's an error** → AllExceptionsFilter catches and formats the error
6. **Everything is logged** → AppLoggerModule records structured logs

---

## 📦 Modules and Extensibility

The project is ready to add new modules following this structure:

```
modules/
  └── my-new-module/
      ├── my-new-module.module.ts
      ├── my-new-module.controller.ts
      ├── my-new-module.service.ts
      └── dto/
          └── my-dto.ts
```

New modules must be imported in `app.module.ts` and automatically inherit:
- Global validation
- Error handling
- Response formatting
- Rate limiting
- Structured logging

---

## 🎯 Conventions

- **DTOs**: Use `class-validator` decorators for validation
- **Responses**: The `ResponseInterceptor` automatically wraps them
- **Errors**: Throw `HttpException` or its derivatives
- **Logging**: Use the injected `Logger` from `nestjs-pino`
- **Environment variables**: Define in `env.loader.ts` and use from there

