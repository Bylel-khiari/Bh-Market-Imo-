# Scraper Service

## Location

- services/scraper

## Components

- Scrapy project config: services/scraper/scrapy.cfg
- Spider package: services/scraper/real_estate_scraper/spiders
- Pipeline: services/scraper/real_estate_scraper/pipelines.py
- Cleaner tool: tools/listing_cleaner.py

## Run Spiders

From repository root:

```bash
python -m venv services/scraper/.venv
services/scraper/.venv/Scripts/python -m pip install -r services/scraper/requirements.txt
cd services/scraper
.venv/Scripts/python -m scrapy crawl afariat
```

## Run Listing Cleaner

From repository root:

```bash
python tools/listing_cleaner.py
```

## Data Responsibilities

- Scraper writes raw rows to raw_properties.
- listing_cleaner.py filters rent and out-of-scope rows, deduplicates entries, and writes clean_listings and duplicates_log.
- clean_listings is an import/staging table only.
- syncCleanListingsToProperties.mjs validates and imports staged rows into properties.
- properties is the canonical BienImmobilier table consumed by the API and credit flow.

## Environment Variables

Scraper pipeline uses:

- SCRAPER_DB_HOST
- SCRAPER_DB_USER
- SCRAPER_DB_PASSWORD
- SCRAPER_DB_NAME
- SCRAPER_DB_BATCH_SIZE
- SCRAPER_CRAWL_PROFILE

Cleaner tool uses standard MySQL variables:

- MYSQL_HOST
- MYSQL_PORT
- MYSQL_USER
- MYSQL_PASSWORD
- MYSQL_DATABASE

## Local Python Setup

- The backend now auto-detects `services/scraper/.venv` before falling back to global `python`.
- You can still override the interpreter with `SCRAPER_PYTHON_BIN`.
- Install scraper dependencies with `services/scraper/requirements.txt`.

## Cleanup Policy Applied

- Removed unused Scrapy template scaffolding files items.py and middlewares.py.
- Kept active spiders, settings, and pipelines required for ingestion.
