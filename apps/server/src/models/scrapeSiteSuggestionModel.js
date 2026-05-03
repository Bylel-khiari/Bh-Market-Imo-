import { dbPool } from "../config/db.js";
import { httpError } from "../utils/httpError.js";
import {
  createScrapeSite,
  normalizeBaseDomain,
  scrapeSiteDomainExists,
} from "./scrapeSiteModel.js";

const MAX_SUGGESTIONS_LIMIT = Number(process.env.ADMIN_SCRAPE_SITE_SUGGESTIONS_MAX_LIMIT || 200);
const SUGGESTION_STATUSES = new Set(["pending", "accepted", "rejected", "ignored"]);

let ensureScrapeSiteSuggestionsTablePromise = null;
let initializeScrapeSiteSuggestionStorePromise = null;

function toBoundedLimit(limit, fallback, max) {
  return Math.min(Math.max(Number(limit) || fallback, 1), max);
}

function normalizeOptionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
}

function normalizeSuggestionStatus(value, fallback = "pending") {
  const normalized = String(value || fallback).trim().toLowerCase();
  if (!SUGGESTION_STATUSES.has(normalized)) {
    throw httpError(400, "Invalid suggestion status");
  }

  return normalized;
}

function normalizeConfidenceScore(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(numericValue)));
}

function parseEvidenceJson(value) {
  if (!value) {
    return {};
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function serializeEvidenceJson(value) {
  return JSON.stringify(parseEvidenceJson(value), null, 0);
}

function buildPendingSpiderName(suggestion) {
  const domain = normalizeBaseDomain(suggestion.domain || suggestion.base_url || suggestion.sample_url);
  const base = String(domain || suggestion.name || `site_${suggestion.id}`)
    .replace(/^www\./, "")
    .replace(/\.[a-z]{2,}$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return base || `site_${suggestion.id}`;
}

function toPublicSuggestion(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    base_url: row.base_url,
    sample_url: row.sample_url,
    evidence: parseEvidenceJson(row.evidence_json),
    confidence_score: Number(row.confidence_score) || 0,
    status: row.status,
    discovered_at: row.discovered_at,
    reviewed_at: row.reviewed_at,
    admin_note: row.admin_note,
    accepted_scrape_site_id: row.accepted_scrape_site_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function ensureScrapeSiteSuggestionsTable() {
  if (!ensureScrapeSiteSuggestionsTablePromise) {
    ensureScrapeSiteSuggestionsTablePromise = dbPool
      .query(`
        CREATE TABLE IF NOT EXISTS scrape_site_suggestions (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          name VARCHAR(160) NOT NULL,
          domain VARCHAR(190) NOT NULL,
          base_url VARCHAR(255) NOT NULL,
          sample_url VARCHAR(500) NULL,
          evidence_json LONGTEXT NULL,
          confidence_score TINYINT UNSIGNED NOT NULL DEFAULT 0,
          status VARCHAR(24) NOT NULL DEFAULT 'pending',
          discovered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          reviewed_at DATETIME NULL,
          admin_note TEXT NULL,
          accepted_scrape_site_id BIGINT UNSIGNED NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uniq_scrape_site_suggestions_domain (domain),
          KEY idx_scrape_site_suggestions_status (status)
        )
      `)
      .catch((error) => {
        ensureScrapeSiteSuggestionsTablePromise = null;
        throw error;
      });
  }

  return ensureScrapeSiteSuggestionsTablePromise;
}

export async function initializeScrapeSiteSuggestionStore() {
  if (!initializeScrapeSiteSuggestionStorePromise) {
    initializeScrapeSiteSuggestionStorePromise = ensureScrapeSiteSuggestionsTable().catch((error) => {
      initializeScrapeSiteSuggestionStorePromise = null;
      throw error;
    });
  }

  return initializeScrapeSiteSuggestionStorePromise;
}

async function findSuggestionRowById(id) {
  await ensureScrapeSiteSuggestionsTable();

  const [rows] = await dbPool.execute(
    `
    SELECT
      id,
      name,
      domain,
      base_url,
      sample_url,
      evidence_json,
      confidence_score,
      status,
      discovered_at,
      reviewed_at,
      admin_note,
      accepted_scrape_site_id,
      created_at,
      updated_at
    FROM scrape_site_suggestions
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

export async function fetchScrapeSiteSuggestions({ status = "pending", limit = 100 } = {}) {
  await ensureScrapeSiteSuggestionsTable();

  const boundedLimit = toBoundedLimit(limit, 100, MAX_SUGGESTIONS_LIMIT);
  const normalizedStatus = String(status || "pending").trim().toLowerCase();
  const params = [];
  let whereClause = "";

  if (normalizedStatus && normalizedStatus !== "all") {
    if (!SUGGESTION_STATUSES.has(normalizedStatus)) {
      throw httpError(400, "Invalid suggestion status");
    }

    whereClause = "WHERE status = ?";
    params.push(normalizedStatus);
  }

  const [rows] = await dbPool.execute(
    `
    SELECT
      id,
      name,
      domain,
      base_url,
      sample_url,
      evidence_json,
      confidence_score,
      status,
      discovered_at,
      reviewed_at,
      admin_note,
      accepted_scrape_site_id,
      created_at,
      updated_at
    FROM scrape_site_suggestions
    ${whereClause}
    ORDER BY
      CASE status
        WHEN 'pending' THEN 0
        WHEN 'ignored' THEN 1
        WHEN 'rejected' THEN 2
        ELSE 3
      END,
      confidence_score DESC,
      discovered_at DESC,
      id DESC
    LIMIT ${boundedLimit}
    `,
    params
  );

  return rows.map(toPublicSuggestion);
}

export async function upsertScrapeSiteSuggestion(payload = {}) {
  await ensureScrapeSiteSuggestionsTable();

  const baseUrl = normalizeOptionalString(payload.base_url);
  const domain = normalizeBaseDomain(payload.domain || baseUrl || payload.sample_url);
  const name = normalizeOptionalString(payload.name) || domain;

  if (!name || !baseUrl || !domain) {
    throw httpError(400, "name, domain and base_url are required");
  }

  const [result] = await dbPool.execute(
    `
    INSERT INTO scrape_site_suggestions (
      name,
      domain,
      base_url,
      sample_url,
      evidence_json,
      confidence_score,
      status,
      discovered_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      base_url = VALUES(base_url),
      sample_url = VALUES(sample_url),
      evidence_json = VALUES(evidence_json),
      confidence_score = GREATEST(confidence_score, VALUES(confidence_score)),
      status = IF(status IN ('accepted', 'rejected'), status, 'pending'),
      discovered_at = NOW()
    `,
    [
      name,
      domain,
      baseUrl,
      normalizeOptionalString(payload.sample_url),
      serializeEvidenceJson(payload.evidence || payload.evidence_json),
      normalizeConfidenceScore(payload.confidence_score),
    ]
  );

  const suggestionId = result.insertId || payload.id;
  if (suggestionId) {
    const row = await findSuggestionRowById(suggestionId);
    if (row) {
      return toPublicSuggestion(row);
    }
  }

  const [rows] = await dbPool.execute("SELECT id FROM scrape_site_suggestions WHERE domain = ? LIMIT 1", [domain]);
  const row = rows[0]?.id ? await findSuggestionRowById(rows[0].id) : null;
  return toPublicSuggestion(row);
}

export async function updateScrapeSiteSuggestion(suggestionId, payload = {}) {
  const normalizedSuggestionId = Number(suggestionId);
  if (!normalizedSuggestionId) {
    throw httpError(400, "Invalid suggestion id");
  }

  const currentRow = await findSuggestionRowById(normalizedSuggestionId);
  if (!currentRow) {
    throw httpError(404, "Suggestion not found");
  }

  const updates = [];
  const params = [];

  if ("status" in payload) {
    const status = normalizeSuggestionStatus(payload.status, currentRow.status);
    updates.push("status = ?");
    params.push(status);
    updates.push("reviewed_at = NOW()");
  }

  if ("admin_note" in payload) {
    updates.push("admin_note = ?");
    params.push(normalizeOptionalString(payload.admin_note));
  }

  if (!updates.length) {
    throw httpError(400, "At least one field is required");
  }

  await dbPool.execute(
    `UPDATE scrape_site_suggestions SET ${updates.join(", ")} WHERE id = ?`,
    [...params, normalizedSuggestionId]
  );

  return toPublicSuggestion(await findSuggestionRowById(normalizedSuggestionId));
}

export async function acceptScrapeSiteSuggestion(suggestionId, payload = {}) {
  const normalizedSuggestionId = Number(suggestionId);
  if (!normalizedSuggestionId) {
    throw httpError(400, "Invalid suggestion id");
  }

  const currentRow = await findSuggestionRowById(normalizedSuggestionId);
  if (!currentRow) {
    throw httpError(404, "Suggestion not found");
  }

  if (currentRow.status === "accepted" && currentRow.accepted_scrape_site_id) {
    return {
      suggestion: toPublicSuggestion(currentRow),
      site: null,
    };
  }

  if (await scrapeSiteDomainExists(currentRow.domain || currentRow.base_url)) {
    throw httpError(409, "Un site de scraping existe deja pour ce domaine.");
  }

  const site = await createScrapeSite({
    name: payload.name || currentRow.name,
    spider_name: payload.spider_name || buildPendingSpiderName(currentRow),
    base_url: currentRow.base_url,
    start_url: currentRow.sample_url || currentRow.base_url,
    description:
      payload.description ||
      `Suggestion detectee automatiquement. Domaine: ${currentRow.domain}.`,
    is_active: false,
    integration_status: "pending_spider",
  });

  await dbPool.execute(
    `
    UPDATE scrape_site_suggestions
    SET status = 'accepted',
        reviewed_at = NOW(),
        admin_note = COALESCE(?, admin_note),
        accepted_scrape_site_id = ?
    WHERE id = ?
    `,
    [normalizeOptionalString(payload.admin_note), site.id, normalizedSuggestionId]
  );

  return {
    suggestion: toPublicSuggestion(await findSuggestionRowById(normalizedSuggestionId)),
    site,
  };
}
