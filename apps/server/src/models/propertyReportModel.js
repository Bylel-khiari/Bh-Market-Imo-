import { dbPool } from "../config/db.js";
import { httpError } from "../utils/httpError.js";

const MAX_ADMIN_REPORTS_LIMIT = Number(process.env.ADMIN_PROPERTY_REPORTS_MAX_LIMIT || 500);
const PROPERTY_TABLE = "clean_listings";
const RECLAMATION_TABLE = "reclamations";
const RECLAMATION_HISTORY_TABLE = "reclamation_history";
const LEGACY_REPORT_TABLE = "property_reports";
const DEFAULT_SOURCE_KIND = "ANNONCE";
const DEFAULT_PRIORITY = "MOYENNE";

const STATUS_TO_DB = {
  unread: "NON_LU",
  in_review: "EN_COURS",
  resolved: "RESOLU",
  rejected: "REJETE",
};

const STATUS_FROM_DB = Object.fromEntries(
  Object.entries(STATUS_TO_DB).map(([appStatus, dbStatus]) => [dbStatus, appStatus])
);

const REPORT_SELECT_COLUMNS = `
  r.id,
  r.annonce_id AS property_id,
  r.client_id AS reporter_user_id,
  r.type AS category,
  r.message,
  CASE r.statut
    WHEN 'NON_LU' THEN 'unread'
    WHEN 'EN_COURS' THEN 'in_review'
    WHEN 'RESOLU' THEN 'resolved'
    WHEN 'REJETE' THEN 'rejected'
    ELSE LOWER(r.statut)
  END AS status,
  r.note_admin AS admin_note,
  r.resolved_at AS reviewed_at,
  r.admin_id AS reviewed_by_admin_user_id,
  r.created_at,
  r.updated_at,
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

function toDbStatus(status) {
  return STATUS_TO_DB[status] || status;
}

async function tableExists(tableName) {
  const [rows] = await dbPool.query("SHOW TABLES LIKE ?", [tableName]);
  return Array.isArray(rows) && rows.length > 0;
}

async function appendReclamationHistory(
  executor,
  { reclamationId, action, previousStatus = null, nextStatus = null, commentaire = null, adminId = null }
) {
  await executor.execute(
    `
    INSERT INTO ${RECLAMATION_HISTORY_TABLE} (
      reclamation_id,
      action,
      old_status,
      new_status,
      commentaire,
      admin_id
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [reclamationId, action, previousStatus, nextStatus, commentaire, adminId]
  );
}

async function migrateLegacyReportsIfNeeded() {
  if (!(await tableExists(LEGACY_REPORT_TABLE))) {
    return;
  }

  await dbPool.query(
    `
    INSERT INTO ${RECLAMATION_TABLE} (
      id,
      client_id,
      annonce_id,
      site_source_id,
      source_kind,
      type,
      message,
      statut,
      priorite,
      admin_id,
      note_admin,
      created_at,
      updated_at,
      resolved_at
    )
    SELECT
      legacy.id,
      legacy.reporter_user_id,
      legacy.property_id,
      NULL,
      '${DEFAULT_SOURCE_KIND}',
      legacy.category,
      legacy.message,
      CASE legacy.status
        WHEN 'unread' THEN 'NON_LU'
        WHEN 'in_review' THEN 'EN_COURS'
        WHEN 'resolved' THEN 'RESOLU'
        WHEN 'rejected' THEN 'REJETE'
        ELSE UPPER(legacy.status)
      END,
      '${DEFAULT_PRIORITY}',
      legacy.reviewed_by_admin_user_id,
      legacy.admin_note,
      legacy.created_at,
      legacy.updated_at,
      legacy.reviewed_at
    FROM ${LEGACY_REPORT_TABLE} legacy
    LEFT JOIN ${RECLAMATION_TABLE} current_table ON current_table.id = legacy.id
    WHERE current_table.id IS NULL
    `
  );

  await dbPool.query(
    `
    INSERT INTO ${RECLAMATION_HISTORY_TABLE} (
      reclamation_id,
      action,
      old_status,
      new_status,
      commentaire,
      admin_id,
      created_at
    )
    SELECT
      r.id,
      'migrated',
      NULL,
      r.statut,
      COALESCE(NULLIF(r.note_admin, ''), 'Migrated from property_reports'),
      r.admin_id,
      r.created_at
    FROM ${RECLAMATION_TABLE} r
    LEFT JOIN ${RECLAMATION_HISTORY_TABLE} rh ON rh.reclamation_id = r.id
    WHERE rh.id IS NULL
    `
  );
}

async function ensurePropertyReportsTable() {
  if (!ensurePropertyReportsTablePromise) {
    ensurePropertyReportsTablePromise = (async () => {
      await dbPool.query(`
        CREATE TABLE IF NOT EXISTS ${RECLAMATION_TABLE} (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          client_id BIGINT NOT NULL,
          annonce_id BIGINT UNSIGNED NULL,
          site_source_id BIGINT UNSIGNED NULL,
          source_kind VARCHAR(24) NOT NULL DEFAULT '${DEFAULT_SOURCE_KIND}',
          type VARCHAR(64) NOT NULL,
          message TEXT NOT NULL,
          statut VARCHAR(24) NOT NULL DEFAULT 'NON_LU',
          priorite VARCHAR(24) NOT NULL DEFAULT '${DEFAULT_PRIORITY}',
          admin_id BIGINT NULL,
          note_admin TEXT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          resolved_at DATETIME NULL,
          PRIMARY KEY (id),
          KEY idx_reclamations_client_id (client_id),
          KEY idx_reclamations_annonce_id (annonce_id),
          KEY idx_reclamations_status_created_at (statut, created_at)
        )
      `);

      await dbPool.query(`
        CREATE TABLE IF NOT EXISTS ${RECLAMATION_HISTORY_TABLE} (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          reclamation_id BIGINT UNSIGNED NOT NULL,
          action VARCHAR(64) NOT NULL,
          old_status VARCHAR(24) NULL,
          new_status VARCHAR(24) NULL,
          commentaire TEXT NULL,
          admin_id BIGINT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_reclamation_history_reclamation_id (reclamation_id),
          KEY idx_reclamation_history_created_at (created_at)
        )
      `);

      await migrateLegacyReportsIfNeeded();
    })().catch((error) => {
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
    FROM ${PROPERTY_TABLE}
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
    FROM ${RECLAMATION_TABLE} r
    LEFT JOIN ${PROPERTY_TABLE} p ON p.id = r.annonce_id
    LEFT JOIN users reporter ON reporter.id = r.client_id
    LEFT JOIN users reviewer ON reviewer.id = r.admin_id
    WHERE r.id = ?
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

  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `
      INSERT INTO ${RECLAMATION_TABLE} (
        client_id,
        annonce_id,
        site_source_id,
        source_kind,
        type,
        message,
        statut,
        priorite
      )
      VALUES (?, ?, NULL, ?, ?, ?, 'NON_LU', ?)
      `,
      [normalizedReporterUserId, normalizedPropertyId, DEFAULT_SOURCE_KIND, category, normalizedMessage, DEFAULT_PRIORITY]
    );

    await appendReclamationHistory(connection, {
      reclamationId: result.insertId,
      action: "created",
      previousStatus: null,
      nextStatus: "NON_LU",
      commentaire: normalizedMessage,
      adminId: null,
    });

    await connection.commit();

    const row = await findPropertyReportRowById(result.insertId);
    return toPublicPropertyReport(row);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function fetchAdminPropertyReports({ limit = 100, status = "all" } = {}) {
  const boundedLimit = toBoundedLimit(limit, 100, MAX_ADMIN_REPORTS_LIMIT);
  const normalizedStatus = String(status || "all").trim().toLowerCase();

  const whereClauses = [];
  const params = [];

  if (normalizedStatus && normalizedStatus !== "all") {
    whereClauses.push("r.statut = ?");
    params.push(toDbStatus(normalizedStatus));
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const [rows] = await dbPool.execute(
    `
    SELECT
      ${REPORT_SELECT_COLUMNS}
    FROM ${RECLAMATION_TABLE} r
    LEFT JOIN ${PROPERTY_TABLE} p ON p.id = r.annonce_id
    LEFT JOIN users reporter ON reporter.id = r.client_id
    LEFT JOIN users reviewer ON reviewer.id = r.admin_id
    ${whereSql}
    ORDER BY
      CASE r.statut
        WHEN 'NON_LU' THEN 0
        WHEN 'EN_COURS' THEN 1
        WHEN 'RESOLU' THEN 2
        WHEN 'REJETE' THEN 3
        ELSE 4
      END,
      r.created_at DESC,
      r.id DESC
    LIMIT ${boundedLimit}
    `,
    params
  );

  return rows.map(toPublicPropertyReport);
}

export async function fetchUnreadPropertyReportCount() {
  const [[row]] = await dbPool.query(
    `SELECT COUNT(*) AS total FROM ${RECLAMATION_TABLE} WHERE statut = 'NON_LU'`
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
    throw httpError(404, "Reclamation not found");
  }

  assertStatusTransition(currentRow.status, status);

  const nextAdminNote =
    adminNote === undefined ? currentRow.admin_note : normalizeOptionalString(adminNote);
  const nextDbStatus = toDbStatus(status);
  const previousDbStatus = toDbStatus(currentRow.status);
  const resolvedAtValue =
    nextDbStatus === "RESOLU" || nextDbStatus === "REJETE"
      ? new Date().toISOString().slice(0, 19).replace("T", " ")
      : null;

  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      `
      UPDATE ${RECLAMATION_TABLE}
      SET statut = ?,
          note_admin = ?,
          admin_id = ?,
          resolved_at = ?
      WHERE id = ?
      `,
      [nextDbStatus, nextAdminNote, normalizedAdminUserId, resolvedAtValue, normalizedReportId]
    );

    await appendReclamationHistory(connection, {
      reclamationId: normalizedReportId,
      action: "status_updated",
      previousStatus: previousDbStatus,
      nextStatus: nextDbStatus,
      commentaire: nextAdminNote,
      adminId: normalizedAdminUserId,
    });

    await connection.commit();

    const updatedRow = await findPropertyReportRowById(normalizedReportId);
    return toPublicPropertyReport(updatedRow);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
