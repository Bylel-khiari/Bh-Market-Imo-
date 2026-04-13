# API Service

## Location

- apps/api

## Stack

- Node.js (ES modules)
- Express
- MySQL (mysql2)
- Zod validation
- Vitest + Supertest for tests

## Root Commands

From repository root:

```bash
npm run dev:api
npm run build:api
npm run test:api
```

## Environment

Create apps/api/.env with at least:

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

- API serves property data consumed by apps/web.
- Health routes include database connectivity checks.
- Keep business logic in src/services and thin controllers in src/controllers.
