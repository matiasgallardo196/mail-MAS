# Setup and Quick Start Guide

This guide will help you configure and get the project running from scratch.

---

## 📋 Prerequisites

Before you begin, make sure you have installed:

- **Node.js 18+** (recommended: latest LTS version)
- **npm** (comes with Node.js) or **pnpm** (faster alternative)
- **Git** (to clone the repository)

To verify versions:

```bash
node --version  # Must be v18 or higher
npm --version   # or pnpm --version
```

---

## 🚀 Steps to Start the Project

### 1. Clone the Repository

```bash
git clone <repository-url>
cd boiler-plate-nest-js
```

### 2. Install Dependencies

```bash
npm install
```

Or if you prefer to use pnpm:

```bash
pnpm install
```

This will install all dependencies listed in `package.json`.

### 3. Configure Environment Variables

The project uses an environment variable loading system based on `NODE_ENV`.

#### 3.1 Create environment files

Copy the example file and create the files according to the environment:

```bash
# For development
cp env.development.example .env.development

# For production (optional, if you want to test locally)
cp env.production.example .env.production
```

#### 3.2 Understand the loading system

The project loads variables according to the `NODE_ENV` value:

- If `NODE_ENV=development` → loads `.env.development`
- If `NODE_ENV=production` → loads `.env.production`
- If `NODE_ENV=test` → loads `.env.test`

**By default**, if `NODE_ENV` is not defined, it uses `development`.

#### 3.3 Adjust values in `.env.development`

Open `.env.development` and adjust the values according to your needs:

```env
# HTTP Server Port
PORT=3000

# Allowed origin for CORS
# You can use * to allow all, or a specific URL
CORS_ORIGIN=*

# Database URL (if you're going to use one)
DATABASE_URL=postgresql://user:password@localhost:5432/mydb

# Frontend URL (if you have one)
FRONTEND_URL=http://localhost:3000

# Logging - Levels: fatal | error | warn | info | debug | trace | silent
# If omitted, uses: info in production, debug in development
LOGGER_LEVEL=debug

# If FULL_LOGS=true → logs complete request/response
# If FULL_LOGS=false → logs only basic data
FULL_LOGS=false

# Rate limiting
RATE_LIMIT_TTL=60          # Time window in seconds
RATE_LIMIT_LIMIT=100       # Requests allowed per IP
```

**Note**: For local development, the default values from `env.development.example` are usually sufficient.

### 4. Start the Project

#### Development Mode (Recommended to start)

```bash
npm run start:dev
```

This command:
- Sets `NODE_ENV=development`
- Starts the server in watch mode (automatic reload)
- Compiles TypeScript on-the-fly
- Loads `.env.development`

You should see something like:

```
[Nest] INFO  Starting Nest application...
[Nest] INFO  Logger initialized
[Nest] INFO  Server is running on port 3000
[Nest] INFO  Docs are running on port 3000/docs
[Nest] INFO  Environment: development
```

#### Other available commands

**Production with watch (to test in production mode):**

```bash
npm run start:prod:watch
```

- Sets `NODE_ENV=production`
- Watch mode enabled (automatic reload)
- Useful for testing production behavior locally

**Build and production execution:**

```bash
# 1. Build the project
npm run build

# 2. Run from dist/
npm run start:prod
```

- Compiles TypeScript to JavaScript in the `dist/` folder
- Runs the compiled code directly with Node.js
- Requires having run `build` previously

**Tests:**

```bash
npm test                # Run tests once
npm run test:watch      # Run tests in watch mode
npm run test:cov        # Tests with coverage
npm run test:e2e        # End-to-end tests
```

### 5. Verify It Works

Once the server is started, test the following endpoints:

#### Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "uptime": 123.456,
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

#### Swagger (development only)

Open in your browser:
```
http://localhost:3000/docs
```

You should see the Swagger interface with the API documentation.

**Note**: Swagger is only available when `NODE_ENV=development`. In production it will not be available for security reasons.

---

## 🔧 Available Scripts

Here is the complete list of scripts in `package.json`:

| Script | Description |
|--------|-------------|
| `start:dev` | Development with watch mode, `NODE_ENV=development` |
| `start:prod:watch` | Production with watch mode, `NODE_ENV=production` |
| `build` | Compiles TypeScript to JavaScript in `dist/` |
| `start:prod` | Runs `node dist/main` (requires previous build) |
| `start` | Starts without watch (not recommended, use `start:dev`) |
| `start:debug` | Starts in debug mode with watch |
| `test` | Runs unit tests |
| `test:watch` | Runs tests in watch mode |
| `test:cov` | Runs tests with coverage report |
| `test:e2e` | Runs end-to-end tests |
| `lint` | Runs ESLint and fixes errors automatically |
| `format` | Formats code with Prettier |

---

## 🐛 Troubleshooting

### Server won't start

**Port in use:**
```bash
# Check which process is using port 3000
# Windows:
netstat -ano | findstr :3000

# Linux/Mac:
lsof -i :3000
```

Solution: Change the `PORT` in your `.env.development` or terminate the process using the port.

**File .env not found:**
- Verify that `.env.development` exists (or `.env.production` according to your `NODE_ENV`)
- Make sure you created it from `env.development.example` or `env.production.example` as appropriate

**Dependency errors:**
```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Swagger doesn't appear

- Swagger is only available in development (`NODE_ENV=development`)
- Verify you're running with `npm run start:dev`
- Access `http://localhost:<PORT>/docs` (verify the correct port)

### Rate limiting too aggressive

If you receive 429 errors (Too Many Requests):

- Increase `RATE_LIMIT_LIMIT` in your `.env.development`
- Or increase `RATE_LIMIT_TTL` for a wider window
- For example:
  ```env
  RATE_LIMIT_TTL=60
  RATE_LIMIT_LIMIT=1000
  ```

### TypeScript compilation errors

```bash
# Verify that tsconfig.json exists and is correct
# Reinstall TypeScript dependencies
npm install --save-dev typescript @types/node
```

---

## ✅ Setup Checklist

Before starting development, verify:

- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env.development` file created and configured
- [ ] Server starts correctly (`npm run start:dev`)
- [ ] Health check responds (`GET /health`)
- [ ] Swagger is available (`GET /docs`) - development only
- [ ] No errors in console

---

## 📚 Next Steps

Once the project is running:

1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the project structure
2. Read [DETAILS.md](./DETAILS.md) to learn about specific functionalities
3. Start adding your modules in `src/modules/`
4. Define your DTOs with validation using `class-validator`
5. Configure your database if you need it

---

## 💡 Tips

- **Hot Reload**: In `start:dev` mode, changes reload automatically
- **Environment variables**: Always use development values for `env.development`
- **Git**: Don't forget to add `.env.*` to `.gitignore` (already configured)
- **Logs**: In development you'll see colored logs thanks to `pino-pretty`
- **TypeScript**: The project uses strict mode, so pay attention to types
