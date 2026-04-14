# BH Market Imo

Professional monorepo for BH Market Imo with production apps, data services, and clearly separated reference code.

## Repository Structure

```text
BH-Market-Imo/
  apps/
    client/               # React frontend (production)
    server/               # Express backend/API (production)
  services/
    scraper/              # Scrapy crawler service
  tools/
    listing_cleaner.py    # Listing normalization/dedup tool
  examples/
    map-integration/      # Standalone map integration reference
  docs/
    architecture.md
    api.md
    scraper.md
  .gitignore
  package.json
  package-lock.json
  README.md
```

## Prerequisites

- Node.js 18+
- npm 9+
- Python 3.10+
- MySQL 8+

## Install

From repository root:

```bash
npm install --workspaces
```

For scraper/tool Python environment:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install scrapy mysql-connector-python rapidfuzz
```

## Run Production Apps

From repository root:

```bash
npm run dev:server
```

In another terminal:

```bash
npm run dev:client
```

Build:

```bash
npm run build:client
```

Run API in production mode:

```bash
npm run start:server
```

Tests:

```bash
npm run test:server
npm run test:client
```

## Run Services and Tools

Run a spider:

```bash
cd services/scraper
scrapy crawl afariat
```

Run listing cleaner:

```bash
python tools/listing_cleaner.py
```

## Optional Example Project

The map integration project is intentionally isolated under `examples/` and not part of production workspaces.

```bash
npm --prefix examples/map-integration install
npm run dev:map-example
```

## Environment Files

- `apps/server/.env`
- `apps/client/.env`

Important API variables include:

- `PORT`
- `JWT_SECRET`
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`
- `CORS_ORIGINS`

Scraper/tool DB settings can be controlled with:

- `SCRAPER_DB_HOST`
- `SCRAPER_DB_USER`
- `SCRAPER_DB_PASSWORD`
- `SCRAPER_DB_NAME`
- `MYSQL_HOST`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`

## Documentation

- `docs/architecture.md` for repository and service boundaries.
- `docs/api.md` for API service details and commands.
- `docs/scraper.md` for crawler and listing-cleaner details.
