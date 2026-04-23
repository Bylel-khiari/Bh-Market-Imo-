import { dbPool } from "../config/db.js";
import { httpError } from "../utils/httpError.js";

export const MIN_SCRAPER_INTERVAL_DAYS = 1;
export const MAX_SCRAPER_INTERVAL_DAYS = Number(process.env.SCRAPER_INTERVAL_MAX_DAYS || 365);

const DEFAULT_SCRAPER_INTERVAL_DAYS = normalizeIntervalDays(
  Number(process.env.SCRAPER_INTERVAL_DEFAULT_DAYS || 7),
  "SCRAPER_INTERVAL_DEFAULT_DAYS"
);
const SCRAPER_CONTROL_ID = 1;

let ensureScraperControlTablePromise = null;
let initializeScraperControlStorePromise = null;

function normalizeIntervalDays(value, fieldName = "interval_days") {
  if (!Number.isInteger(Number(value))) {
    throw httpError(400, `Invalid ${fieldName}`);
  }

  const intervalDays = Number(value);
  if (
    intervalDays < MIN_SCRAPER_INTERVAL_DAYS ||
    intervalDays > MAX_SCRAPER_INTERVAL_DAYS
  ) {
    throw httpError(
      400,
      `${fieldName} must be between ${MIN_SCRAPER_INTERVAL_DAYS} and ${MAX_SCRAPER_INTERVAL_DAYS}`
    );
  }

  return intervalDays;
}

function normalizeOptionalString(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeOptionalDateTime(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw httpError(400, `Invalid ${fieldName}`);
  }

  return parsed.toISOString().slice(0, 19).replace("T", " ");
}

function toPublicScraperControl(row) {
  if (!row) return null;

  return {
    id: row.id,
    is_enabled: Boolean(row.is_enabled),
    interval_days: Number(row.interval_days) || DEFAULT_SCRAPER_INTERVAL_DAYS,
    status: row.status || "idle",
    current_step: row.current_step,
    current_spider_name: row.current_spider_name,
    last_started_at: row.last_started_at,
    last_finished_at: row.last_finished_at,
    last_success_at: row.last_success_at,
    next_run_at: row.next_run_at,
    last_error: row.last_error,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function ensureScraperControlTable() {
  if (!ensureScraperControlTablePromise) {
    ensureScraperControlTablePromise = (async () => {
      await dbPool.query(`
        CREATE TABLE IF NOT EXISTS scraper_control (
          id TINYINT UNSIGNED NOT NULL,
          is_enabled TINYINT(1) NOT NULL DEFAULT 0,
          interval_days SMALLINT UNSIGNED NOT NULL DEFAULT ${DEFAULT_SCRAPER_INTERVAL_DAYS},
          status VARCHAR(24) NOT NULL DEFAULT 'idle',
          current_step VARCHAR(255) NULL,
          current_spider_name VARCHAR(120) NULL,
          last_started_at DATETIME NULL,
          last_finished_at DATETIME NULL,
          last_success_at DATETIME NULL,
          next_run_at DATETIME NULL,
          last_error TEXT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        )
      `);

      await dbPool.execute(
        `
        INSERT INTO scraper_control (id, is_enabled, interval_days, status)
        VALUES (?, 0, ?, 'idle')
        ON DUPLICATE KEY UPDATE id = id
        `,
        [SCRAPER_CONTROL_ID, DEFAULT_SCRAPER_INTERVAL_DAYS]
      );
    })().catch((error) => {
      ensureScraperControlTablePromise = null;
      throw error;
    });
  }

  return ensureScraperControlTablePromise;
}

export async function initializeScraperControlStore() {
  if (!initializeScraperControlStorePromise) {
    initializeScraperControlStorePromise = ensureScraperControlTable().catch((error) => {
      initializeScraperControlStorePromise = null;
      throw error;
    });
  }

  return initializeScraperControlStorePromise;
}

async function findScraperControlRow() {
  await ensureScraperControlTable();

  const [rows] = await dbPool.execute(
    `
    SELECT
      id,
      is_enabled,
      interval_days,
      status,
      current_step,
      current_spider_name,
      last_started_at,
      last_finished_at,
      last_success_at,
      next_run_at,
      last_error,
      created_at,
      updated_at
    FROM scraper_control
    WHERE id = ?
    LIMIT 1
    `,
    [SCRAPER_CONTROL_ID]
  );

  return rows[0] || null;
}

export async function fetchScraperControl() {
  const row = await findScraperControlRow();
  return toPublicScraperControl(row);
}

export async function patchScraperControl(payload = {}) {
  await ensureScraperControlTable();

  const updates = [];
  const params = [];

  if ("is_enabled" in payload) {
    updates.push("is_enabled = ?");
    params.push(payload.is_enabled ? 1 : 0);
  }

  if ("interval_days" in payload) {
    updates.push("interval_days = ?");
    params.push(normalizeIntervalDays(payload.interval_days));
  }

  if ("status" in payload) {
    const status = normalizeOptionalString(payload.status);
    if (!status) {
      throw httpError(400, "status is required");
    }

    updates.push("status = ?");
    params.push(status);
  }

  if ("current_step" in payload) {
    updates.push("current_step = ?");
    params.push(normalizeOptionalString(payload.current_step));
  }

  if ("current_spider_name" in payload) {
    updates.push("current_spider_name = ?");
    params.push(normalizeOptionalString(payload.current_spider_name));
  }

  if ("last_started_at" in payload) {
    updates.push("last_started_at = ?");
    params.push(normalizeOptionalDateTime(payload.last_started_at, "last_started_at"));
  }

  if ("last_finished_at" in payload) {
    updates.push("last_finished_at = ?");
    params.push(normalizeOptionalDateTime(payload.last_finished_at, "last_finished_at"));
  }

  if ("last_success_at" in payload) {
    updates.push("last_success_at = ?");
    params.push(normalizeOptionalDateTime(payload.last_success_at, "last_success_at"));
  }

  if ("next_run_at" in payload) {
    updates.push("next_run_at = ?");
    params.push(normalizeOptionalDateTime(payload.next_run_at, "next_run_at"));
  }

  if ("last_error" in payload) {
    updates.push("last_error = ?");
    params.push(normalizeOptionalString(payload.last_error));
  }

  if (!updates.length) {
    return fetchScraperControl();
  }

  await dbPool.execute(
    `UPDATE scraper_control SET ${updates.join(", ")} WHERE id = ?`,
    [...params, SCRAPER_CONTROL_ID]
  );

  return fetchScraperControl();
}

export async function updateScraperControlSettings(payload = {}) {
  const updates = {};

  if ("interval_days" in payload) {
    updates.interval_days = payload.interval_days;
  }

  if ("is_enabled" in payload) {
    updates.is_enabled = payload.is_enabled;
  }

  if (!Object.keys(updates).length) {
    throw httpError(400, "At least one field is required");
  }

  return patchScraperControl(updates);
}
