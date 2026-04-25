# API Service

## Location

- apps/server

## Stack

- Node.js (ES modules)
- Express
- MySQL (mysql2)
- Zod validation
- Vitest + Supertest for tests

## Root Commands

From repository root:

```bash
npm run dev:server
npm run start:server
npm run test:server
```

## Environment

Create apps/server/.env with at least:

- PORT
- NODE_ENV
- JWT_SECRET
- JWT_EXPIRES_IN
- MYSQL_HOST
- MYSQL_PORT
- MYSQL_USER
- MYSQL_PASSWORD
- MYSQL_DATABASE
- CORS_ORIGINS

## Notes

- API serves property data consumed by apps/client.
- Public authentication exposes login only; user creation is handled by the admin API.
- Agent dashboard data is exposed at GET /api/agent/dashboard for authenticated `agent_bancaire` users.
- Admin-created users may only use the `client`, `agent_bancaire`, or `admin` roles.
- Health routes include database connectivity checks.
- Backend now follows an MVC-style API structure with `src/models`, `src/controllers`, and `src/views`.
- In this API, `views` are JSON response presenters rather than server-rendered HTML templates.
