import { dbPool } from "../config/db.js";

const MAX_RUN_HISTORY_LIMIT = Number(process.env.SCRAPER_RUN_HISTORY_MAX_LIMIT || 25);
const MAX_SPIDER_METRICS_LIMIT = Number(process.env.SCRAPER_SPIDER_METRICS_MAX_LIMIT || 50);

function toBoundedLimit(limit, fallback, max) {
  return Math.min(Math.max(Number(limit) || fallback, 1), max);
}

function normalizeDateTime(value) {
  const parsed = value instanceof Date ? value : new Date(value || Date.now());
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 19).replace("T", " ");
  }

  return parsed.toISOString().slice(0, 19).replace("T", " ");
}

function durationSeconds(startedAt, finishedAt) {
  const start = new Date(startedAt);
  const finish = new Date(finishedAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(finish.getTime())) {
    return null;
  }

  return Math.max(0, Math.round((finish.getTime() - start.getTime()) / 1000));
}

function toPublicRun(row) {
  if (!row) return null;

  return {
    id: row.id,
    run_type: row.run_type,
    trigger_source: row.trigger_source,
    status: row.status,
    total_steps: Number(row.total_steps) || 0,
    started_at: row.started_at,
    finished_at: row.finished_at,
    duration_seconds: row.duration_seconds === null ? null : Number(row.duration_seconds),
    error_message: row.error_message,
  };
}

function toPublicMetric(row) {
  if (!row) return null;

  return {
    id: row.id,
    run_id: row.run_id,
    scrape_site_id: row.scrape_site_id,
    spider_name: row.spider_name,
    site_name: row.site_name,
    status: row.status,
    started_at: row.started_at,
    finished_at: row.finished_at,
    duration_seconds: row.duration_seconds === null ? null : Number(row.duration_seconds),
    error_message: row.error_message,
  };
}

export async function createScraperRun({ runType, trigger = "manual", totalSteps = 0, startedAt = new Date() } = {}) {
  const normalizedStartedAt = normalizeDateTime(startedAt);
  const [result] = await dbPool.execute(
    `
    INSERT INTO scraper_run_history (
      run_type,
      trigger_source,
      status,
      total_steps,
      started_at
    )
    VALUES (?, ?, 'running', ?, ?)
    `,
    [runType || "scraper_cycle", trigger || "manual", Math.max(0, Number(totalSteps) || 0), normalizedStartedAt]
  );

  return result.insertId;
}

export async function finishScraperRun(runId, { status, errorMessage = null, finishedAt = new Date() } = {}) {
  if (!runId) {
    return;
  }

  const normalizedFinishedAt = normalizeDateTime(finishedAt);
  const [[row]] = await dbPool.execute(
    "SELECT started_at FROM scraper_run_history WHERE id = ? LIMIT 1",
    [runId]
  );

  await dbPool.execute(
    `
    UPDATE scraper_run_history
    SET status = ?,
        finished_at = ?,
        duration_seconds = ?,
        error_message = ?
    WHERE id = ?
    `,
    [
      status || "finished",
      normalizedFinishedAt,
      durationSeconds(row?.started_at, normalizedFinishedAt),
      errorMessage || null,
      runId,
    ]
  );
}

export async function recordScraperSpiderMetric({
  runId = null,
  scrapeSiteId = null,
  spiderName,
  siteName = null,
  status,
  startedAt,
  finishedAt = new Date(),
  errorMessage = null,
} = {}) {
  const normalizedStartedAt = normalizeDateTime(startedAt);
  const normalizedFinishedAt = normalizeDateTime(finishedAt);

  await dbPool.execute(
    `
    INSERT INTO scraper_spider_metrics (
      run_id,
      scrape_site_id,
      spider_name,
      site_name,
      status,
      started_at,
      finished_at,
      duration_seconds,
      error_message
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      runId || null,
      scrapeSiteId || null,
      spiderName || "unknown",
      siteName || null,
      status || "finished",
      normalizedStartedAt,
      normalizedFinishedAt,
      durationSeconds(normalizedStartedAt, normalizedFinishedAt),
      errorMessage || null,
    ]
  );
}

export async function fetchScraperRunHistory({ limit = 10 } = {}) {
  const boundedLimit = toBoundedLimit(limit, 10, MAX_RUN_HISTORY_LIMIT);
  const [rows] = await dbPool.query(
    `
    SELECT id, run_type, trigger_source, status, total_steps, started_at, finished_at, duration_seconds, error_message
    FROM scraper_run_history
    ORDER BY started_at DESC, id DESC
    LIMIT ${boundedLimit}
    `
  );

  return rows.map(toPublicRun);
}

export async function fetchScraperSpiderMetrics({ limit = 20 } = {}) {
  const boundedLimit = toBoundedLimit(limit, 20, MAX_SPIDER_METRICS_LIMIT);
  const [rows] = await dbPool.query(
    `
    SELECT id, run_id, scrape_site_id, spider_name, site_name, status, started_at, finished_at, duration_seconds, error_message
    FROM scraper_spider_metrics
    ORDER BY started_at DESC, id DESC
    LIMIT ${boundedLimit}
    `
  );

  return rows.map(toPublicMetric);
}
