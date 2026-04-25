# Architecture

## Overview

This repository uses a clean monorepo layout with clear separation between production apps, data services, tooling, and examples.

- apps/client: React frontend used by end users.
- apps/server: Express API serving authentication, admin, agent, client, credit, profile, and property endpoints with an MVC-style structure.
- services/scraper: Scrapy project that ingests raw listing data into MySQL.
- tools/listing_cleaner.py: Normalizes and deduplicates raw listings into clean datasets.
- examples/map-integration: Standalone reference app for map-focused integration experiments.

## Data Flow

1. Spiders in services/scraper crawl listing sources.
2. Scraper pipelines write raw rows into MySQL raw_properties.
3. tools/listing_cleaner.py filters and deduplicates rows into clean_listings and duplicate logs.
4. apps/server/scripts/syncCleanListingsToProperties.mjs performs the validated import from clean_listings into properties.
5. properties is the canonical BienImmobilier table used by the API, credit dossiers, favorites, and reports.
6. apps/client consumes API data for user-facing pages.

## Roles And Use Cases

- Visitor: consult and search properties, view property details, and simulate real-estate credit.
- Client: submit a credit dossier, upload declared document names, follow request status, update profile, and use the chatbot.
- Agent bancaire: consult the agent dashboard, verify submitted documents, process credit dossiers, and consult client/request data.
- Admin: manage users, platform settings, properties, technical scrape sources, and chatbot administration.

Only `client`, `agent_bancaire`, and `admin` are valid application roles. Public account creation is disabled; users are created by an admin.

## Runtime Boundaries

- apps/client and apps/server are the production runtime surface.
- services/scraper and tools/listing_cleaner.py are batch/data workflows.
- examples/map-integration is intentionally non-production.

## Backend Pattern

- apps/server uses routes to dispatch requests into controllers.
- Controllers coordinate request handling and call models for data access and business rules.
- Views shape API responses as JSON payloads for the frontend.
- Store bootstrap now happens during server startup instead of inside request-path model methods.

## Workspace Policy

Root npm workspaces include only production Node apps under apps/*.
Examples are excluded from workspaces to keep production dependency graphs focused.
