import { dbPool } from "../config/db.js";
import { httpError } from "../utils/httpError.js";

const MAX_ADMIN_REPORTS_LIMIT = Number(process.env.ADMIN_PROPERTY_REPORTS_MAX_LIMIT || 500);

const REPORT_SELECT_COLUMNS = `
  pr.id,
  pr.property_id,
  pr.reporter_user_id,
  pr.category,
  pr.message,
  pr.status,
  pr.admin_note,
  pr.reviewed_at,
  pr.reviewed_by_admin_user_id,
  pr.created_at,
  pr.updated_at,
  COALESCE(p.manual_title, p.title) AS property_title,
  COALESCE(p.manual_location_raw, p.location_raw, p.city) AS property_location,
  COALESCE(p.manual_url, p.url) AS property_url,
  reporter.name AS reporter_name,
  reporter.email AS reporter_email,
  reviewer.name AS reviewed_by_admin_name
`;

let ensurePropertyReportsTablePromise = null;
let initializePropertyReportStorePromise = null;

function toBoundedLimit(limit, fallback, max) {
  return Math.min(Math.max(Number(limit) || fallback, 1), max);
}

function normalizeOptionalString(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
}

function toPublicPropertyReport(row) {
  if (!row) return null;

  return {
    id: row.id,
    property_id: row.property_id,
    property_title: row.property_title,
    property_location: row.property_location,
    property_url: row.property_url,
    reporter_user_id: row.reporter_user_id,
    reporter_name: row.reporter_name,
    reporter_email: row.reporter_email,
    category: row.category,
    message: row.message,
    status: row.status,
    admin_note: row.admin_note,
    reviewed_at: row.reviewed_at,
    reviewed_by_admin_user_id: row.reviewed_by_admin_user_id,
    reviewed_by_admin_name: row.reviewed_by_admin_name,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function ensurePropertyReportsTable() {
  if (!ensurePropertyReportsTablePromise) {
    ensurePropertyReportsTablePromise = dbPool
      .query(`
        CREATE TABLE IF NOT EXISTS property_reports (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          property_id BIGINT UNSIGNED NOT NULL,
          reporter_user_id BIGINT NOT NULL,
          category VARCHAR(64) NOT NULL,
          message TEXT NOT NULL,
          status VARCHAR(24) NOT NULL DEFAULT 'unread',
          admin_note TEXT NULL,
          reviewed_at DATETIME NULL,
          reviewed_by_admin_user_id BIGINT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_property_reports_property_id (property_id),
          KEY idx_property_reports_reporter_user_id (reporter_user_id),
          KEY idx_property_reports_status_created_at (status, created_at),
          KEY idx_property_reports_created_at (created_at)
        )
      `)
      .catch((error) => {
        ensurePropertyReportsTablePromise = null;
        throw error;
      });
  }

  return ensurePropertyReportsTablePromise;
}

export async function initializePropertyReportStore() {
  if (!initializePropertyReportStorePromise) {
    initializePropertyReportStorePromise = ensurePropertyReportsTable().catch((error) => {
      initializePropertyReportStorePromise = null;
      throw error;
    });
  }

  return initializePropertyReportStorePromise;
}

async function assertReportablePropertyExists(propertyId) {
  const [rows] = await dbPool.execute(
    `
    SELECT id
    FROM properties
    WHERE id = ?
      AND COALESCE(is_deleted, 0) = 0
      AND COALESCE(is_active, 1) = 1
    LIMIT 1
    `,
    [propertyId]
  );

  if (!rows.length) {
    throw httpError(404, "Property not found");
  }
}

async function findPropertyReportRowById(reportId) {
  const [rows] = await dbPool.execute(
    `
    SELECT
      ${REPORT_SELECT_COLUMNS}
    FROM property_reports pr
    LEFT JOIN properties p ON p.id = pr.property_id
    LEFT JOIN users reporter ON reporter.id = pr.reporter_user_id
    LEFT JOIN users reviewer ON reviewer.id = pr.reviewed_by_admin_user_id
    WHERE pr.id = ?
    LIMIT 1
    `,
    [reportId]
  );

  return rows[0] || null;
}

export async function createPropertyReport({ propertyId, reporterUserId, category, message }) {
  const normalizedPropertyId = Number(propertyId);
  const normalizedReporterUserId = Number(reporterUserId);
  const normalizedMessage = normalizeOptionalString(message);

  if (!normalizedPropertyId) {
    throw httpError(400, "Invalid property id");
  }

  if (!normalizedReporterUserId) {
    throw httpError(401, "Invalid user session");
  }

  if (!normalizedMessage) {
    throw httpError(400, "message is required");
  }

  await assertReportablePropertyExists(normalizedPropertyId);

  const [result] = await dbPool.execute(
    `
    INSERT INTO property_reports (property_id, reporter_user_id, category, message)
    VALUES (?, ?, ?, ?)
    `,
    [normalizedPropertyId, normalizedReporterUserId, category, normalizedMessage]
  );

  const row = await findPropertyReportRowById(result.insertId);
  return toPublicPropertyReport(row);
}

export async function fetchAdminPropertyReports({ limit = 100, status = "all" } = {}) {
  const boundedLimit = toBoundedLimit(limit, 100, MAX_ADMIN_REPORTS_LIMIT);
  const normalizedStatus = String(status || "all").trim().toLowerCase();

  const whereClauses = [];
  const params = [];

  if (normalizedStatus && normalizedStatus !== "all") {
    whereClauses.push("pr.status = ?");
    params.push(normalizedStatus);
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const [rows] = await dbPool.execute(
    `
    SELECT
      ${REPORT_SELECT_COLUMNS}
    FROM property_reports pr
    LEFT JOIN properties p ON p.id = pr.property_id
    LEFT JOIN users reporter ON reporter.id = pr.reporter_user_id
    LEFT JOIN users reviewer ON reviewer.id = pr.reviewed_by_admin_user_id
    ${whereSql}
    ORDER BY
      CASE pr.status
        WHEN 'unread' THEN 0
        WHEN 'in_review' THEN 1
        WHEN 'resolved' THEN 2
        WHEN 'rejected' THEN 3
        ELSE 4
      END,
      pr.created_at DESC,
      pr.id DESC
    LIMIT ${boundedLimit}
    `,
    params
  );

  return rows.map(toPublicPropertyReport);
}

export async function fetchUnreadPropertyReportCount() {
  const [[row]] = await dbPool.query(
    "SELECT COUNT(*) AS total FROM property_reports WHERE status = 'unread'"
  );

  return Number(row?.total || 0);
}

function assertStatusTransition(currentStatus, nextStatus) {
  const transitions = {
    unread: new Set(["in_review", "resolved", "rejected"]),
    in_review: new Set(["resolved", "rejected"]),
    resolved: new Set([]),
    rejected: new Set([]),
  };

  if (currentStatus === nextStatus) {
    return;
  }

  const allowed = transitions[currentStatus] || new Set();
  if (!allowed.has(nextStatus)) {
    throw httpError(400, `Invalid status transition from ${currentStatus} to ${nextStatus}`);
  }
}

export async function updatePropertyReportStatus(
  reportId,
  { status, adminNote, reviewedByAdminUserId }
) {
  const normalizedReportId = Number(reportId);
  const normalizedAdminUserId = Number(reviewedByAdminUserId);

  if (!normalizedReportId) {
    throw httpError(400, "Invalid report id");
  }

  if (!normalizedAdminUserId) {
    throw httpError(401, "Invalid admin session");
  }

  const currentRow = await findPropertyReportRowById(normalizedReportId);
  if (!currentRow) {
    throw httpError(404, "Report not found");
  }

  assertStatusTransition(currentRow.status, status);

  const nextAdminNote =
    adminNote === undefined ? currentRow.admin_note : normalizeOptionalString(adminNote);

  await dbPool.execute(
    `
    UPDATE property_reports
    SET status = ?,
        admin_note = ?,
        reviewed_at = NOW(),
        reviewed_by_admin_user_id = ?
    WHERE id = ?
    `,
    [status, nextAdminNote, normalizedAdminUserId, normalizedReportId]
  );

  const updatedRow = await findPropertyReportRowById(normalizedReportId);
  return toPublicPropertyReport(updatedRow);
}
