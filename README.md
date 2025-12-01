# Boiler Plate Nest JS

NestJS project base designed for quick start in hackathons or new services, with **environment configuration**, **structured logging**, **global validation**, **error handling**, **basic security**, and **Swagger** ready to use.

---

## 🚀 Main Stack

- **Node.js** + **NestJS 11**
- **TypeScript**
- **Pino** via `nestjs-pino` (structured logging)
- **class-transformer** (response serialization)
- **Helmet** (security headers)
- **@nestjs/throttler** (rate limiting)
- **Swagger** (`@nestjs/swagger`)

---

## 📖 Documentation

This project is documented in 3 main sections:

### 🧱 [ARCHITECTURE.md](./docs/ARCHITECTURE.md)

Project structure, folder organization, and detailed description of each main component.

### 🚀 [SETUP.md](./docs/SETUP.md)

Step-by-step guide to get the project running from scratch: installation, environment variables configuration, available scripts, and initial verification.

### 🔧 [DETAILS.md](./docs/DETAILS.md)

Detailed explanation of specific functionalities:

- Execution scripts (start:dev, start:prod:watch, start:prod)
- Environment configuration
- Swagger (development only)
- Logging with Pino (LOGGER_LEVEL, FULL_LOGS)
- ResponseInterceptor and SkipResponseWrapper
- Security (Helmet, Rate Limiting)
- Global validation and error handling
- Response serialization

---

## 🎯 Quick Start

1. Clone the repository
2. `npm install`
3. Copy `env.development.example` → `.env.development`
4. `npm run start:dev`
5. Test:
   - `GET /health` → `{ "status": "ok" }`
   - `GET /docs` → Swagger UI (development only)

For more details, check [SETUP.md](./docs/SETUP.md).

---

## 📝 License

UNLICENSED
