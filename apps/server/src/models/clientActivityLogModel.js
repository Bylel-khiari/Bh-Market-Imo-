import { dbPool } from "../config/db.js";

export const CLIENT_ACTIVITY_EVENT_TYPES = Object.freeze({
  CLIENT_LOGIN_SUCCESS: "client_login_success",
  CREDIT_SIMULATION_CALCULATE: "credit_simulation_calculate",
  CREDIT_REQUEST_START: "credit_request_start",
  CREDIT_APPLICATION_FORM_OPEN: "credit_application_form_open",
  CREDIT_APPLICATION_SUBMIT: "credit_application_submit",
  MAP_REGION_SELECT: "map_region_select",
});

const EVENT_LABELS = {
  [CLIENT_ACTIVITY_EVENT_TYPES.CLIENT_LOGIN_SUCCESS]: "Connexion client",
  [CLIENT_ACTIVITY_EVENT_TYPES.CREDIT_SIMULATION_CALCULATE]: "Calcul simulation credit",
  [CLIENT_ACTIVITY_EVENT_TYPES.CREDIT_REQUEST_START]: "Demande credit demarree",
  [CLIENT_ACTIVITY_EVENT_TYPES.CREDIT_APPLICATION_FORM_OPEN]: "Formulaire demande ouvert",
  [CLIENT_ACTIVITY_EVENT_TYPES.CREDIT_APPLICATION_SUBMIT]: "Demande credit deposee",
  [CLIENT_ACTIVITY_EVENT_TYPES.MAP_REGION_SELECT]: "Region carte selectionnee",
};

const DEFAULT_SUMMARY = {
  total_events: 0,
  active_clients: 0,
  client_logins: 0,
  simulation_calculations: 0,
  credit_request_starts: 0,
  credit_application_forms_opened: 0,
  credit_application_submits: 0,
  map_region_selects: 0,
  request_start_rate: 0,
  submit_conversion_rate: 0,
};

function toCount(value) {
  return Number(value || 0);
}

function normalizeOptionalString(value, maxLength = 255) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function normalizeClientUserId(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function getRequestIp(req) {
  const forwardedFor = String(req?.headers?.["x-forwarded-for"] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return forwardedFor[0] || req?.ip || req?.socket?.remoteAddress || null;
}

function safeStringifyMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  try {
    return JSON.stringify(metadata).slice(0, 10000);
  } catch {
    return null;
  }
}

function formatMonthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getRecentMonthKeys(monthCount = 12) {
  const cursor = new Date();
  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();
  const keys = [];

  for (let index = monthCount - 1; index >= 0; index -= 1) {
    keys.push(formatMonthKey(new Date(Date.UTC(year, month - index, 1))));
  }

  return keys;
}

function buildMonthlyEvents(monthKeys, rows = []) {
  const eventMap = rows.reduce((acc, row) => {
    if (row?.month) {
      acc.set(row.month, toCount(row.total));
    }

    return acc;
  }, new Map());

  return monthKeys.map((month) => ({
    month,
    events: eventMap.get(month) || 0,
  }));
}

export function getClientActivityEventLabel(eventType) {
  return EVENT_LABELS[eventType] || "Activite client";
}

export async function recordClientActivityLog(req, {
  clientUserId = req?.user?.sub,
  eventType,
  eventLabel = null,
  page = null,
  targetType = null,
  targetId = null,
  metadata = null,
} = {}) {
  const normalizedClientUserId = normalizeClientUserId(clientUserId);
  const normalizedEventType = normalizeOptionalString(eventType, 80);

  if (!normalizedClientUserId || !normalizedEventType) {
    return null;
  }

  try {
    const [result] = await dbPool.execute(
      `
      INSERT INTO client_activity_logs (
        client_user_id,
        event_type,
        event_label,
        page,
        target_type,
        target_id,
        ip_address,
        user_agent,
        metadata_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        normalizedClientUserId,
        normalizedEventType,
        normalizeOptionalString(eventLabel || getClientActivityEventLabel(normalizedEventType), 120),
        normalizeOptionalString(page, 255),
        normalizeOptionalString(targetType, 80),
        normalizeOptionalString(targetId, 120),
        normalizeOptionalString(getRequestIp(req), 64),
        normalizeOptionalString(req?.headers?.["user-agent"], 255),
        safeStringifyMetadata(metadata),
      ]
    );

    return {
      id: result?.insertId || null,
      client_user_id: normalizedClientUserId,
      event_type: normalizedEventType,
    };
  } catch (error) {
    console.error("Failed to record client activity log:", error);
    return null;
  }
}

export async function fetchClientActivityDashboard({ monthCount = 12, limit = 8 } = {}) {
  const monthKeys = getRecentMonthKeys(monthCount);
  const fromMonthStart = `${monthKeys[0]}-01`;
  const normalizedLimit = Math.min(Math.max(Number(limit) || 8, 1), 50);

  const [
    [[summaryRow]],
    [eventDistributionRows],
    [monthlyRows],
    [topRegionRows],
    [topClientRows],
    [latestRows],
  ] = await Promise.all([
    dbPool.query(`
      SELECT
        COUNT(*) AS total_events,
        COUNT(DISTINCT client_user_id) AS active_clients,
        SUM(CASE WHEN event_type = 'client_login_success' THEN 1 ELSE 0 END) AS client_logins,
        SUM(CASE WHEN event_type = 'credit_simulation_calculate' THEN 1 ELSE 0 END) AS simulation_calculations,
        SUM(CASE WHEN event_type = 'credit_request_start' THEN 1 ELSE 0 END) AS credit_request_starts,
        SUM(CASE WHEN event_type = 'credit_application_form_open' THEN 1 ELSE 0 END) AS credit_application_forms_opened,
        SUM(CASE WHEN event_type = 'credit_application_submit' THEN 1 ELSE 0 END) AS credit_application_submits,
        SUM(CASE WHEN event_type = 'map_region_select' THEN 1 ELSE 0 END) AS map_region_selects
      FROM client_activity_logs
    `),
    dbPool.query(`
      SELECT
        event_type,
        COALESCE(NULLIF(event_label, ''), event_type) AS label,
        COUNT(*) AS total
      FROM client_activity_logs
      GROUP BY event_type, COALESCE(NULLIF(event_label, ''), event_type)
      ORDER BY total DESC, label ASC
    `),
    dbPool.query(
      `
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS total
      FROM client_activity_logs
      WHERE created_at >= ?
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
      `,
      [fromMonthStart]
    ),
    dbPool.query(
      `
      SELECT
        COALESCE(
          NULLIF(JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.region_name')), ''),
          NULLIF(JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.governorate_name')), ''),
          NULLIF(target_id, ''),
          'Region inconnue'
        ) AS region,
        COALESCE(
          NULLIF(JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.normalized_region')), ''),
          NULLIF(JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.normalized_governorate')), ''),
          NULLIF(target_id, ''),
          'unknown'
        ) AS key_name,
        COUNT(*) AS total,
        COUNT(DISTINCT client_user_id) AS active_clients,
        MAX(created_at) AS last_selected_at
      FROM client_activity_logs
      WHERE event_type = 'map_region_select'
      GROUP BY region, key_name
      ORDER BY total DESC, active_clients DESC, region ASC
      LIMIT ${normalizedLimit}
      `
    ),
    dbPool.query(
      `
      SELECT
        l.client_user_id AS id,
        u.name,
        u.email,
        COUNT(*) AS total_events,
        SUM(CASE WHEN l.event_type = 'client_login_success' THEN 1 ELSE 0 END) AS client_logins,
        SUM(CASE WHEN l.event_type = 'credit_simulation_calculate' THEN 1 ELSE 0 END) AS simulation_calculations,
        SUM(CASE WHEN l.event_type = 'credit_request_start' THEN 1 ELSE 0 END) AS credit_request_starts,
        SUM(CASE WHEN l.event_type = 'credit_application_submit' THEN 1 ELSE 0 END) AS credit_application_submits,
        MAX(l.created_at) AS last_event_at
      FROM client_activity_logs l
      LEFT JOIN users u ON u.id = l.client_user_id
      GROUP BY l.client_user_id, u.name, u.email
      ORDER BY total_events DESC, last_event_at DESC
      LIMIT ${normalizedLimit}
      `
    ),
    dbPool.query(
      `
      SELECT
        l.id,
        l.client_user_id,
        u.name AS client_name,
        u.email AS client_email,
        l.event_type,
        COALESCE(NULLIF(l.event_label, ''), l.event_type) AS event_label,
        l.page,
        l.target_type,
        l.target_id,
        l.created_at
      FROM client_activity_logs l
      LEFT JOIN users u ON u.id = l.client_user_id
      ORDER BY l.created_at DESC, l.id DESC
      LIMIT ${normalizedLimit}
      `
    ),
  ]);

  const summary = {
    ...DEFAULT_SUMMARY,
    total_events: toCount(summaryRow?.total_events),
    active_clients: toCount(summaryRow?.active_clients),
    client_logins: toCount(summaryRow?.client_logins),
    simulation_calculations: toCount(summaryRow?.simulation_calculations),
    credit_request_starts: toCount(summaryRow?.credit_request_starts),
    credit_application_forms_opened: toCount(summaryRow?.credit_application_forms_opened),
    credit_application_submits: toCount(summaryRow?.credit_application_submits),
    map_region_selects: toCount(summaryRow?.map_region_selects),
  };

  summary.request_start_rate =
    summary.simulation_calculations > 0
      ? Math.round((summary.credit_request_starts / summary.simulation_calculations) * 100)
      : 0;
  summary.submit_conversion_rate =
    summary.credit_request_starts > 0
      ? Math.round((summary.credit_application_submits / summary.credit_request_starts) * 100)
      : 0;

  return {
    summary,
    event_distribution: eventDistributionRows.map((row) => ({
      key: row.event_type,
      label: row.label || getClientActivityEventLabel(row.event_type),
      value: toCount(row.total),
    })),
    monthly_events: buildMonthlyEvents(monthKeys, monthlyRows),
    top_regions: topRegionRows.map((row) => ({
      key: row.key_name,
      region: row.region,
      total: toCount(row.total),
      active_clients: toCount(row.active_clients),
      last_selected_at: row.last_selected_at,
    })),
    top_clients: topClientRows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      total_events: toCount(row.total_events),
      client_logins: toCount(row.client_logins),
      simulation_calculations: toCount(row.simulation_calculations),
      credit_request_starts: toCount(row.credit_request_starts),
      credit_application_submits: toCount(row.credit_application_submits),
      last_event_at: row.last_event_at,
    })),
    latest_events: latestRows.map((row) => ({
      id: row.id,
      client_user_id: row.client_user_id,
      client_name: row.client_name,
      client_email: row.client_email,
      event_type: row.event_type,
      event_label: row.event_label || getClientActivityEventLabel(row.event_type),
      page: row.page,
      target_type: row.target_type,
      target_id: row.target_id,
      created_at: row.created_at,
    })),
  };
}
