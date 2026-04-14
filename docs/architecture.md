# Architecture

## Overview

This repository uses a clean monorepo layout with clear separation between production apps, data services, tooling, and examples.

- apps/client: React frontend used by end users.
- apps/server: Express API serving authentication, admin, profile, and property endpoints with an MVC-style structure.
- services/scraper: Scrapy project that ingests raw listing data into MySQL.
- tools/listing_cleaner.py: Normalizes and deduplicates raw listings into clean datasets.
- examples/map-integration: Standalone reference app for map-focused integration experiments.

## Data Flow

1. Spiders in services/scraper crawl listing sources.
2. Scraper pipelines write raw rows into MySQL raw_properties.
3. tools/listing_cleaner.py filters and deduplicates rows into clean_listings and duplicate logs.
4. apps/server reads clean_listings and exposes /api/properties and related endpoints.
5. apps/client consumes API data for user-facing pages.

## Runtime Boundaries

- apps/client and apps/server are the production runtime surface.
- services/scraper and tools/listing_cleaner.py are batch/data workflows.
- examples/map-integration is intentionally non-production.

## Backend Pattern

- apps/server uses routes to dispatch requests into controllers.
- Controllers coordinate request handling and call models for data access and business rules.
- Views shape API responses as JSON payloads for the frontend.

## Workspace Policy

Root npm workspaces include only production Node apps under apps/*.
Examples are excluded from workspaces to keep production dependency graphs focused.
