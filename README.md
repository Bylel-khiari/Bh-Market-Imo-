# BH Market Imo Monorepo

This repository is now a workspace-style monorepo with one real frontend app in `client/` and one backend API in `server/`.

## Repository layout

- `client/`: main React frontend used by users.
- `server/`: Express API, auth, admin, properties, dashboards.
- `scraping/real_estate_scraper/`: Scrapy spiders that collect raw listings.
- `tunisia-dynasty-map-integration/`: standalone map integration demo/reference project.
- `agent_ia.py`: local AI/automation script.

## What runs first (startup order)

1. Setup MySQL database and tables.
2. Configure environment variables.
3. Start backend API (`server/`).
4. Start frontend app (`client/`).
5. (Optional) Run scraper to ingest/refresh data.
6. (Optional) Run map integration demo app.

## Prerequisites

- Node.js 18+
- npm 9+
- Python 3.10+ (for Scrapy pipeline)
- MySQL 8+

## Install dependencies

From repository root:

```bash
npm install --workspaces
```

For Python scraper environment (example):

```bash
python -m venv .venv
.venv\Scripts\activate
pip install scrapy mysql-connector-python
```

## Run services

From repository root:

```bash
npm run dev:server
```

In another terminal:

```bash
npm run dev:client
```

Optional map demo:

```bash
npm run dev:map
```

Optional scraper run (from `scraping/real_estate_scraper`):

```bash
scrapy crawl afariat
```

## Environment variables

### Server (`server/.env`)

Required/important:

- `PORT=5000`
- `NODE_ENV=development`
- `JWT_SECRET=change_me`
- `JWT_EXPIRES_IN=7d`
- `MYSQL_HOST=127.0.0.1`
- `MYSQL_PORT=3306`
- `MYSQL_USER=root`
- `MYSQL_PASSWORD=your_password`
- `MYSQL_DATABASE=database`
- `CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`
- `RATE_LIMIT_WINDOW_MS=900000`
- `RATE_LIMIT_MAX=250`
- `AUTH_RATE_LIMIT_WINDOW_MS=600000`
- `AUTH_RATE_LIMIT_MAX=30`
- `PROPERTIES_MAX_LIMIT=1000`

Security rules enforced by code:

- In production, `JWT_SECRET` is mandatory.
- In production, `MYSQL_PASSWORD` cannot be blank.
- CORS is restricted by `CORS_ORIGINS` (mandatory in production).

### Client (`client/.env`)

- `REACT_APP_API_URL=http://localhost:5000`

### Scraper

The current Scrapy pipeline uses hardcoded DB credentials in `scraping/real_estate_scraper/real_estate_scraper/pipelines.py`. Align these values with your MySQL setup before running spiders.

## Database schema/setup

Use MySQL and create the database first:

```sql
CREATE DATABASE IF NOT EXISTS `database`;
USE `database`;
```

Minimum tables required by current backend + scraping flow:

```sql
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('client', 'agent_bancaire', 'responsable_decisionnel', 'admin') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS client_profiles (
  user_id BIGINT PRIMARY KEY,
  address VARCHAR(255),
  phone VARCHAR(40),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_profiles (
  user_id BIGINT PRIMARY KEY,
  matricule VARCHAR(80),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS decision_profiles (
  user_id BIGINT PRIMARY KEY,
  department VARCHAR(120),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_profiles (
  user_id BIGINT PRIMARY KEY,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS raw_properties (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title TEXT,
  price TEXT,
  location TEXT,
  description LONGTEXT,
  image TEXT,
  url TEXT,
  source VARCHAR(80),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clean_listings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title TEXT,
  price_raw TEXT,
  price_value DECIMAL(14,2),
  location_raw TEXT,
  city VARCHAR(120),
  country VARCHAR(120),
  image TEXT,
  description LONGTEXT,
  source VARCHAR(80),
  url TEXT,
  scraped_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS duplicates_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  raw_property_id BIGINT,
  duplicate_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## How components relate

- Scrapy spiders write raw rows into `raw_properties`.
- Cleaning pipeline/process writes normalized rows into `clean_listings`.
- Backend `GET /api/properties` serves data from `clean_listings`.
- Frontend `client/` reads this API for listings, properties page, and home carousel.
- `tunisia-dynasty-map-integration/` is a separate integration example that also consumes `/api/properties`.

## Testing

Run backend tests with coverage:

```bash
npm run test:server
```

Current backend tests cover:

- route availability
- CORS restrictions
- request validation failures
- auth guard responses
- centralized 404 behavior

## Notes

- Do not commit `node_modules` folders.
- Keep lockfiles (`package-lock.json`) in root and workspaces.
- Root package acts as orchestrator/workspace manager, not as a second frontend app.
