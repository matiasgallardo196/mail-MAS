# Technical Details and Specific Functionalities

This document explains in detail all specific functionalities of the boilerplate: scripts, configuration, logging, interceptors, security, and more.

---

## 🚀 Execution Scripts

### `npm run start:dev`

**Full command:**

```bash
cross-env NODE_ENV=development nest start --watch
```

**Features:**

- Sets `NODE_ENV=development`
- **Watch mode enabled** (automatic reload when files change)
- Real-time TypeScript compilation
- Automatic hot reload
- Loads variables from `.env.development`
- **Swagger available** at `/docs`
- Colored logs thanks to `pino-pretty`

**When to use:**

- Daily development
- When you want to see changes immediately
- To test new features

**Example output:**

```
[Nest] INFO  Starting Nest application...
[Nest] INFO  Logger initialized
[Nest] INFO  Server is running on port 3000
[Nest] INFO  Docs are running on port 3000/docs
[Nest] INFO  Environment: development
```

---

### `npm run start:prod:watch`

**Full command:**

```bash
cross-env NODE_ENV=production nest start --watch
```

**Features:**

- Sets `NODE_ENV=production`
- **Watch mode enabled** (automatic reload)
- Real-time TypeScript compilation
- Loads variables from `.env.production`
- **Swagger NOT available** (development only)
- JSON format logs (no colors)
- Stricter validation (forbidNonWhitelisted enabled)

**When to use:**

- To test production behavior locally
- To verify everything works with production config
- Before deploying

**Key difference:** Even though you're in "production mode", you still have watch mode and real-time compilation, making it useful for local testing.

---

### `npm run build`

**Full command:**

```bash
nest build
```

**Features:**

- Compiles all TypeScript code to JavaScript
- Generates files in the `dist/` folder
- Optimizes the code
- Does not run the application, only compiles

**Output:**

- `dist/` folder with all compiled JavaScript files
- Source maps for debugging (if configured)

**When to use:**

- Before deploying to production
- To verify the project compiles correctly
- Required before running `start:prod`

---

### `npm run start:prod`

**Full command:**

```bash
node dist/main
```

**Features:**

- Runs the compiled JavaScript code directly
- **Requires having run `build` previously**
- No watch mode
- No real-time compilation
- Uses system `NODE_ENV` (or default: development)
- If `NODE_ENV=production`, loads `.env.production`

**When to use:**

- On production servers
- To run the optimized and compiled version
- In CI/CD pipelines after build

**Typical flow:**

```bash
npm run build      # Compile
npm run start:prod # Run compiled version
```

---

## 🌍 Environment Configuration

### Loading System (`env.loader.ts`)

The project uses a custom system to load environment variables according to `NODE_ENV`.

**How it works:**

```6:8:src/config/env.loader.ts
export const NODE_ENV = process.env.NODE_ENV || 'development';
const envFile = `.env.${NODE_ENV}`;
dotenvConfig({ path: envFile });
```

1. Reads `NODE_ENV` from `process.env`
2. If it doesn't exist, uses `'development'` as default
3. Builds the file name: `.env.${NODE_ENV}`
4. Loads that file with `dotenv`

**Examples:**

- `NODE_ENV=development` → loads `.env.development`
- `NODE_ENV=production` → loads `.env.production`
- `NODE_ENV=test` → loads `.env.test`
- Without `NODE_ENV` → uses `development` and loads `.env.development`

### Available Variables

All variables are exported as constants from `env.loader.ts`:

**Environment flags:**

```10:13:src/config/env.loader.ts
export const IS_PRODUCTION = NODE_ENV === 'production';
export const IS_TEST = NODE_ENV === 'test';
export const IS_DEVELOPMENT = NODE_ENV === 'development';
```

**Server:**

```16:16:src/config/env.loader.ts
export const PORT = Number(process.env.PORT) || 3000;
```

- Default: `3000`

**Database:**

```19:19:src/config/env.loader.ts
export const DATABASE_URL = process.env.DATABASE_URL;
```

- No default (optional)

**Frontend:**

```22:22:src/config/env.loader.ts
export const FRONTEND_URL = process.env.FRONTEND_URL;
```

- No default (optional)

**CORS:**

```25:25:src/config/env.loader.ts
export const CORS_ORIGIN = process.env.CORS_ORIGIN;
```

- No default (recommended: `*` for development)

**Logger:**

```28:29:src/config/env.loader.ts
export const LOGGER_LEVEL = process.env.LOGGER_LEVEL;
export const FULL_LOGS = process.env.FULL_LOGS === 'true';
```

- `LOGGER_LEVEL`: No default (resolved according to environment)
- `FULL_LOGS`: Default `false` (only `'true'` string activates it)

**Rate Limiting:**

```32:33:src/config/env.loader.ts
export const RATE_LIMIT_TTL = Number(process.env.RATE_LIMIT_TTL) || 60; // 60 seconds
export const RATE_LIMIT_LIMIT = Number(process.env.RATE_LIMIT_LIMIT) || 100; // 100 requests
```

- `RATE_LIMIT_TTL`: Default `60` seconds
- `RATE_LIMIT_LIMIT`: Default `100` requests

### Usage in Code

Import constants from `env.loader.ts`:

```typescript
import { PORT, IS_DEVELOPMENT, CORS_ORIGIN } from './config/env.loader';
```

**Advantages:**

- TypeScript typing
- Centralized default values
- Easy to test (you can mock the constants)
- Single source of truth

---

## 📚 Swagger

### Configuration

Swagger is configured in `main.ts`:

```30:40:src/main.ts
  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Boiler Plate Nest JS')
    .setDescription('Boiler Plate Nest JS API')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  if (IS_DEVELOPMENT) {
    SwaggerModule.setup('docs', app, document);
  }
```

### Features

**Availability:**

- **Development only** (`IS_DEVELOPMENT === true`)
- In production, Swagger **is not available** for security
- Swagger code doesn't execute if you're not in development

**Access:**

- URL: `http://localhost:<PORT>/docs`
- Interactive graphical interface
- Allows testing endpoints directly from the browser

**Reason for development only:**

- Avoids exposing API documentation in production
- Reduces attack surface
- Lower overhead in production

### Customization

To add more information to Swagger, modify the `DocumentBuilder`:

```typescript
const config = new DocumentBuilder()
  .setTitle('My API')
  .setDescription('Detailed description')
  .setVersion('1.0.0')
  .addBearerAuth() // For JWT authentication
  .addTag('users', 'User operations')
  .build();
```

---

## 📝 Logging with Pino

### Configuration (`AppLoggerModule`)

The logging system is centralized in `src/common/logger/logger.module.ts`.

### LOGGER_LEVEL

Controls what log level is shown.

**Valid values:**

- `fatal` - Only fatal errors
- `error` - Only errors
- `warn` - Warnings and errors
- `info` - General information (default in production)
- `debug` - Detailed information (default in development)
- `trace` - Very detailed information
- `silent` - Shows no logs

**Level resolution:**

```9:14:src/common/logger/logger.module.ts
function resolveLoggerLevel(): LogLevel {
  if (LOGGER_LEVEL && VALID_LOG_LEVELS.includes(LOGGER_LEVEL as LogLevel)) {
    return LOGGER_LEVEL as LogLevel;
  }
  return IS_PRODUCTION ? 'info' : 'debug';
}
```

**Logic:**

1. If `LOGGER_LEVEL` is defined and valid → uses that value
2. If not, uses `'info'` in production
3. If not, uses `'debug'` in development

**Configuration example:**

```env
# In .env.development
LOGGER_LEVEL=debug  # See detailed logs

# In .env.production
LOGGER_LEVEL=warn   # Only see warnings and errors
```

### FULL_LOGS

Controls the amount of information logged in each request.

**Values:**

- `FULL_LOGS=true` → Logs complete request/response
- `FULL_LOGS=false` → Only method, url, statusCode (default)

**Implementation:**

```34:48:src/common/logger/logger.module.ts
        serializers: FULL_LOGS
          ? undefined
          : {
              req(req: Request) {
                return {
                  method: req.method,
                  url: req.url,
                };
              },
              res(res: Response) {
                return {
                  statusCode: res.statusCode,
                };
              },
            },
```

**With `FULL_LOGS=false` (default):**

```
{
  "level": 30,
  "time": 1234567890,
  "method": "GET",
  "url": "/api/users",
  "statusCode": 200
}
```

**With `FULL_LOGS=true`:**

```
{
  "level": 30,
  "time": 1234567890,
  "req": {
    "method": "GET",
    "url": "/api/users",
    "headers": { ... },
    "body": { ... },
    "query": { ... }
  },
  "res": {
    "statusCode": 200,
    "headers": { ... },
    "body": { ... }
  }
}
```

**When to use each:**

- `FULL_LOGS=false`: Production, when you only need basic metrics
- `FULL_LOGS=true`: Development/debugging, when you need to see all information

### Log Format

**Development:**

```22:31:src/common/logger/logger.module.ts
        transport: !IS_PRODUCTION
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
```

- Uses `pino-pretty` for readable format
- Colors for different levels
- Readable timestamps
- Ideal for development

**Production:**

- Doesn't use `pino-pretty` (better performance)
- Plain JSON format
- Ideal for centralized logs (ELK, CloudWatch, etc.)
- Easy to parse and analyze

### Redaction of Sensitive Headers

For security, certain headers are never logged:

```33:33:src/common/logger/logger.module.ts
        redact: ['req.headers.authorization', 'req.headers.cookie'],
```

**Redacted headers:**

- `authorization` - JWT tokens, API keys
- `cookie` - Session cookies

They will appear as `[Redacted]` in logs to avoid credential exposure.

### Logger Usage

In your services and controllers:

```typescript
import { Logger } from 'nestjs-pino';

@Injectable()
export class MyService {
  constructor(private readonly logger: Logger) {}

  doSomething() {
    this.logger.info('Something happened');
    this.logger.error({ err: error }, 'Something failed');
    this.logger.debug({ data }, 'Detailed information');
  }
}
```

---

## 📡 ResponseInterceptor

### Purpose

The `ResponseInterceptor` automatically wraps all successful responses in a consistent standard format.

### Response Format

All successful responses have this format:

```json
{
  "statusCode": 200,
  "data": {
    /* whatever your controller returns */
  },
  "path": "/api/users",
  "method": "GET",
  "requestId": "abc-123-def",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### Implementation

```31:40:src/common/interceptors/response.interceptor.ts
    return next.handle().pipe(
      map((data: unknown) => ({
        statusCode: res.statusCode,
        data,
        path: url,
        method,
        requestId,
        timestamp: new Date().toISOString(),
      })),
    );
```

**Included fields:**

- `statusCode`: HTTP response code
- `data`: Data returned by the controller
- `path`: Request route
- `method`: HTTP method (GET, POST, etc.)
- `requestId`: Unique request ID (if exists)
- `timestamp`: ISO date and time of the response moment

### RequestId Retrieval

The interceptor tries to get the requestId from multiple sources:

```29:29:src/common/interceptors/response.interceptor.ts
    const requestId = req.id ?? req.requestId ?? (req.headers['x-request-id'] as string | undefined);
```

**Search order:**

1. `req.id` - Generated by `nestjs-pino` automatically
2. `req.requestId` - If it exists in the request
3. `req.headers['x-request-id']` - If it comes in the header (useful for distributed tracing)

If it doesn't find any, it will be `undefined`.

### Global Registration

Registered globally in `AppModule`:

```31:34:src/app.module.ts
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
```

This means **all endpoints** automatically go through this interceptor, unless you use `@SkipResponseWrapper()`.

### Advantages

- **Consistency**: All responses have the same format
- **Traceability**: `requestId` and `timestamp` help debug
- **Information**: `path` and `method` facilitate log analysis
- **Automatic**: You don't need to manually format each response

---

## 🎯 SkipResponseWrapper

### Purpose

Decorator that allows skipping the wrapper from `ResponseInterceptor` for endpoints that need direct responses.

### Implementation

```1:5:src/common/decorators/skip-response-wrapper.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const SKIP_RESPONSE_WRAPPER_KEY = 'skipResponseWrapper';

export const SkipResponseWrapper = () => SetMetadata(SKIP_RESPONSE_WRAPPER_KEY, true);
```

### How It Works

The interceptor checks if this metadata exists:

```14:21:src/common/interceptors/response.interceptor.ts
    const skipWrapper = this.reflector.getAllAndOverride<boolean>(SKIP_RESPONSE_WRAPPER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipWrapper) {
      return next.handle();
    }
```

If the decorator is present, it returns the response directly without wrapping.

### Use Cases

**1. Health Checks:**

```6:14:src/modules/health/health.controller.ts
  @Get()
  @SkipResponseWrapper()
  getHealth() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
```

**Direct response:**

```json
{
  "status": "ok",
  "uptime": 123.456,
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

**Without the decorator, it would be:**

```json
{
  "statusCode": 200,
  "data": {
    "status": "ok",
    "uptime": 123.456,
    "timestamp": "2025-01-01T00:00:00.000Z"
  },
  "path": "/health",
  "method": "GET",
  "requestId": "...",
  "timestamp": "..."
}
```

**2. Integrations with external services:**

- Webhooks that expect a specific format
- Integrations with legacy systems
- Endpoints that must be compatible with existing APIs

### Application

Can be applied to:

- **Specific methods**: `@SkipResponseWrapper()` on a method
- **Entire classes**: `@SkipResponseWrapper()` on the controller

**Class-level example:**

```typescript
@Controller('webhooks')
@SkipResponseWrapper()
export class WebhooksController {
  // All methods in this controller will not be wrapped
}
```

---

## 🔐 Security

### Helmet

Helmet adds various HTTP security headers.

**Configuration:**

```23:28:src/main.ts
  // Helmet configuration
  app.use(
    helmet({
      ...(IS_PRODUCTION ? {} : { contentSecurityPolicy: false }),
    }),
  );
```

**Development:**

- CSP (Content Security Policy) **disabled**
- Reason: Swagger and other resources need to execute inline scripts
- Other security headers active

**Production:**

- **CSP active** by default (full Helmet behavior)
- All security headers active
- Maximum protection against XSS, clickjacking, etc.

**Headers that Helmet adds:**

- `Content-Security-Policy` - Prevents XSS
- `X-DNS-Prefetch-Control` - DNS prefetching control
- `X-Frame-Options` - Prevents clickjacking
- `X-Content-Type-Options` - Prevents MIME sniffing
- `Strict-Transport-Security` - Forces HTTPS
- And more...

**Customization:**

If you need to customize CSP in production:

```typescript
app.use(
  helmet({
    contentSecurityPolicy: IS_PRODUCTION
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            // ... more directives
          },
        }
      : false,
  }),
);
```

### Rate Limiting (Throttler)

Protects the API against abuse through request limits per IP.

**Configuration in AppModule:**

```12:17:src/app.module.ts
    ThrottlerModule.forRoot([
      {
        ttl: RATE_LIMIT_TTL,
        limit: RATE_LIMIT_LIMIT,
      },
    ]),
```

**Global guard:**

```35:38:src/app.module.ts
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
```

**Environment variables:**

```32:33:src/config/env.loader.ts
export const RATE_LIMIT_TTL = Number(process.env.RATE_LIMIT_TTL) || 60; // 60 seconds
export const RATE_LIMIT_LIMIT = Number(process.env.RATE_LIMIT_LIMIT) || 100; // 100 requests
```

**How it works:**

- `RATE_LIMIT_TTL`: Time window in seconds (default: 60)
- `RATE_LIMIT_LIMIT`: Maximum number of requests per IP in that window (default: 100)

**Example:**

- `RATE_LIMIT_TTL=60` and `RATE_LIMIT_LIMIT=100`
- Means: maximum 100 requests per minute per IP
- If exceeded, responds with `429 Too Many Requests`

**Response when limit exceeded:**

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

**Per-endpoint customization:**

You can use decorators to adjust limits:

```typescript
import { Throttle } from '@nestjs/throttler';

@Controller('api')
export class MyController {
  @Get('public')
  @Throttle(10, 60) // 10 requests per 60 seconds
  publicEndpoint() {
    return 'OK';
  }
}
```

**When to adjust:**

- **Development**: Increase limits to avoid blocks during testing
- **Production**: Adjust according to your expected traffic needs

---

## ✅ Global Validation (AppValidationPipe)

### Purpose

Automatically validates all DTOs in requests (body, query, params).

### Configuration

```6:15:src/common/pipes/app-validation.pipe.ts
  constructor() {
    super({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      validationError: { target: false, value: false },
      forbidNonWhitelisted: IS_PRODUCTION,
      disableErrorMessages: IS_PRODUCTION,
    });
  }
```

### Options Explained

**`whitelist: true`**

- Removes properties not defined in the DTO
- Prevents extra properties from reaching your logic

**`transform: true`**

- Automatically converts types (string → number, etc.)
- Example: `"123"` → `123` if the DTO expects `number`

**`enableImplicitConversion: true`**

- Allows implicit type conversion
- You don't need explicit transformation decorators in all cases

**`validationError: { target: false, value: false }`**

- Doesn't expose the original object in errors
- Doesn't expose the invalid value (for security)

**`forbidNonWhitelisted: IS_PRODUCTION`**

- **Development**: `false` - Extra properties are silently removed
- **Production**: `true` - Extra properties cause 400 error

**`disableErrorMessages: IS_PRODUCTION`**

- **Development**: `false` - Detailed error messages
- **Production**: `true` - Generic messages (hides internal details)

### Usage Example

**DTO:**

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

**Controller:**

```typescript
@Post('users')
createUser(@Body() dto: CreateUserDto) {
  // dto is already validated and transformed
  return this.usersService.create(dto);
}
```

**Valid request:**

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

**Request with extra properties (development):**

```json
{
  "email": "user@example.com",
  "password": "secret123",
  "extra": "this is silently removed"
}
```

→ Only `email` and `password` reach the controller

**Request with extra properties (production):**

```json
{
  "email": "user@example.com",
  "password": "secret123",
  "extra": "this"
}
```

→ Error 400: "property extra should not exist"

### Error Response

**Development:**

```json
{
  "statusCode": 400,
  "message": ["email must be an email", "password must be longer than or equal to 8 characters"],
  "error": "Bad Request"
}
```

**Production:**

```json
{
  "statusCode": 400,
  "message": "Bad Request"
}
```

---

## 🛡 Global Error Handling (AllExceptionsFilter)

### Purpose

Catches all unhandled exceptions and formats them consistently.

### Implementation

```8:12:src/common/filters/all-exceptions.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
```

**`@Catch()` without parameters** means it catches **any type** of exception.

### Status and Message Resolution

```22:35:src/common/filters/all-exceptions.filter.ts
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        const r = response as Record<string, string | string[]>;
        message = r.message ?? r.error ?? JSON.stringify(r);
      }
    }
```

**Logic:**

1. By default: status 500, generic message
2. If it's `HttpException`: uses its status and message
3. Extracts message from different possible formats

### Hiding Details in Production

```37:41:src/common/filters/all-exceptions.filter.ts
    let clientMessage: string | string[] = message;

    if (status === HttpStatus.INTERNAL_SERVER_ERROR && IS_PRODUCTION) {
      clientMessage = 'Internal server error';
    }
```

**Rule:**

- If it's a 500 error and you're in production → generic message to client
- Details are logged but not exposed

### Logging

```43:58:src/common/filters/all-exceptions.filter.ts
    const logPayload: Record<string, unknown> = {
      status,
      method,
      url,
      requestId,
    };

    if (exception instanceof Error) {
      logPayload.name = exception.name;
      logPayload.message = exception.message;
      logPayload.stack = exception.stack;
    } else {
      logPayload.exception = exception;
    }

    this.logger.error(logPayload, 'Unhandled exception');
```

**Logged information:**

- HTTP Status
- Method and URL
- RequestId (if exists)
- If it's `Error`: name, message, complete stack trace
- If not: the complete exception object

### Response Format

```60:67:src/common/filters/all-exceptions.filter.ts
    res.status(status).json({
      statusCode: status,
      message: clientMessage,
      path: url,
      method,
      requestId,
      timestamp: new Date().toISOString(),
    });
```

**Error response example:**

```json
{
  "statusCode": 400,
  "message": "Bad Request",
  "path": "/api/users",
  "method": "POST",
  "requestId": "abc-123",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### Exception Types

**HttpException (explicitly handled):**

```typescript
throw new BadRequestException('Invalid data');
throw new NotFoundException('User not found');
```

→ Status and message are respected

**Generic error:**

```typescript
throw new Error('Something went wrong');
```

→ Status 500, message according to environment

**Validation error:**

```typescript
// Thrown automatically by ValidationPipe
```

→ Status 400, validation messages

---

## 📦 Serialization (ClassSerializerInterceptor)

### Purpose

Allows using `class-transformer` decorators to control what gets serialized in responses.

### Global Configuration

```19:21:src/main.ts
  // Class serializer configuration
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));
```

Applies globally to all responses.

### Available Decorators

**`@Exclude()`** - Excludes a property from JSON:

```typescript
import { Exclude } from 'class-transformer';

export class UserEntity {
  id: string;
  email: string;

  @Exclude()
  password: string;

  @Exclude()
  internalSecret: string;
}
```

**Response:**

```json
{
  "id": "123",
  "email": "user@example.com"
  // password and internalSecret don't appear
}
```

**`@Expose()`** - Exposes a property (useful with `@Exclude()` at class level):

```typescript
@Exclude()
export class UserEntity {
  @Expose()
  id: string;

  @Expose()
  email: string;

  password: string; // Not exposed
}
```

**`@Transform()`** - Transforms the value before serializing:

```typescript
import { Transform } from 'class-transformer';

export class UserEntity {
  id: string;

  @Transform(({ value }) => value.toUpperCase())
  email: string;
}
```

### Common Use Case

**Entity with password:**

```typescript
export class User {
  id: string;
  email: string;
  password: string; // ⚠️ Should never go in the response
  createdAt: Date;
}

// In the controller:
@Get('profile')
getProfile() {
  return this.user; // ✅ password won't appear if you use @Exclude()
}
```

**Alternative: Response DTO:**

```typescript
export class UserResponseDto {
  id: string;
  email: string;
  createdAt: Date;
  // Doesn't include password

  constructor(user: User) {
    this.id = user.id;
    this.email = user.email;
    this.createdAt = user.createdAt;
  }
}
```

---

## 📚 Additional Resources

- [Official NestJS Documentation](https://docs.nestjs.com)
- [nestjs-pino](https://github.com/iamolegga/nestjs-pino)
- [class-validator](https://github.com/typestack/class-validator)
- [class-transformer](https://github.com/typestack/class-transformer)
- [Helmet](https://helmetjs.github.io/)
- [@nestjs/throttler](https://github.com/nestjs/throttler)
