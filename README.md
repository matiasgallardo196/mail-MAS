# McDonald's Workforce Scheduling MAS

A Multi-Agent System (MAS) for intelligent workforce scheduling built with NestJS and OpenAI Agents SDK. This system automates roster generation, compliance validation, and shift optimization for McDonald's restaurants while ensuring adherence to Australian Fair Work regulations.

---

## 🌐 Live Demo

| Application | URL |
|-------------|-----|
| **Backend API** | [api.yep-ai.challenge.matiasgallardo.cloud](https://api.yep-ai.challenge.matiasgallardo.cloud) |
| **Frontend** | [yep-ai.challenge.matiasgallardo.cloud](https://yep-ai.challenge.matiasgallardo.cloud) |

---

## 🚀 Main Stack

- **Node.js 18+** + **NestJS 11**
- **TypeScript**
- **OpenAI Agents SDK** (`@openai/agents`) - Multi-Agent orchestration
- **PostgreSQL** + **TypeORM** - Database and ORM
- **Zod** - Schema validation
- **Pino** via `nestjs-pino` - Structured logging
- **Helmet** + **@nestjs/throttler** - Security and rate limiting
- **Swagger** (`@nestjs/swagger`) - API documentation

---

## 🤖 Multi-Agent System Architecture

The MAS consists of specialized agents that collaborate to generate optimal rosters:

| Agent | Responsibility |
|-------|----------------|
| **Orchestrator** | Coordinates the entire scheduling workflow |
| **RosterWorker** | Generates initial shift assignments |
| **ComplianceWorker** | Validates Fair Work compliance (rest periods, penalties, hours) |
| **OptimizationWorker** | Optimizes cost and coverage efficiency |
| **ConflictWorker** | Resolves scheduling conflicts and coverage gaps |

---

## 📖 Documentation

### 🧱 [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
Project structure, MAS components, and folder organization.

### 🚀 [SETUP.md](./docs/SETUP.md)
Installation guide, database setup, environment configuration, and running the project.

### 🔧 [DETAILS.md](./docs/DETAILS.md)
Detailed technical documentation including MAS workflows, compliance validation, and API details.

---

## 🎯 Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mail-MAS
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.development.example .env.development
   ```
   Edit `.env.development` with your PostgreSQL connection and OpenAI API key.

4. **Setup database**
   ```bash
   npm run seed
   ```

5. **Start the server**
   ```bash
   npm run start:dev
   ```

6. **Test the API**
   - Health check: `GET http://localhost:3000/health`
   - Swagger docs: `GET http://localhost:3000/docs` (development only)
   - Generate roster: `POST http://localhost:3000/roster/generate`

For detailed setup instructions, see [SETUP.md](./docs/SETUP.md).

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/docs` | Swagger documentation (dev only) |
| `POST` | `/roster/generate` | Generate a new roster |
| `GET` | `/stores` | List all stores |
| `GET` | `/employees` | List all employees |
| `GET` | `/stations` | List all stations |
| `GET` | `/schedule-periods` | List schedule periods |
| `GET` | `/shift-assignments` | List shift assignments |

---

## 🧪 Testing

```bash
npm test              # Run unit tests
npm run test:watch    # Run tests in watch mode
npm run test:cov      # Run tests with coverage
npm run test:e2e      # Run end-to-end tests
```

---

## 📝 License

UNLICENSED
