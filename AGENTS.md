# Agents

## Cursor Cloud specific instructions

### Overview

Ideafinder is a two-service Node.js/TypeScript monorepo (no database required):

| Service | Dir | Port | Dev command |
|---------|-----|------|-------------|
| Backend (Fastify API) | `backend/` | 4000 | `npm run dev` |
| Frontend (React CRA) | `frontend/` | 3000 | `npm start` |

The frontend proxies API requests to `localhost:4000` via the CRA `"proxy"` setting in `frontend/package.json`.

### Running services

- **Backend**: `cd backend && npm run dev` (uses `tsx watch` for hot reload)
- **Frontend**: `cd frontend && BROWSER=none npm start` (use `BROWSER=none` to skip opening a browser)
- Both services use in-memory storage; no database, Docker, or external services are required.

### Testing

- **Backend tests**: `cd backend && npm test` (Jest + ts-jest, 6 tests)
- **Backend typecheck**: `cd backend && npm run typecheck`
- **Frontend tests**: `cd frontend && CI=true npm test` (React Testing Library, 17/19 pass; 2 pre-existing failures in `ProjectProgressBar.test.tsx` due to duplicate DOM text queries)

### Gotchas

- Frontend `npm install` requires `--legacy-peer-deps` due to `@xstate/react@3.2.2` not supporting React 19 in its peer dependency declaration. The lockfile handles this, but a clean install needs the flag.
- The `backend/.env` file must exist (copy from `.env.example`). The app works without `OPENAI_API_KEY` or Reddit credentials — it falls back to keyword extraction.
- Frontend ESLint warnings about `useEffect` deps in `useDiscoveryWithProgress.ts` and unused import in `useProjectProgress.ts` are pre-existing and non-blocking.

### API endpoints (see README.md for full list)

- `GET /health/api/v1` — health check
- `GET /idea/api/v1` — list ideas
- `POST /idea/api/v1` — create idea `{ title, description }`
- `POST /api/discover` — start discovery job
- `GET /api/discover/:jobId` — job status
- `GET /api/discover/:jobId/stream` — SSE progress stream
