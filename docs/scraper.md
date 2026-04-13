# Scraper Service

## Location

- services/scraper

## Components

- Scrapy project config: services/scraper/scrapy.cfg
- Spider package: services/scraper/real_estate_scraper/spiders
- Pipeline: services/scraper/real_estate_scraper/pipelines.py
- Cleaner tool: tools/listing-cleaner.py

## Run Spiders

From repository root:

```bash
cd services/scraper
scrapy crawl afariat
```

## Run Listing Cleaner

From repository root:

```bash
python tools/listing-cleaner.py
```

## Data Responsibilities

- Scraper writes raw rows to raw_properties.
- listing-cleaner.py filters rent and out-of-scope rows, deduplicates entries, and writes clean_listings and duplicates_log.

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

## Cleanup Policy Applied

- Removed unused Scrapy template scaffolding files items.py and middlewares.py.
- Kept active spiders, settings, and pipelines required for ingestion.
