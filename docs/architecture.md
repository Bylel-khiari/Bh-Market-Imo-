# Architecture

## Overview

This repository uses a clean monorepo layout with clear separation between production apps, data services, tooling, and examples.

- apps/web: React frontend used by end users.
- apps/api: Express API serving authentication, admin, profile, and property endpoints.
- services/scraper: Scrapy project that ingests raw listing data into MySQL.
- tools/listing-cleaner.py: Normalizes and deduplicates raw listings into clean datasets.
- examples/map-integration: Standalone reference app for map-focused integration experiments.

## Data Flow

1. Spiders in services/scraper crawl listing sources.
2. Scraper pipelines write raw rows into MySQL raw_properties.
3. tools/listing-cleaner.py filters and deduplicates rows into clean_listings and duplicate logs.
4. apps/api reads clean_listings and exposes /api/properties and related endpoints.
5. apps/web consumes API data for user-facing pages.

## Runtime Boundaries

- apps/web and apps/api are the production runtime surface.
- services/scraper and tools/listing-cleaner.py are batch/data workflows.
- examples/map-integration is intentionally non-production.

## Workspace Policy

Root npm workspaces include only production Node apps under apps/*.
Examples are excluded from workspaces to keep production dependency graphs focused.
