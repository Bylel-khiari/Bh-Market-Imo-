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
- SITE_DISCOVERY_SEARCH_PROVIDER
- SITE_DISCOVERY_API_KEY
- SITE_DISCOVERY_INTERVAL_DAYS
- AUTH_COOKIE_NAME
- AUTH_COOKIE_MAX_AGE_MS

## Notes

- API serves property data consumed by apps/client.
- Public authentication exposes login/logout; login sets an httpOnly access-token cookie while the client keeps only a non-secret session marker in localStorage.
- User creation is handled by the admin API.
- Agent dashboard data is exposed at GET /api/agent/dashboard for authenticated `agent_bancaire` users.
- Admin-created users may only use the `client`, `agent_bancaire`, or `admin` roles.
- Admin property listing supports server-side pagination and filtering:
  - GET /api/admin/properties?page=1&limit=50&status=active&search=tunis
- Admin scraper endpoints include site suggestions:
  - GET /api/admin/scrape-site-suggestions?status=pending
  - POST /api/admin/scrape-site-discovery/start
  - PATCH /api/admin/scrape-site-suggestions/:id
  - POST /api/admin/scrape-site-suggestions/:id/accept
- Accepted scrape-site suggestions are created inactive with `integration_status='pending_spider'`.
- Mutating admin endpoints write audit entries to `admin_audit_logs`.
- Scraper status includes recent run history and per-spider metrics from `scraper_run_history` and `scraper_spider_metrics`.
- Existing database upgrades are handled by versioned startup migrations in `src/migrations/migrationRunner.js`, tracked in `schema_migrations`.
- Health routes include database connectivity checks.
- Backend now follows an MVC-style API structure with `src/models`, `src/controllers`, and `src/views`.
- In this API, `views` are JSON response presenters rather than server-rendered HTML templates.
