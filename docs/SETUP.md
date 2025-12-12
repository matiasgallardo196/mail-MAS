# Setup and Quick Start Guide

This guide will help you configure and get the McDonald's Workforce Scheduling MAS project running from scratch.

---

## 📋 Prerequisites

Before you begin, make sure you have installed:

- **Node.js 18+** (recommended: latest LTS version)
- **npm** (comes with Node.js) or **pnpm**
- **PostgreSQL 14+** (required for database)
- **Git** (to clone the repository)

To verify versions:

```bash
node --version  # Must be v18 or higher
npm --version
psql --version  # Must be v14 or higher
```

---

## 🚀 Steps to Start the Project

### 1. Clone the Repository

```bash
git clone <repository-url>
cd mail-MAS
```

### 2. Install Dependencies

```bash
npm install
```

This will install all dependencies listed in `package.json`, including:
- NestJS framework
- OpenAI Agents SDK
- TypeORM and PostgreSQL driver
- Zod validation library

### 3. Configure Environment Variables

The project uses an environment variable loading system based on `NODE_ENV`.

#### 3.1 Create environment files

Copy the example file:

```bash
# For development
cp .env.development.example .env.development

# For production (optional)
cp .env.production.example .env.production
```

#### 3.2 Configure `.env.development`

Edit `.env.development` with your actual values:

```env
# HTTP Server Port
PORT=3000

# PostgreSQL Database Connection
DATABASE_URL=postgresql://username:password@localhost:5432/mas_scheduling

# Allowed origin for CORS
CORS_ORIGIN=*

# Frontend URL (for linking)
FRONTEND_URL=http://localhost:3000

# Logging - Levels: fatal | error | warn | info | debug | trace | silent
LOGGER_LEVEL=debug

# Full request/response logging (set to true for debugging)
FULL_LOGS=false

# Rate limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_LIMIT=100

# OpenAI Configuration (required for AI-powered scheduling)
OPENAI_API_KEY=sk-your-openai-api-key

# Optional: Agent model configuration
# AGENT_MODEL=gpt-4-turbo-preview
# AGENT_TEMPERATURE=0.1
# AGENT_MAX_TOKENS=4000
```

> **Note**: The system has a fallback mode that works without OpenAI API key. If `OPENAI_API_KEY` is not set, the orchestrator will use deterministic scheduling algorithms.

### 4. Setup PostgreSQL Database

#### 4.1 Create the database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE mas_scheduling;

# Exit psql
\q
```

#### 4.2 Run database migrations (automatic with TypeORM)

TypeORM will automatically synchronize the schema on first run if `synchronize: true` is set in development.

### 5. Seed the Database

Populate the database with sample data (stores, employees, stations, etc.):

```bash
npm run seed
```

This command will create:
- Sample stores with operating hours
- Employees with different contract types
- Work stations (Kitchen, Counter, Drive-Thru, etc.)
- Employee availability schedules
- Staff requirements by time period

### 6. Start the Project

#### Development Mode (Recommended)

```bash
npm run start:dev
```

This command:
- Sets `NODE_ENV=development`
- Starts the server in watch mode (automatic reload)
- Loads `.env.development`
- Enables Swagger at `/docs`
- Shows colored logs with `pino-pretty`

You should see output like:

```
[Nest] INFO  Starting Nest application...
[Nest] INFO  Server is running on port 3000
[Nest] INFO  Docs are running on port 3000/docs
[Nest] INFO  Environment: development
[Nest] INFO  Database connected successfully
```

#### Other Commands

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Development with watch mode |
| `npm run start:prod:watch` | Production mode with watch |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run start:prod` | Run compiled code (requires build first) |
| `npm test` | Run unit tests |
| `npm run test:cov` | Tests with coverage report |
| `npm run test:e2e` | End-to-end tests |
| `npm run seed` | Seed database with sample data |

### 7. Verify Everything Works

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

#### Swagger Documentation

Open in your browser:
```
http://localhost:3000/docs
```

You should see the Swagger UI with all available endpoints.

> **Note**: Swagger is only available in development mode.

#### Test Roster Generation

```bash
curl -X POST http://localhost:3000/roster/generate \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": 1,
    "startDate": "2025-01-06",
    "endDate": "2025-01-12"
  }'
```

---

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `start:dev` | Development with watch mode, `NODE_ENV=development` |
| `start:prod:watch` | Production with watch mode |
| `build` | Compiles TypeScript to JavaScript in `dist/` |
| `start:prod` | Runs `node dist/main` (requires previous build) |
| `test` | Runs unit tests |
| `test:watch` | Runs tests in watch mode |
| `test:cov` | Runs tests with coverage report |
| `test:e2e` | Runs end-to-end tests |
| `seed` | Seeds database with sample data |
| `lint` | Runs ESLint and fixes errors |
| `format` | Formats code with Prettier |

---

## 🐛 Troubleshooting

### Database Connection Failed

**Error**: `connection refused` or `ECONNREFUSED`

- Verify PostgreSQL is running: `pg_isready`
- Check your `DATABASE_URL` is correct
- Ensure the database exists: `psql -l`

**Error**: `authentication failed`

- Verify username and password in `DATABASE_URL`
- Check PostgreSQL authentication settings (`pg_hba.conf`)

### Server Won't Start

**Port in use:**
```bash
# Windows:
netstat -ano | findstr :3000

# Linux/Mac:
lsof -i :3000
```

Solution: Change `PORT` in `.env.development` or terminate the process.

**File `.env` not found:**
- Verify `.env.development` exists
- Make sure you created it from `.env.development.example`

### OpenAI API Errors

**Error**: `OPENAI_API_KEY is not set`
- The system will use fallback mode (deterministic scheduling)
- Set `OPENAI_API_KEY` in `.env.development` for AI-powered scheduling

**Error**: `Rate limit exceeded`
- Wait a few minutes and try again
- Consider upgrading your OpenAI plan

### TypeScript Compilation Errors

```bash
# Clean and reinstall
rm -rf node_modules dist
npm install
npm run build
```

---

## ✅ Setup Checklist

Before starting development, verify:

- [ ] Node.js 18+ installed
- [ ] PostgreSQL 14+ installed and running
- [ ] Dependencies installed (`npm install`)
- [ ] `.env.development` file created and configured
- [ ] Database created in PostgreSQL
- [ ] Database seeded (`npm run seed`)
- [ ] Server starts correctly (`npm run start:dev`)
- [ ] Health check responds (`GET /health`)
- [ ] Swagger is available (`GET /docs`)
- [ ] Roster generation works (`POST /roster/generate`)

---

## 📚 Next Steps

Once the project is running:

1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the MAS structure
2. Read [DETAILS.md](./DETAILS.md) for technical implementation details
3. Explore the API using Swagger at `/docs`
4. Test roster generation with different parameters
5. Review the seed data to understand the data model

---

## 💡 Tips

- **Hot Reload**: In `start:dev` mode, changes reload automatically
- **Fallback Mode**: The system works without OpenAI API key using deterministic algorithms
- **Swagger**: Use Swagger UI to test endpoints interactively
- **Logs**: In development, logs are colored for better readability
- **TypeScript**: The project uses strict mode, pay attention to types
