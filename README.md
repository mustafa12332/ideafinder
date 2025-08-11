# Ideafinder

AI-powered platform that scans social media to uncover trends, challenges, and app ideas. Equipped with a research engine, it validates concepts, analyzes markets, and generates complete business plans using semantic search, clustering, and automated summarization for actionable insights.

## Backend (API) – Fastify + TypeScript + Zod

A scalable, testable skeleton using Fastify v4, strict TypeScript, Zod schemas for validation, centralized error handling, and structured logging.

### Stack
- Fastify (HTTP server)
- TypeScript (strict)
- Zod (validation and typed schemas)
- Pino (structured logging, pretty in dev)
- Helmet + CORS (security)
- Jest + ts-jest (tests)

### Project structure
```
ideafinder/
  backend/
    src/
      index.ts                # bootstrap server
      server/app.ts           # build Fastify app
      lib/
        config.ts             # Zod-validated env config
        errors.ts             # centralized error handler
      plugins/
        logger.ts             # pino logger options
        security.ts           # helmet, cors
      routes/
        index.ts              # registers all routes under /api/v1
        health.ts             # health endpoint
      modules/
        ideas/
          schemas.ts          # Zod schemas and types
          repo.ts             # data access interface + in-memory impl
          service.ts          # business logic
          routes.ts           # HTTP handlers (thin)
    tests/
      unit/                   # unit tests (services, repos, utils)
      integration/            # HTTP route tests via app.inject
      health.test.ts
      ideas.test.ts
    package.json
    tsconfig.json
    jest.config.ts
    .gitignore
```

### Setup
1) Requirements: Node.js 18+
2) Install and run dev server
```
cd backend
npm install
npm run dev
```
Server listens on `HOST:PORT` from env (defaults `0.0.0.0:4000`).

Build and start
```
npm run build
npm start
```

### Environment variables
Zod-validated in `src/lib/config.ts`:
- `NODE_ENV`: development | test | production (default: development)
- `HOST`: interface to bind (default: 0.0.0.0)
- `PORT`: port number (default: 4000)
- `LOG_LEVEL`: fatal | error | warn | info | debug | trace | silent (default: info)

Create `.env` in `backend/` if you need overrides.

### Endpoints
Service prefixes:
- Health: `GET /health/api/v1` → `{ status, uptimeMs, timestamp }`
- Ideas: `GET /idea/api/v1` → `{ items: Idea[] }`; `POST /idea/api/v1` body `{ title: string, description: string }` → `201 Idea`

### Testing
```
npm test
npm run typecheck
```
Tests live in `backend/tests/` with `unit/` and `integration/` subfolders. Integration tests use `app.inject` without starting a real server.

### Adding a new feature module
Create `src/modules/<feature>/{schemas,repo,service,routes}.ts` and register routes in `src/routes/index.ts`. Keep route handlers thin; put business logic in `service.ts` and IO in `repo.ts`. Define request/response Zod schemas in `schemas.ts` and export types with `z.infer`.

## Frontend (React + TypeScript)

Scaffolded with Create React App (TypeScript) under `frontend/`.

### Commands
```
cd frontend
npm install   # already run during scaffold
npm start     # dev server
npm run build # production build
npm test      # unit tests
```

The frontend is currently a basic CRA skeleton ready for integration with the backend API.

