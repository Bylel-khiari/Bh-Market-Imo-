import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { dbPool } from "../config/db.js";
import { httpError } from "../utils/httpError.js";
import { validateDocumentCompleteness, isValidDocumentType } from "../utils/documentTypes.js";

const CREDIT_APPLICATION_TABLE = "credit_applications";
const CREDIT_APPLICATION_HISTORY_TABLE = "credit_application_history";
const CREDIT_APPLICATION_DOCUMENT_TABLE = "credit_application_documents";
const CREDIT_APPLICATION_DOCUMENT_CHUNK_TABLE = "credit_application_document_chunks";
const PROPERTY_TABLE = "properties";
const MAX_AGENT_APPLICATIONS_LIMIT = Number(process.env.AGENT_CREDIT_APPLICATIONS_MAX_LIMIT || 500);
const CONFIGURED_CLIENT_EDIT_WINDOW_MINUTES = Number(
  process.env.CLIENT_CREDIT_APPLICATION_EDIT_WINDOW_MINUTES || 30
);
const CLIENT_EDIT_WINDOW_MINUTES = Number.isFinite(CONFIGURED_CLIENT_EDIT_WINDOW_MINUTES)
  ? CONFIGURED_CLIENT_EDIT_WINDOW_MINUTES
  : 30;
const CLIENT_EDIT_WINDOW_MS = Math.max(CLIENT_EDIT_WINDOW_MINUTES, 0) * 60 * 1000;
const DEFAULT_LEGACY_UPLOAD_ROOT = fileURLToPath(
  new URL("../../uploads/credit-applications/", import.meta.url)
);
const LEGACY_UPLOAD_ROOT = path.resolve(
  process.env.CREDIT_APPLICATION_UPLOAD_DIR || DEFAULT_LEGACY_UPLOAD_ROOT
);
const DOCUMENT_CHUNK_BYTES = Number(process.env.CREDIT_APPLICATION_DOCUMENT_CHUNK_BYTES || 512 * 1024);

const CREDIT_APPLICATION_STATUSES = new Set([
  "SOUMIS",
  "DOCUMENTS_MANQUANTS",
  "EN_VERIFICATION",
  "EN_ETUDE",
  "ACCEPTE",
  "REFUSE",
]);

const LEGACY_STATUS_MAP = {
  submitted: "SOUMIS",
  documents_pending: "DOCUMENTS_MANQUANTS",
  under_review: "EN_ETUDE",
  approved: "ACCEPTE",
  rejected: "REFUSE",
};

let initializeCreditApplicationStorePromise = null;

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

function normalizeRequiredPatchString(value, currentValue, fieldName) {
  const normalizedValue =
    value === undefined ? normalizeOptionalString(currentValue) : normalizeOptionalString(value);

  if (!normalizedValue) {
    throw httpError(400, `Missing required credit application field: ${fieldName}`);
  }

  return normalizedValue;
}

function normalizePatchOptionalString(value, currentValue) {
  return value === undefined ? normalizeOptionalString(currentValue) : normalizeOptionalString(value);
}

function normalizeOptionalNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) ? normalizedValue : null;
}

function normalizePatchOptionalNumber(value, currentValue) {
  return value === undefined ? normalizeOptionalNumber(currentValue) : normalizeOptionalNumber(value);
}

function normalizeOptionalInteger(value) {
  const normalizedValue = normalizeOptionalNumber(value);
  return normalizedValue === null ? null : Math.trunc(normalizedValue);
}

function normalizePatchOptionalInteger(value, currentValue) {
  return value === undefined ? normalizeOptionalInteger(currentValue) : normalizeOptionalInteger(value);
}

function normalizeDocumentNames(documents) {
  if (!Array.isArray(documents)) {
    return [];
  }

  return documents
    .map((item) => {
      if (typeof item === "object" && item !== null) {
        return String(item.name || "").trim();
      }

      return String(item || "").trim();
    })
    .filter(Boolean)
    .slice(0, 40);
}

function normalizeCreditApplicationStatus(status) {
  const rawStatus = String(status || "").trim();
  const legacyStatus = LEGACY_STATUS_MAP[rawStatus.toLowerCase()];
  return legacyStatus || rawStatus.toUpperCase();
}

function normalizeMimeType(value) {
  const mimeType = String(value || "").trim().toLowerCase();
  return mimeType || null;
}

function inferMimeTypeFromName(name) {
  const ext = path.extname(String(name || "")).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

function resolveLegacyStoredDocumentPath(storagePath) {
  const normalizedStoragePath = String(storagePath || "").replace(/\\/g, "/");
  const resolvedPath = path.resolve(LEGACY_UPLOAD_ROOT, normalizedStoragePath);

  if (!resolvedPath.startsWith(`${LEGACY_UPLOAD_ROOT}${path.sep}`)) {
    return null;
  }

  return resolvedPath;
}

function getTimestamp(value) {
  if (!value) {
    return 0;
  }

  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function serializeDocumentNames(documents) {
  return JSON.stringify(normalizeDocumentNames(documents));
}

function parseDocumentNames(rawValue) {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(String(rawValue));
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function normalizeTypedDocuments(documents) {
  if (!Array.isArray(documents)) {
    return [];
  }

  return documents
    .map((doc) => {
      if (typeof doc !== "object" || doc === null) {
        return null;
      }
      const type = String(doc.type || "").trim().toUpperCase();
      const name = String(doc.name || "").trim();
      const mimeType = normalizeOptionalString(doc.mime_type || doc.content_type);
      const sizeBytes = normalizeOptionalInteger(doc.size_bytes ?? doc.size);
      const dbDocumentId = normalizeOptionalInteger(doc.db_document_id);

      if (!type || !name) {
        return null;
      }

      if (!isValidDocumentType(type)) {
        return null;
      }

      return {
        type,
        name,
        ...(mimeType ? { mime_type: mimeType } : {}),
        ...(Number.isInteger(sizeBytes) && sizeBytes >= 0 ? { size_bytes: sizeBytes } : {}),
        ...(Number.isInteger(dbDocumentId) && dbDocumentId > 0 ? { db_document_id: dbDocumentId } : {}),
      };
    })
    .filter(Boolean)
    .slice(0, 40);
}

function serializeTypedDocuments(documents) {
  return JSON.stringify(normalizeTypedDocuments(documents));
}

function parseTypedDocuments(rawValue) {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(String(rawValue));
    return Array.isArray(parsed)
      ? parsed.filter(doc => doc && doc.type && doc.name)
      : [];
  } catch {
    return [];
  }
}

function mergeTypedDocuments(existingDocuments, incomingDocuments) {
  const mergedByType = new Map();

  normalizeTypedDocuments(existingDocuments).forEach((document) => {
    mergedByType.set(document.type, document);
  });

  normalizeTypedDocuments(incomingDocuments).forEach((document) => {
    mergedByType.set(document.type, document);
  });

  return Array.from(mergedByType.values()).slice(0, 40);
}

function getReplacedTypedDocuments(existingDocuments, incomingDocuments) {
  const existingByType = new Map(
    normalizeTypedDocuments(existingDocuments).map((document) => [document.type, document])
  );

  return normalizeTypedDocuments(incomingDocuments)
    .map((document) => existingByType.get(document.type))
    .filter((document) => document?.db_document_id);
}

async function ensureCreditApplicationColumn(columnName, columnDefinition) {
  const [[row]] = await dbPool.execute(
    `
    SELECT COUNT(*) AS column_count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    `,
    [CREDIT_APPLICATION_TABLE, columnName]
  );

  if (Number(row?.column_count || 0) === 0) {
    await dbPool.query(
      `ALTER TABLE ${CREDIT_APPLICATION_TABLE} ADD COLUMN ${columnName} ${columnDefinition}`
    );
  }
}

function getComplianceLevel(score) {
  const normalizedScore = normalizeOptionalInteger(score);

  if (normalizedScore === null || normalizedScore === undefined) {
    return "not_scored";
  }

  if (normalizedScore >= 75) {
    return "solid";
  }

  if (normalizedScore >= 50) {
    return "watch";
  }

  return "risk";
}

function isDecisionStatus(status) {
  const normalizedStatus = normalizeCreditApplicationStatus(status);
  return normalizedStatus === "ACCEPTE" || normalizedStatus === "REFUSE";
}

function getClientEditWindowState(row, now = Date.now()) {
  const createdAtTimestamp = getTimestamp(row?.created_at);
  const deadlineTimestamp = createdAtTimestamp ? createdAtTimestamp + CLIENT_EDIT_WINDOW_MS : 0;
  const remainingMs = Math.max(deadlineTimestamp - now, 0);
  const normalizedStatus = normalizeCreditApplicationStatus(row?.status);
  const hasFinalDecision = isDecisionStatus(normalizedStatus);

  return {
    deadlineAt: deadlineTimestamp ? new Date(deadlineTimestamp).toISOString() : null,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    canEdit: Boolean(deadlineTimestamp && remainingMs > 0 && !hasFinalDecision),
    lockedReason: hasFinalDecision
      ? "decision_finale"
      : remainingMs > 0
        ? null
        : "delai_expire",
  };
}

function assertClientCanEditCreditApplication(row, clientUserId) {
  const normalizedClientUserId = Number(clientUserId);

  if (!row) {
    throw httpError(404, "Credit application not found");
  }

  if (!normalizedClientUserId || Number(row.client_id) !== normalizedClientUserId) {
    throw httpError(404, "Credit application not found");
  }

  const editWindow = getClientEditWindowState(row);

  if (!editWindow.canEdit) {
    throw httpError(
      403,
      editWindow.lockedReason === "decision_finale"
        ? "Cette demande ne peut plus etre modifiee car une decision bancaire finale existe."
        : "Le delai de modification de 30 minutes est expire."
    );
  }
}

function buildDecisionMotif(status, { agentNote, complianceSummary, complianceScore } = {}) {
  const explicitMotif =
    normalizeOptionalString(agentNote) || normalizeOptionalString(complianceSummary);

  if (explicitMotif) {
    return explicitMotif;
  }

  const score = normalizeOptionalInteger(complianceScore);
  const scoreSuffix = score === null ? "" : ` Score retenu: ${score}/100.`;

  if (normalizeCreditApplicationStatus(status) === "ACCEPTE") {
    return `Demande acceptee apres analyse bancaire et validation des criteres de scoring.${scoreSuffix}`;
  }

  if (normalizeCreditApplicationStatus(status) === "REFUSE") {
    return `Demande refusee apres analyse bancaire et controle des criteres de scoring.${scoreSuffix}`;
  }

  return null;
}

function toPublicCreditApplication(row) {
  if (!row) return null;

  const propertyPriceValue =
    normalizeOptionalNumber(row.live_property_price_value) ??
    normalizeOptionalNumber(row.property_price_value);
  const complianceScore = normalizeOptionalInteger(row.compliance_score);
  const documents = parseDocumentNames(row.document_names_json);
  const typedDocuments = parseTypedDocuments(row.documents_json);
  const normalizedStatus = normalizeCreditApplicationStatus(row.status);
  const clientEditWindow = getClientEditWindowState(row);
  const decisionMotif =
    row.decision_motif ||
    (isDecisionStatus(normalizedStatus)
      ? buildDecisionMotif(normalizedStatus, {
          agentNote: row.agent_note,
          complianceSummary: row.compliance_summary,
          complianceScore,
        })
      : null);

  return {
    id: row.id,
    client_id: row.client_id,
    client_name: row.client_name || row.full_name,
    client_account_email: row.client_account_email || row.email,
    property_id: row.property_id,
    property_title: row.property_title || row.property_title_snapshot,
    property_location: row.property_location || row.property_location_snapshot,
    property_price_value: propertyPriceValue,
    property_price_raw: row.live_property_price_raw || row.property_price_raw,
    assigned_agent_user_id: row.assigned_agent_user_id,
    assigned_agent_name: row.assigned_agent_name,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    cin: row.cin,
    rib: row.rib,
    funding_type: row.funding_type,
    socio_category: row.socio_category,
    requested_amount: normalizeOptionalNumber(row.requested_amount),
    personal_contribution_value: normalizeOptionalNumber(row.personal_contribution_value),
    gross_income_value: normalizeOptionalNumber(row.gross_income_value),
    income_period: row.income_period,
    revenu_annuel: normalizeOptionalNumber(row.scoring_annual_income),
    charges_impayees: normalizeOptionalNumber(row.scoring_annual_charges),
    situation_familiale: row.family_situation,
    situation_contractuelle: row.contract_type,
    other_monthly_charges: normalizeOptionalNumber(row.other_monthly_charges),
    duration_months: normalizeOptionalInteger(row.duration_months),
    estimated_monthly_payment: normalizeOptionalNumber(row.estimated_monthly_payment),
    estimated_rate: normalizeOptionalNumber(row.estimated_rate),
    debt_ratio: normalizeOptionalNumber(row.debt_ratio),
    status: normalizedStatus,
    compliance_score: complianceScore,
    compliance_level: getComplianceLevel(complianceScore),
    compliance_summary: row.compliance_summary,
    agent_note: row.agent_note,
    decision_motif: decisionMotif,
    client_notified_at: row.client_notified_at,
    documents,
    document_count: documents.length,
    typed_documents: typedDocuments,
    typed_document_count: typedDocuments.length,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    client_edit_deadline_at: clientEditWindow.deadlineAt,
    client_edit_remaining_seconds: clientEditWindow.remainingSeconds,
    can_client_edit: clientEditWindow.canEdit,
    client_edit_locked_reason: clientEditWindow.lockedReason,
  };
}

async function appendCreditApplicationHistory(
  executor,
  {
    applicationId,
    action,
    previousStatus = null,
    nextStatus = null,
    comment = null,
    agentUserId = null,
  }
) {
  await executor.execute(
    `
    INSERT INTO ${CREDIT_APPLICATION_HISTORY_TABLE} (
      application_id,
      action,
      previous_status,
      next_status,
      comment,
      agent_user_id
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [applicationId, action, previousStatus, nextStatus, comment, agentUserId]
  );
}

async function insertCreditApplicationDocumentRows(executor, applicationId, documents) {
  const normalizedApplicationId = Number(applicationId);
  const storedDocuments = [];

  for (const document of Array.isArray(documents) ? documents : []) {
    const normalizedDocument = normalizeTypedDocuments([document])[0];

    if (!normalizedDocument) {
      continue;
    }

    const contentBuffer = document?.content_buffer;

    if (!Buffer.isBuffer(contentBuffer)) {
      storedDocuments.push(normalizedDocument);
      continue;
    }

    const [result] = await executor.execute(
      `
      INSERT INTO ${CREDIT_APPLICATION_DOCUMENT_TABLE} (
        application_id,
        document_type,
        file_name,
        mime_type,
        size_bytes,
        content
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        normalizedApplicationId,
        normalizedDocument.type,
        normalizedDocument.name,
        normalizedDocument.mime_type || null,
        normalizedDocument.size_bytes || contentBuffer.length,
        null,
      ]
    );

    const documentId = result.insertId;
    for (let offset = 0, chunkIndex = 0; offset < contentBuffer.length; offset += DOCUMENT_CHUNK_BYTES, chunkIndex += 1) {
      await executor.execute(
        `
        INSERT INTO ${CREDIT_APPLICATION_DOCUMENT_CHUNK_TABLE} (
          document_id,
          chunk_index,
          content_chunk
        )
        VALUES (?, ?, ?)
        `,
        [documentId, chunkIndex, contentBuffer.subarray(offset, offset + DOCUMENT_CHUNK_BYTES)]
      );
    }

    storedDocuments.push({
      ...normalizedDocument,
      db_document_id: documentId,
    });
  }

  return storedDocuments;
}

async function deleteCreditApplicationDocumentRows(executor, documents) {
  const documentIds = normalizeTypedDocuments(documents)
    .map((document) => Number(document.db_document_id))
    .filter((documentId) => Number.isInteger(documentId) && documentId > 0);

  if (documentIds.length === 0) {
    return;
  }

  const placeholders = documentIds.map(() => "?").join(", ");
  await executor.execute(
    `
    DELETE FROM ${CREDIT_APPLICATION_DOCUMENT_CHUNK_TABLE}
    WHERE document_id IN (${placeholders})
    `,
    documentIds
  );
  await executor.execute(
    `
    DELETE FROM ${CREDIT_APPLICATION_DOCUMENT_TABLE}
    WHERE id IN (${placeholders})
    `,
    documentIds
  );
}

async function migrateLegacyCreditApplicationDocumentsToDatabase() {
  const [rows] = await dbPool.execute(
    `
    SELECT id, documents_json
    FROM ${CREDIT_APPLICATION_TABLE}
    WHERE documents_json LIKE '%storage_path%'
    LIMIT 500
    `
  );

  for (const row of rows || []) {
    const documents = parseTypedDocuments(row.documents_json);
    if (!documents.length) {
      continue;
    }

    const nextDocuments = [];
    let hasChanges = false;

    for (const document of documents) {
      const normalizedDocument = normalizeTypedDocuments([document])[0];

      if (!normalizedDocument || normalizedDocument.db_document_id || !document.storage_path) {
        if (normalizedDocument) {
          nextDocuments.push(normalizedDocument);
        }
        continue;
      }

      const filePath = resolveLegacyStoredDocumentPath(document.storage_path);
      const content = filePath ? await readFile(filePath).catch(() => null) : null;

      if (!content?.length) {
        nextDocuments.push(normalizedDocument);
        continue;
      }

      const mimeType =
        normalizeMimeType(normalizedDocument.mime_type) ||
        inferMimeTypeFromName(normalizedDocument.name);
      const [insertResult] = await dbPool.execute(
        `
        INSERT INTO ${CREDIT_APPLICATION_DOCUMENT_TABLE} (
          application_id,
          document_type,
          file_name,
          mime_type,
          size_bytes,
          content
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          row.id,
          normalizedDocument.type,
          normalizedDocument.name,
          mimeType,
          Number(normalizedDocument.size_bytes || content.length),
          null,
        ]
      );
      const documentId = insertResult.insertId;

      for (let offset = 0, chunkIndex = 0; offset < content.length; offset += DOCUMENT_CHUNK_BYTES, chunkIndex += 1) {
        await dbPool.execute(
          `
          INSERT INTO ${CREDIT_APPLICATION_DOCUMENT_CHUNK_TABLE} (
            document_id,
            chunk_index,
            content_chunk
          )
          VALUES (?, ?, ?)
          `,
          [documentId, chunkIndex, content.subarray(offset, offset + DOCUMENT_CHUNK_BYTES)]
        );
      }

      nextDocuments.push({
        ...normalizedDocument,
        mime_type: mimeType,
        size_bytes: Number(normalizedDocument.size_bytes || content.length),
        db_document_id: documentId,
      });
      hasChanges = true;
    }

    if (hasChanges) {
      await dbPool.execute(
        `
        UPDATE ${CREDIT_APPLICATION_TABLE}
        SET document_names_json = ?,
            documents_json = ?
        WHERE id = ?
        `,
        [
          serializeDocumentNames(nextDocuments),
          serializeTypedDocuments(nextDocuments),
          row.id,
        ]
      );
    }
  }
}

async function ensureCreditApplicationTables() {
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS ${CREDIT_APPLICATION_TABLE} (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      client_id BIGINT NOT NULL,
      property_id BIGINT UNSIGNED NULL,
      assigned_agent_user_id BIGINT NULL,
      full_name VARCHAR(160) NOT NULL,
      email VARCHAR(190) NOT NULL,
      phone VARCHAR(40) NOT NULL,
      cin VARCHAR(40) NOT NULL,
      rib VARCHAR(64) NOT NULL,
      funding_type VARCHAR(64) NULL,
      socio_category VARCHAR(64) NULL,
      property_title_snapshot VARCHAR(255) NULL,
      property_location_snapshot VARCHAR(255) NULL,
      property_price_value DECIMAL(14, 2) NULL,
      property_price_raw VARCHAR(255) NULL,
      requested_amount DECIMAL(14, 2) NULL,
      personal_contribution_value DECIMAL(14, 2) NULL,
      gross_income_value DECIMAL(14, 2) NULL,
      income_period VARCHAR(16) NULL,
      scoring_annual_income DECIMAL(14, 2) NULL,
      scoring_annual_charges DECIMAL(14, 2) NULL,
      family_situation VARCHAR(80) NULL,
      contract_type VARCHAR(80) NULL,
      other_monthly_charges DECIMAL(14, 2) NULL,
      duration_months INT NULL,
      estimated_monthly_payment DECIMAL(14, 2) NULL,
      estimated_rate DECIMAL(8, 3) NULL,
      debt_ratio DECIMAL(6, 2) NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'SOUMIS',
      compliance_score TINYINT UNSIGNED NULL,
      compliance_summary TEXT NULL,
      agent_note TEXT NULL,
      decision_motif TEXT NULL,
      client_notified_at DATETIME NULL,
      document_names_json LONGTEXT NULL,
      documents_json LONGTEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      reviewed_at DATETIME NULL,
      PRIMARY KEY (id),
      KEY idx_credit_applications_client_id (client_id),
      KEY idx_credit_applications_property_id (property_id),
      KEY idx_credit_applications_agent_id (assigned_agent_user_id),
      KEY idx_credit_applications_status_created_at (status, created_at)
    )
  `);

  await dbPool.query(`
    UPDATE ${CREDIT_APPLICATION_TABLE}
    SET status = CASE LOWER(status)
      WHEN 'submitted' THEN 'SOUMIS'
      WHEN 'documents_pending' THEN 'DOCUMENTS_MANQUANTS'
      WHEN 'under_review' THEN 'EN_ETUDE'
      WHEN 'approved' THEN 'ACCEPTE'
      WHEN 'rejected' THEN 'REFUSE'
      ELSE UPPER(status)
    END
    WHERE status <> UPPER(status)
       OR LOWER(status) IN ('submitted', 'documents_pending', 'under_review', 'approved', 'rejected')
  `);

  await ensureCreditApplicationColumn("scoring_annual_income", "DECIMAL(14, 2) NULL");
  await ensureCreditApplicationColumn("scoring_annual_charges", "DECIMAL(14, 2) NULL");
  await ensureCreditApplicationColumn("family_situation", "VARCHAR(80) NULL");
  await ensureCreditApplicationColumn("contract_type", "VARCHAR(80) NULL");
  await ensureCreditApplicationColumn("other_monthly_charges", "DECIMAL(14, 2) NULL");
  await ensureCreditApplicationColumn("decision_motif", "TEXT NULL");
  await ensureCreditApplicationColumn("client_notified_at", "DATETIME NULL");

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS ${CREDIT_APPLICATION_DOCUMENT_TABLE} (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      application_id BIGINT UNSIGNED NOT NULL,
      document_type VARCHAR(64) NOT NULL,
      file_name VARCHAR(200) NOT NULL,
      mime_type VARCHAR(120) NULL,
      size_bytes INT UNSIGNED NOT NULL DEFAULT 0,
      content LONGBLOB NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_credit_application_documents_application_id (application_id),
      KEY idx_credit_application_documents_type (application_id, document_type)
    )
  `);
  await dbPool.query(`
    ALTER TABLE ${CREDIT_APPLICATION_DOCUMENT_TABLE}
    MODIFY COLUMN content LONGBLOB NULL
  `);
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS ${CREDIT_APPLICATION_DOCUMENT_CHUNK_TABLE} (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      document_id BIGINT UNSIGNED NOT NULL,
      chunk_index SMALLINT UNSIGNED NOT NULL,
      content_chunk MEDIUMBLOB NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_credit_application_document_chunks_order (document_id, chunk_index),
      KEY idx_credit_application_document_chunks_document_id (document_id)
    )
  `);

  await migrateLegacyCreditApplicationDocumentsToDatabase();

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS ${CREDIT_APPLICATION_HISTORY_TABLE} (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      application_id BIGINT UNSIGNED NOT NULL,
      action VARCHAR(64) NOT NULL,
      previous_status VARCHAR(32) NULL,
      next_status VARCHAR(32) NULL,
      comment TEXT NULL,
      agent_user_id BIGINT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_credit_application_history_application_id (application_id),
      KEY idx_credit_application_history_created_at (created_at)
    )
  `);
}

export async function initializeCreditApplicationStore() {
  if (!initializeCreditApplicationStorePromise) {
    initializeCreditApplicationStorePromise = ensureCreditApplicationTables().catch((error) => {
      initializeCreditApplicationStorePromise = null;
      throw error;
    });
  }

  return initializeCreditApplicationStorePromise;
}

async function findPropertySnapshotById(propertyId) {
  const [rows] = await dbPool.execute(
    `
    SELECT
      p.id,
      COALESCE(p.manual_title, p.title) AS property_title,
      COALESCE(p.manual_location_raw, p.location_raw, p.city) AS property_location,
      COALESCE(p.manual_price_value, p.price_value) AS property_price_value,
      COALESCE(p.manual_price_raw, p.price_raw) AS property_price_raw
    FROM ${PROPERTY_TABLE} p
    WHERE p.id = ?
      AND COALESCE(p.is_deleted, 0) = 0
    LIMIT 1
    `,
    [propertyId]
  );

  return rows[0] || null;
}

const CREDIT_APPLICATION_SELECT_COLUMNS = `
  ca.id,
  ca.client_id,
  ca.property_id,
  ca.assigned_agent_user_id,
  ca.full_name,
  ca.email,
  ca.phone,
  ca.cin,
  ca.rib,
  ca.funding_type,
  ca.socio_category,
  ca.property_title_snapshot,
  ca.property_location_snapshot,
  ca.property_price_value,
  ca.property_price_raw,
  ca.requested_amount,
  ca.personal_contribution_value,
  ca.gross_income_value,
  ca.income_period,
  ca.scoring_annual_income,
  ca.scoring_annual_charges,
  ca.family_situation,
  ca.contract_type,
  ca.other_monthly_charges,
  ca.duration_months,
  ca.estimated_monthly_payment,
  ca.estimated_rate,
  ca.debt_ratio,
  ca.status,
  ca.compliance_score,
  ca.compliance_summary,
  ca.agent_note,
  ca.decision_motif,
  ca.client_notified_at,
  ca.document_names_json,
  ca.documents_json,
  ca.reviewed_at,
  ca.created_at,
  ca.updated_at,
  client.name AS client_name,
  client.email AS client_account_email,
  agent.name AS assigned_agent_name,
  COALESCE(NULLIF(p.manual_title, ''), NULLIF(p.title, ''), ca.property_title_snapshot) AS property_title,
  COALESCE(
    NULLIF(p.manual_location_raw, ''),
    NULLIF(p.location_raw, ''),
    NULLIF(p.city, ''),
    ca.property_location_snapshot
  ) AS property_location,
  COALESCE(p.manual_price_value, p.price_value, ca.property_price_value) AS live_property_price_value,
  COALESCE(p.manual_price_raw, p.price_raw, ca.property_price_raw) AS live_property_price_raw
`;

async function findCreditApplicationRowById(applicationId) {
  const [rows] = await dbPool.execute(
    `
    SELECT
      ${CREDIT_APPLICATION_SELECT_COLUMNS}
    FROM ${CREDIT_APPLICATION_TABLE} ca
    LEFT JOIN users client ON client.id = ca.client_id
    LEFT JOIN users agent ON agent.id = ca.assigned_agent_user_id
    LEFT JOIN ${PROPERTY_TABLE} p ON p.id = ca.property_id
    WHERE ca.id = ?
    LIMIT 1
    `,
    [applicationId]
  );

  return rows[0] || null;
}

function assertValidCreditApplicationStatus(status) {
  if (!CREDIT_APPLICATION_STATUSES.has(normalizeCreditApplicationStatus(status))) {
    throw httpError(400, `Invalid credit application status: ${status}`);
  }
}

function assertStatusTransition(currentStatus, nextStatus) {
  const transitions = {
    SOUMIS: new Set(["EN_VERIFICATION", "DOCUMENTS_MANQUANTS", "EN_ETUDE", "ACCEPTE", "REFUSE"]),
    EN_VERIFICATION: new Set(["DOCUMENTS_MANQUANTS", "EN_ETUDE", "ACCEPTE", "REFUSE"]),
    DOCUMENTS_MANQUANTS: new Set(["EN_VERIFICATION", "EN_ETUDE", "ACCEPTE", "REFUSE"]),
    EN_ETUDE: new Set(["EN_VERIFICATION", "DOCUMENTS_MANQUANTS", "ACCEPTE", "REFUSE"]),
    ACCEPTE: new Set([]),
    REFUSE: new Set([]),
  };

  if (currentStatus === nextStatus) {
    return;
  }

  const allowedStatuses = transitions[currentStatus] || new Set();

  if (!allowedStatuses.has(nextStatus)) {
    throw httpError(400, `Invalid status transition from ${currentStatus} to ${nextStatus}`);
  }
}

export async function createCreditApplication({
  clientUserId,
  propertyId,
  fullName,
  email,
  phone,
  cin,
  rib,
  fundingType,
  socioCategory,
  propertyTitle,
  propertyLocation,
  propertyPriceValue,
  propertyPriceRaw,
  requestedAmount,
  personalContribution,
  grossIncome,
  incomePeriod,
  revenuAnnuel,
  chargesImpayees,
  familySituation,
  contractType,
  otherMonthlyCharges,
  durationMonths,
  estimatedMonthlyPayment,
  estimatedRate,
  debtRatio,
  documents,
  complianceScore = null,
  complianceSummary = null,
  initialStatus = null,
  scoringResult = null,
}) {
  const normalizedClientUserId = Number(clientUserId);
  const normalizedPropertyId = normalizeOptionalInteger(propertyId);
  const normalizedFullName = normalizeOptionalString(fullName);
  const normalizedEmail = normalizeOptionalString(email);
  const normalizedPhone = normalizeOptionalString(phone);
  const normalizedCin = normalizeOptionalString(cin);
  const normalizedRib = normalizeOptionalString(rib);
  const normalizedFundingType = normalizeOptionalString(fundingType);
  const normalizedSocioCategory = normalizeOptionalString(socioCategory);
  const normalizedPropertyTitle = normalizeOptionalString(propertyTitle);
  const normalizedPropertyLocation = normalizeOptionalString(propertyLocation);
  const normalizedPropertyPriceValue = normalizeOptionalNumber(propertyPriceValue);
  const normalizedPropertyPriceRaw = normalizeOptionalString(propertyPriceRaw);
  const normalizedRequestedAmount = normalizeOptionalNumber(requestedAmount);
  const normalizedPersonalContribution = normalizeOptionalNumber(personalContribution);
  const normalizedGrossIncome = normalizeOptionalNumber(grossIncome);
  const normalizedIncomePeriod = normalizeOptionalString(incomePeriod);
  const normalizedScoringAnnualIncome = normalizeOptionalNumber(revenuAnnuel);
  const normalizedScoringAnnualCharges = normalizeOptionalNumber(chargesImpayees);
  const normalizedFamilySituation = normalizeOptionalString(familySituation);
  const normalizedContractType = normalizeOptionalString(contractType);
  const normalizedOtherMonthlyCharges = normalizeOptionalNumber(otherMonthlyCharges);
  const normalizedDurationMonths = normalizeOptionalInteger(durationMonths);
  const normalizedEstimatedMonthlyPayment = normalizeOptionalNumber(estimatedMonthlyPayment);
  const normalizedEstimatedRate = normalizeOptionalNumber(estimatedRate);
  const normalizedDebtRatio = normalizeOptionalNumber(debtRatio);
  const normalizedComplianceScore = normalizeOptionalInteger(complianceScore);
  const normalizedComplianceSummary = normalizeOptionalString(complianceSummary);
  const normalizedDocuments = normalizeDocumentNames(documents);
  const normalizedTypedDocuments = normalizeTypedDocuments(documents);

  // Determine the status: use initialStatus if provided, otherwise "SOUMIS"
  const applicationStatus = normalizeOptionalString(initialStatus) || "SOUMIS";
  const initialDecisionMotif = isDecisionStatus(applicationStatus)
    ? buildDecisionMotif(applicationStatus, {
        complianceSummary: normalizedComplianceSummary,
        complianceScore: normalizedComplianceScore,
      })
    : null;
  const clientNotifiedAtValue = isDecisionStatus(applicationStatus)
    ? new Date().toISOString().slice(0, 19).replace("T", " ")
    : null;

  if (!normalizedClientUserId) {
    throw httpError(401, "Invalid client session");
  }

  if (!normalizedFullName || !normalizedEmail || !normalizedPhone || !normalizedCin || !normalizedRib) {
    throw httpError(400, "Missing required credit application fields");
  }

  // Validate that all required documents are present
  const documentCompletion = validateDocumentCompleteness(normalizedTypedDocuments);
  if (!documentCompletion.isComplete) {
    throw httpError(400, `Missing required documents: ${documentCompletion.missing.join(", ")}`);
  }

  let propertySnapshot = null;

  if (normalizedPropertyId) {
    propertySnapshot = await findPropertySnapshotById(normalizedPropertyId);

    if (!propertySnapshot) {
      throw httpError(404, "Selected property not found");
    }
  }

  let connection = null;

  try {
    connection = await dbPool.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `
      INSERT INTO ${CREDIT_APPLICATION_TABLE} (
        client_id,
        property_id,
        assigned_agent_user_id,
        full_name,
        email,
        phone,
        cin,
        rib,
        funding_type,
        socio_category,
        property_title_snapshot,
        property_location_snapshot,
        property_price_value,
        property_price_raw,
        requested_amount,
        personal_contribution_value,
        gross_income_value,
        income_period,
        scoring_annual_income,
        scoring_annual_charges,
        family_situation,
        contract_type,
        other_monthly_charges,
        duration_months,
        estimated_monthly_payment,
        estimated_rate,
        debt_ratio,
        status,
        compliance_score,
        compliance_summary,
        decision_motif,
        client_notified_at,
        document_names_json,
        documents_json
      )
      VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        normalizedClientUserId,
        normalizedPropertyId,
        normalizedFullName,
        normalizedEmail,
        normalizedPhone,
        normalizedCin,
        normalizedRib,
        normalizedFundingType,
        normalizedSocioCategory,
        propertySnapshot?.property_title || normalizedPropertyTitle,
        propertySnapshot?.property_location || normalizedPropertyLocation,
        normalizeOptionalNumber(propertySnapshot?.property_price_value) ?? normalizedPropertyPriceValue,
        propertySnapshot?.property_price_raw || normalizedPropertyPriceRaw,
        normalizedRequestedAmount,
        normalizedPersonalContribution,
        normalizedGrossIncome,
        normalizedIncomePeriod,
        normalizedScoringAnnualIncome,
        normalizedScoringAnnualCharges,
        normalizedFamilySituation,
        normalizedContractType,
        normalizedOtherMonthlyCharges,
        normalizedDurationMonths,
        normalizedEstimatedMonthlyPayment,
        normalizedEstimatedRate,
        normalizedDebtRatio,
        applicationStatus,
        normalizedComplianceScore,
        normalizedComplianceSummary,
        initialDecisionMotif,
        clientNotifiedAtValue,
        serializeDocumentNames(normalizedDocuments),
        serializeTypedDocuments(normalizedTypedDocuments),
      ]
    );

    const storedTypedDocuments = await insertCreditApplicationDocumentRows(
      connection,
      result.insertId,
      documents
    );

    await connection.execute(
      `
      UPDATE ${CREDIT_APPLICATION_TABLE}
      SET document_names_json = ?,
          documents_json = ?
      WHERE id = ?
      `,
      [
        serializeDocumentNames(storedTypedDocuments),
        serializeTypedDocuments(storedTypedDocuments),
        result.insertId,
      ]
    );

    await appendCreditApplicationHistory(connection, {
      applicationId: result.insertId,
      action: "created",
      previousStatus: null,
      nextStatus: applicationStatus,
      comment: storedTypedDocuments.length
        ? `Documents fournis: ${storedTypedDocuments.map(d => `${d.type} (${d.name})`).join(", ")}`
        : "Application created",
      agentUserId: null,
    });

    await connection.commit();

    const row = await findCreditApplicationRowById(result.insertId);
    return toPublicCreditApplication(row);
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export async function updateClientCreditApplication(
  applicationId,
  {
    clientUserId,
    propertyId,
    fullName,
    email,
    phone,
    cin,
    rib,
    fundingType,
    socioCategory,
    propertyTitle,
    propertyLocation,
    propertyPriceValue,
    propertyPriceRaw,
    requestedAmount,
    personalContribution,
    grossIncome,
    incomePeriod,
    revenuAnnuel,
    chargesImpayees,
    familySituation,
    contractType,
    otherMonthlyCharges,
    durationMonths,
    estimatedMonthlyPayment,
    estimatedRate,
    debtRatio,
    documents,
  }
) {
  const normalizedApplicationId = Number(applicationId);
  const normalizedClientUserId = Number(clientUserId);

  if (!normalizedApplicationId) {
    throw httpError(400, "Invalid credit application id");
  }

  if (!normalizedClientUserId) {
    throw httpError(401, "Invalid client session");
  }

  const currentRow = await findCreditApplicationRowById(normalizedApplicationId);
  assertClientCanEditCreditApplication(currentRow, normalizedClientUserId);

  const normalizedPropertyId =
    propertyId === undefined
      ? normalizeOptionalInteger(currentRow.property_id)
      : normalizeOptionalInteger(propertyId);
  const normalizedFullName = normalizeRequiredPatchString(fullName, currentRow.full_name, "full_name");
  const normalizedEmail = normalizeRequiredPatchString(email, currentRow.email, "email");
  const normalizedPhone = normalizeRequiredPatchString(phone, currentRow.phone, "phone");
  const normalizedCin = normalizeRequiredPatchString(cin, currentRow.cin, "cin");
  const normalizedRib = normalizeRequiredPatchString(rib, currentRow.rib, "rib");
  const normalizedFundingType = normalizePatchOptionalString(fundingType, currentRow.funding_type);
  const normalizedSocioCategory = normalizePatchOptionalString(socioCategory, currentRow.socio_category);
  const normalizedRequestedAmount = normalizePatchOptionalNumber(
    requestedAmount,
    currentRow.requested_amount
  );
  const normalizedPersonalContribution = normalizePatchOptionalNumber(
    personalContribution,
    currentRow.personal_contribution_value
  );
  const normalizedGrossIncome = normalizePatchOptionalNumber(grossIncome, currentRow.gross_income_value);
  const normalizedIncomePeriod = normalizePatchOptionalString(incomePeriod, currentRow.income_period);
  const normalizedScoringAnnualIncome = normalizePatchOptionalNumber(
    revenuAnnuel,
    currentRow.scoring_annual_income
  );
  const normalizedScoringAnnualCharges = normalizePatchOptionalNumber(
    chargesImpayees,
    currentRow.scoring_annual_charges
  );
  const normalizedFamilySituation = normalizePatchOptionalString(
    familySituation,
    currentRow.family_situation
  );
  const normalizedContractType = normalizePatchOptionalString(contractType, currentRow.contract_type);
  const normalizedOtherMonthlyCharges = normalizePatchOptionalNumber(
    otherMonthlyCharges,
    currentRow.other_monthly_charges
  );
  const normalizedDurationMonths = normalizePatchOptionalInteger(
    durationMonths,
    currentRow.duration_months
  );
  const normalizedEstimatedMonthlyPayment = normalizePatchOptionalNumber(
    estimatedMonthlyPayment,
    currentRow.estimated_monthly_payment
  );
  const normalizedEstimatedRate = normalizePatchOptionalNumber(estimatedRate, currentRow.estimated_rate);
  const normalizedDebtRatio = normalizePatchOptionalNumber(debtRatio, currentRow.debt_ratio);

  let propertySnapshot = null;

  if (propertyId !== undefined && normalizedPropertyId) {
    propertySnapshot = await findPropertySnapshotById(normalizedPropertyId);

    if (!propertySnapshot) {
      throw httpError(404, "Selected property not found");
    }
  }

  const normalizedPropertyTitle =
    propertySnapshot?.property_title ||
    normalizePatchOptionalString(
      propertyTitle,
      currentRow.property_title_snapshot || currentRow.property_title
    );
  const normalizedPropertyLocation =
    propertySnapshot?.property_location ||
    normalizePatchOptionalString(
      propertyLocation,
      currentRow.property_location_snapshot || currentRow.property_location
    );
  const normalizedPropertyPriceValue =
    normalizeOptionalNumber(propertySnapshot?.property_price_value) ??
    normalizePatchOptionalNumber(propertyPriceValue, currentRow.property_price_value);
  const normalizedPropertyPriceRaw =
    propertySnapshot?.property_price_raw ||
    normalizePatchOptionalString(propertyPriceRaw, currentRow.property_price_raw);

  const currentTypedDocuments = parseTypedDocuments(currentRow.documents_json);
  const normalizedIncomingDocuments = normalizeTypedDocuments(documents);
  const nextTypedDocumentsForValidation = normalizedIncomingDocuments.length
    ? mergeTypedDocuments(currentTypedDocuments, normalizedIncomingDocuments)
    : currentTypedDocuments;
  const replacedDocuments = normalizedIncomingDocuments.length
    ? getReplacedTypedDocuments(currentTypedDocuments, normalizedIncomingDocuments)
    : [];

  const documentCompletion = validateDocumentCompleteness(nextTypedDocumentsForValidation);
  if (!documentCompletion.isComplete) {
    throw httpError(400, `Missing required documents: ${documentCompletion.missing.join(", ")}`);
  }

  const nextStatus = "SOUMIS";
  const currentStatus = normalizeCreditApplicationStatus(currentRow.status);
  let connection = null;

  try {
    connection = await dbPool.getConnection();
    await connection.beginTransaction();

    const storedIncomingDocuments = normalizedIncomingDocuments.length
      ? await insertCreditApplicationDocumentRows(connection, normalizedApplicationId, documents)
      : [];
    const mergedTypedDocuments = storedIncomingDocuments.length
      ? mergeTypedDocuments(currentTypedDocuments, storedIncomingDocuments)
      : currentTypedDocuments;

    await deleteCreditApplicationDocumentRows(connection, replacedDocuments);

    await connection.execute(
      `
      UPDATE ${CREDIT_APPLICATION_TABLE}
      SET property_id = ?,
          full_name = ?,
          email = ?,
          phone = ?,
          cin = ?,
          rib = ?,
          funding_type = ?,
          socio_category = ?,
          property_title_snapshot = ?,
          property_location_snapshot = ?,
          property_price_value = ?,
          property_price_raw = ?,
          requested_amount = ?,
          personal_contribution_value = ?,
          gross_income_value = ?,
          income_period = ?,
          scoring_annual_income = ?,
          scoring_annual_charges = ?,
          family_situation = ?,
          contract_type = ?,
          other_monthly_charges = ?,
          duration_months = ?,
          estimated_monthly_payment = ?,
          estimated_rate = ?,
          debt_ratio = ?,
          status = ?,
          compliance_score = NULL,
          compliance_summary = NULL,
          decision_motif = NULL,
          client_notified_at = NULL,
          reviewed_at = NULL,
          document_names_json = ?,
          documents_json = ?
      WHERE id = ?
      `,
      [
        normalizedPropertyId,
        normalizedFullName,
        normalizedEmail,
        normalizedPhone,
        normalizedCin,
        normalizedRib,
        normalizedFundingType,
        normalizedSocioCategory,
        normalizedPropertyTitle,
        normalizedPropertyLocation,
        normalizedPropertyPriceValue,
        normalizedPropertyPriceRaw,
        normalizedRequestedAmount,
        normalizedPersonalContribution,
        normalizedGrossIncome,
        normalizedIncomePeriod,
        normalizedScoringAnnualIncome,
        normalizedScoringAnnualCharges,
        normalizedFamilySituation,
        normalizedContractType,
        normalizedOtherMonthlyCharges,
        normalizedDurationMonths,
        normalizedEstimatedMonthlyPayment,
        normalizedEstimatedRate,
        normalizedDebtRatio,
        nextStatus,
        serializeDocumentNames(mergedTypedDocuments),
        serializeTypedDocuments(mergedTypedDocuments),
        normalizedApplicationId,
      ]
    );

    await appendCreditApplicationHistory(connection, {
      applicationId: normalizedApplicationId,
      action: "client_updated",
      previousStatus: currentStatus,
      nextStatus,
      comment: normalizedIncomingDocuments.length
        ? `Demande modifiee par le client. Documents remplaces: ${normalizedIncomingDocuments
            .map((document) => document.type)
            .join(", ")}`
        : "Demande modifiee par le client.",
      agentUserId: null,
    });

    await connection.commit();

    const updatedRow = await findCreditApplicationRowById(normalizedApplicationId);
    return {
      application: toPublicCreditApplication(updatedRow),
      replacedDocuments: [],
    };
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export async function fetchClientCreditApplications({ clientUserId, limit = 20 } = {}) {
  const normalizedClientUserId = Number(clientUserId);

  if (!normalizedClientUserId) {
    throw httpError(401, "Invalid client session");
  }

  const boundedLimit = toBoundedLimit(limit, 20, 200);

  const [rows] = await dbPool.execute(
    `
    SELECT
      ${CREDIT_APPLICATION_SELECT_COLUMNS}
    FROM ${CREDIT_APPLICATION_TABLE} ca
    LEFT JOIN users client ON client.id = ca.client_id
    LEFT JOIN users agent ON agent.id = ca.assigned_agent_user_id
    LEFT JOIN ${PROPERTY_TABLE} p ON p.id = ca.property_id
    WHERE ca.client_id = ?
    ORDER BY ca.created_at DESC, ca.id DESC
    LIMIT ${boundedLimit}
    `,
    [normalizedClientUserId]
  );

  return rows.map(toPublicCreditApplication);
}

export async function fetchAgentCreditApplications({
  limit = 150,
  status = "all",
  search = "",
} = {}) {
  const boundedLimit = toBoundedLimit(limit, 150, MAX_AGENT_APPLICATIONS_LIMIT);
  const normalizedStatus = String(status || "all").trim();
  const normalizedSearch = String(search || "").trim();
  const whereClauses = [];
  const params = [];

  if (normalizedStatus && normalizedStatus.toLowerCase() !== "all") {
    const nextStatus = normalizeCreditApplicationStatus(normalizedStatus);
    assertValidCreditApplicationStatus(nextStatus);
    whereClauses.push("ca.status = ?");
    params.push(nextStatus);
  }

  if (normalizedSearch) {
    const likeValue = `%${normalizedSearch}%`;
    whereClauses.push(`
      (
        CAST(ca.id AS CHAR) LIKE ?
        OR ca.full_name LIKE ?
        OR ca.email LIKE ?
        OR ca.phone LIKE ?
        OR ca.cin LIKE ?
        OR ca.rib LIKE ?
        OR client.name LIKE ?
        OR client.email LIKE ?
        OR COALESCE(NULLIF(p.manual_title, ''), NULLIF(p.title, ''), ca.property_title_snapshot) LIKE ?
        OR COALESCE(
          NULLIF(p.manual_location_raw, ''),
          NULLIF(p.location_raw, ''),
          NULLIF(p.city, ''),
          ca.property_location_snapshot
        ) LIKE ?
        OR ca.property_title_snapshot LIKE ?
        OR ca.property_location_snapshot LIKE ?
        OR ca.funding_type LIKE ?
        OR ca.socio_category LIKE ?
        OR CAST(ca.requested_amount AS CHAR) LIKE ?
      )
    `);
    params.push(
      likeValue,
      likeValue,
      likeValue,
      likeValue,
      likeValue,
      likeValue,
      likeValue,
      likeValue,
      likeValue,
      likeValue,
      likeValue,
      likeValue,
      likeValue,
      likeValue,
      likeValue
    );
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const [rows] = await dbPool.execute(
    `
    SELECT
      ${CREDIT_APPLICATION_SELECT_COLUMNS}
    FROM ${CREDIT_APPLICATION_TABLE} ca
    LEFT JOIN users client ON client.id = ca.client_id
    LEFT JOIN users agent ON agent.id = ca.assigned_agent_user_id
    LEFT JOIN ${PROPERTY_TABLE} p ON p.id = ca.property_id
    ${whereSql}
    ORDER BY
      CASE ca.status
        WHEN 'SOUMIS' THEN 0
        WHEN 'EN_VERIFICATION' THEN 1
        WHEN 'DOCUMENTS_MANQUANTS' THEN 2
        WHEN 'EN_ETUDE' THEN 3
        WHEN 'ACCEPTE' THEN 4
        WHEN 'REFUSE' THEN 5
        ELSE 6
      END,
      ca.created_at DESC,
      ca.id DESC
    LIMIT ${boundedLimit}
    `,
    params
  );

  return rows.map(toPublicCreditApplication);
}

export async function fetchAgentCreditApplicationSummary() {
  const [[row]] = await dbPool.query(
    `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'SOUMIS' THEN 1 ELSE 0 END) AS SOUMIS,
      SUM(CASE WHEN status = 'EN_VERIFICATION' THEN 1 ELSE 0 END) AS EN_VERIFICATION,
      SUM(CASE WHEN status = 'DOCUMENTS_MANQUANTS' THEN 1 ELSE 0 END) AS DOCUMENTS_MANQUANTS,
      SUM(CASE WHEN status = 'EN_ETUDE' THEN 1 ELSE 0 END) AS EN_ETUDE,
      SUM(CASE WHEN status = 'ACCEPTE' THEN 1 ELSE 0 END) AS ACCEPTE,
      SUM(CASE WHEN status = 'REFUSE' THEN 1 ELSE 0 END) AS REFUSE,
      ROUND(AVG(compliance_score), 0) AS average_compliance_score
    FROM ${CREDIT_APPLICATION_TABLE}
    `
  );

  return {
    total: Number(row?.total || 0),
    SOUMIS: Number(row?.SOUMIS || 0),
    EN_VERIFICATION: Number(row?.EN_VERIFICATION || 0),
    DOCUMENTS_MANQUANTS: Number(row?.DOCUMENTS_MANQUANTS || 0),
    EN_ETUDE: Number(row?.EN_ETUDE || 0),
    ACCEPTE: Number(row?.ACCEPTE || 0),
    REFUSE: Number(row?.REFUSE || 0),
    average_compliance_score: normalizeOptionalInteger(row?.average_compliance_score) || 0,
  };
}

export async function fetchCreditApplicationById(applicationId) {
  const normalizedApplicationId = Number(applicationId);

  if (!normalizedApplicationId) {
    throw httpError(400, "Invalid credit application id");
  }

  const row = await findCreditApplicationRowById(normalizedApplicationId);

  if (!row) {
    throw httpError(404, "Credit application not found");
  }

  return toPublicCreditApplication(row);
}

export async function updateCreditApplicationScoring(
  applicationId,
  { scoringResult, agentUserId, nextStatus }
) {
  const normalizedApplicationId = Number(applicationId);
  const normalizedAgentUserId = Number(agentUserId);

  if (!normalizedApplicationId) {
    throw httpError(400, "Invalid credit application id");
  }

  if (!normalizedAgentUserId) {
    throw httpError(401, "Invalid agent session");
  }

  const currentRow = await findCreditApplicationRowById(normalizedApplicationId);

  if (!currentRow) {
    throw httpError(404, "Credit application not found");
  }

  const scoringRequest = scoringResult?.scoring_request_data || {};
  const fallbackStatus = "EN_ETUDE";
  const normalizedNextStatus = normalizeCreditApplicationStatus(
    nextStatus || fallbackStatus
  );
  const currentStatus = normalizeCreditApplicationStatus(currentRow.status);
  assertValidCreditApplicationStatus(normalizedNextStatus);
  assertStatusTransition(currentStatus, normalizedNextStatus);

  const reviewedAtValue = new Date().toISOString().slice(0, 19).replace("T", " ");
  const complianceSummary = normalizeOptionalString(
    scoringResult?.complianceSummary || scoringResult?.summary || scoringResult?.resume
  );
  const nextComplianceScore = normalizeOptionalInteger(scoringResult?.score);
  const decisionMotif = isDecisionStatus(normalizedNextStatus)
    ? buildDecisionMotif(normalizedNextStatus, {
        complianceSummary,
        complianceScore: nextComplianceScore,
      })
    : currentRow.decision_motif || null;
  const clientNotifiedAtValue = isDecisionStatus(normalizedNextStatus)
    ? reviewedAtValue
    : currentRow.client_notified_at || null;
  let connection = null;

  try {
    connection = await dbPool.getConnection();
    await connection.beginTransaction();

    await connection.execute(
      `
      UPDATE ${CREDIT_APPLICATION_TABLE}
      SET status = ?,
          compliance_score = ?,
          compliance_summary = ?,
          scoring_annual_income = ?,
          scoring_annual_charges = ?,
          family_situation = ?,
          contract_type = ?,
          decision_motif = ?,
          client_notified_at = ?,
          assigned_agent_user_id = ?,
          reviewed_at = ?
      WHERE id = ?
      `,
      [
        normalizedNextStatus,
        nextComplianceScore,
        complianceSummary,
        normalizeOptionalNumber(scoringRequest.revenu_annuel),
        normalizeOptionalNumber(scoringRequest.charges_impayees),
        normalizeOptionalString(scoringRequest.situation_familiale),
        normalizeOptionalString(scoringRequest.situation_contractuelle),
        decisionMotif,
        clientNotifiedAtValue,
        normalizedAgentUserId,
        reviewedAtValue,
        normalizedApplicationId,
      ]
    );

    await appendCreditApplicationHistory(connection, {
      applicationId: normalizedApplicationId,
      action: "scoring_requested",
      previousStatus: currentStatus,
      nextStatus: normalizedNextStatus,
      comment: decisionMotif || complianceSummary || "Dossier transmis à l'agent de scoring.",
      agentUserId: normalizedAgentUserId,
    });

    await connection.commit();

    const updatedRow = await findCreditApplicationRowById(normalizedApplicationId);
    return toPublicCreditApplication(updatedRow);
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export async function updateCreditApplicationReview(
  applicationId,
  { status, complianceScore, complianceSummary, agentNote, agentUserId }
) {
  const normalizedApplicationId = Number(applicationId);
  const normalizedAgentUserId = Number(agentUserId);

  if (!normalizedApplicationId) {
    throw httpError(400, "Invalid credit application id");
  }

  if (!normalizedAgentUserId) {
    throw httpError(401, "Invalid agent session");
  }

  const currentRow = await findCreditApplicationRowById(normalizedApplicationId);

  if (!currentRow) {
    throw httpError(404, "Credit application not found");
  }

  const currentStatus = normalizeCreditApplicationStatus(currentRow.status);
  const nextStatus = status ? normalizeCreditApplicationStatus(status) : currentStatus;
  assertValidCreditApplicationStatus(nextStatus);
  assertStatusTransition(currentStatus, nextStatus);

  const nextComplianceScore =
    complianceScore === undefined
      ? normalizeOptionalInteger(currentRow.compliance_score)
      : normalizeOptionalInteger(complianceScore);
  const nextComplianceSummary =
    complianceSummary === undefined
      ? currentRow.compliance_summary
      : normalizeOptionalString(complianceSummary);
  const nextAgentNote =
    agentNote === undefined ? currentRow.agent_note : normalizeOptionalString(agentNote);
  const currentComplianceScore = normalizeOptionalInteger(currentRow.compliance_score);
  const nextDecisionMotif = isDecisionStatus(nextStatus)
    ? buildDecisionMotif(nextStatus, {
        agentNote: nextAgentNote,
        complianceSummary: nextComplianceSummary,
        complianceScore: nextComplianceScore,
      })
    : currentRow.decision_motif || null;

  const hasAnyChange =
    nextStatus !== currentStatus ||
    nextComplianceScore !== currentComplianceScore ||
    nextComplianceSummary !== currentRow.compliance_summary ||
    nextAgentNote !== currentRow.agent_note ||
    nextDecisionMotif !== currentRow.decision_motif ||
    Number(currentRow.assigned_agent_user_id || 0) !== normalizedAgentUserId;

  if (!hasAnyChange) {
    return toPublicCreditApplication(currentRow);
  }

  const reviewedAtValue = new Date().toISOString().slice(0, 19).replace("T", " ");
  const clientNotifiedAtValue = isDecisionStatus(nextStatus)
    ? reviewedAtValue
    : currentRow.client_notified_at || null;
  let connection = null;

  try {
    connection = await dbPool.getConnection();
    await connection.beginTransaction();

    await connection.execute(
      `
      UPDATE ${CREDIT_APPLICATION_TABLE}
      SET status = ?,
          compliance_score = ?,
          compliance_summary = ?,
          agent_note = ?,
          decision_motif = ?,
          client_notified_at = ?,
          assigned_agent_user_id = ?,
          reviewed_at = ?
      WHERE id = ?
      `,
      [
        nextStatus,
        nextComplianceScore,
        nextComplianceSummary,
        nextAgentNote,
        nextDecisionMotif,
        clientNotifiedAtValue,
        normalizedAgentUserId,
        reviewedAtValue,
        normalizedApplicationId,
      ]
    );

    const historyComment = [nextDecisionMotif, nextComplianceSummary, nextAgentNote]
      .filter(Boolean)
      .join(" | ") || null;

    await appendCreditApplicationHistory(connection, {
      applicationId: normalizedApplicationId,
      action: nextStatus !== currentStatus ? "status_updated" : "review_updated",
      previousStatus: currentStatus,
      nextStatus,
      comment: historyComment,
      agentUserId: normalizedAgentUserId,
    });

    await connection.commit();

    const updatedRow = await findCreditApplicationRowById(normalizedApplicationId);
    return toPublicCreditApplication(updatedRow);
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
