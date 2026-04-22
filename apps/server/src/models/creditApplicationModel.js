import { dbPool } from "../config/db.js";
import { httpError } from "../utils/httpError.js";

const CREDIT_APPLICATION_TABLE = "credit_applications";
const CREDIT_APPLICATION_HISTORY_TABLE = "credit_application_history";
const PROPERTY_TABLE = "clean_listings";
const MAX_AGENT_APPLICATIONS_LIMIT = Number(process.env.AGENT_CREDIT_APPLICATIONS_MAX_LIMIT || 500);

const CREDIT_APPLICATION_STATUSES = new Set([
  "submitted",
  "under_review",
  "documents_pending",
  "approved",
  "rejected",
]);

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

function normalizeOptionalNumber(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) ? normalizedValue : null;
}

function normalizeOptionalInteger(value) {
  const normalizedValue = normalizeOptionalNumber(value);
  return normalizedValue === null || normalizedValue === undefined
    ? normalizedValue
    : Math.trunc(normalizedValue);
}

function normalizeDocumentNames(documents) {
  if (!Array.isArray(documents)) {
    return [];
  }

  return documents
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 40);
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

function toPublicCreditApplication(row) {
  if (!row) return null;

  const propertyPriceValue =
    normalizeOptionalNumber(row.live_property_price_value) ??
    normalizeOptionalNumber(row.property_price_value);
  const complianceScore = normalizeOptionalInteger(row.compliance_score);
  const documents = parseDocumentNames(row.document_names_json);

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
    duration_months: normalizeOptionalInteger(row.duration_months),
    estimated_monthly_payment: normalizeOptionalNumber(row.estimated_monthly_payment),
    estimated_rate: normalizeOptionalNumber(row.estimated_rate),
    debt_ratio: normalizeOptionalNumber(row.debt_ratio),
    status: row.status,
    compliance_score: complianceScore,
    compliance_level: getComplianceLevel(complianceScore),
    compliance_summary: row.compliance_summary,
    agent_note: row.agent_note,
    documents,
    document_count: documents.length,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
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
      duration_months INT NULL,
      estimated_monthly_payment DECIMAL(14, 2) NULL,
      estimated_rate DECIMAL(8, 3) NULL,
      debt_ratio DECIMAL(6, 2) NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'submitted',
      compliance_score TINYINT UNSIGNED NULL,
      compliance_summary TEXT NULL,
      agent_note TEXT NULL,
      document_names_json LONGTEXT NULL,
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
  ca.duration_months,
  ca.estimated_monthly_payment,
  ca.estimated_rate,
  ca.debt_ratio,
  ca.status,
  ca.compliance_score,
  ca.compliance_summary,
  ca.agent_note,
  ca.document_names_json,
  ca.reviewed_at,
  ca.created_at,
  ca.updated_at,
  client.name AS client_name,
  client.email AS client_account_email,
  agent.name AS assigned_agent_name,
  COALESCE(p.manual_title, p.title, ca.property_title_snapshot) AS property_title,
  COALESCE(p.manual_location_raw, p.location_raw, p.city, ca.property_location_snapshot) AS property_location,
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
  if (!CREDIT_APPLICATION_STATUSES.has(status)) {
    throw httpError(400, `Invalid credit application status: ${status}`);
  }
}

function assertStatusTransition(currentStatus, nextStatus) {
  const transitions = {
    submitted: new Set(["under_review", "documents_pending", "approved", "rejected"]),
    under_review: new Set(["documents_pending", "approved", "rejected"]),
    documents_pending: new Set(["under_review", "approved", "rejected"]),
    approved: new Set([]),
    rejected: new Set([]),
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
  durationMonths,
  estimatedMonthlyPayment,
  estimatedRate,
  debtRatio,
  documents,
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
  const normalizedDurationMonths = normalizeOptionalInteger(durationMonths);
  const normalizedEstimatedMonthlyPayment = normalizeOptionalNumber(estimatedMonthlyPayment);
  const normalizedEstimatedRate = normalizeOptionalNumber(estimatedRate);
  const normalizedDebtRatio = normalizeOptionalNumber(debtRatio);
  const normalizedDocuments = normalizeDocumentNames(documents);

  if (!normalizedClientUserId) {
    throw httpError(401, "Invalid client session");
  }

  if (!normalizedFullName || !normalizedEmail || !normalizedPhone || !normalizedCin || !normalizedRib) {
    throw httpError(400, "Missing required credit application fields");
  }

  let propertySnapshot = null;

  if (normalizedPropertyId) {
    propertySnapshot = await findPropertySnapshotById(normalizedPropertyId);

    if (!propertySnapshot) {
      throw httpError(404, "Selected property not found");
    }
  }

  const connection = await dbPool.getConnection();

  try {
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
        duration_months,
        estimated_monthly_payment,
        estimated_rate,
        debt_ratio,
        status,
        document_names_json
      )
      VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?)
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
        normalizedDurationMonths,
        normalizedEstimatedMonthlyPayment,
        normalizedEstimatedRate,
        normalizedDebtRatio,
        serializeDocumentNames(normalizedDocuments),
      ]
    );

    await appendCreditApplicationHistory(connection, {
      applicationId: result.insertId,
      action: "created",
      previousStatus: null,
      nextStatus: "submitted",
      comment: normalizedDocuments.length
        ? `Documents fournis: ${normalizedDocuments.join(", ")}`
        : "Application created",
      agentUserId: null,
    });

    await connection.commit();

    const row = await findCreditApplicationRowById(result.insertId);
    return toPublicCreditApplication(row);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
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
  const normalizedStatus = String(status || "all").trim().toLowerCase();
  const normalizedSearch = String(search || "").trim();
  const whereClauses = [];
  const params = [];

  if (normalizedStatus && normalizedStatus !== "all") {
    assertValidCreditApplicationStatus(normalizedStatus);
    whereClauses.push("ca.status = ?");
    params.push(normalizedStatus);
  }

  if (normalizedSearch) {
    const likeValue = `%${normalizedSearch}%`;
    whereClauses.push(`
      (
        ca.full_name LIKE ?
        OR ca.email LIKE ?
        OR ca.phone LIKE ?
        OR ca.cin LIKE ?
        OR COALESCE(p.manual_title, p.title, ca.property_title_snapshot) LIKE ?
      )
    `);
    params.push(likeValue, likeValue, likeValue, likeValue, likeValue);
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
        WHEN 'submitted' THEN 0
        WHEN 'under_review' THEN 1
        WHEN 'documents_pending' THEN 2
        WHEN 'approved' THEN 3
        WHEN 'rejected' THEN 4
        ELSE 5
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
      SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) AS submitted,
      SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) AS under_review,
      SUM(CASE WHEN status = 'documents_pending' THEN 1 ELSE 0 END) AS documents_pending,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
      ROUND(AVG(compliance_score), 0) AS average_compliance_score
    FROM ${CREDIT_APPLICATION_TABLE}
    `
  );

  return {
    total: Number(row?.total || 0),
    submitted: Number(row?.submitted || 0),
    under_review: Number(row?.under_review || 0),
    documents_pending: Number(row?.documents_pending || 0),
    approved: Number(row?.approved || 0),
    rejected: Number(row?.rejected || 0),
    average_compliance_score: normalizeOptionalInteger(row?.average_compliance_score) || 0,
  };
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

  const nextStatus = status ? String(status).trim().toLowerCase() : currentRow.status;
  assertValidCreditApplicationStatus(nextStatus);
  assertStatusTransition(currentRow.status, nextStatus);

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

  const hasAnyChange =
    nextStatus !== currentRow.status ||
    nextComplianceScore !== currentComplianceScore ||
    nextComplianceSummary !== currentRow.compliance_summary ||
    nextAgentNote !== currentRow.agent_note ||
    Number(currentRow.assigned_agent_user_id || 0) !== normalizedAgentUserId;

  if (!hasAnyChange) {
    return toPublicCreditApplication(currentRow);
  }

  const reviewedAtValue = new Date().toISOString().slice(0, 19).replace("T", " ");
  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      `
      UPDATE ${CREDIT_APPLICATION_TABLE}
      SET status = ?,
          compliance_score = ?,
          compliance_summary = ?,
          agent_note = ?,
          assigned_agent_user_id = ?,
          reviewed_at = ?
      WHERE id = ?
      `,
      [
        nextStatus,
        nextComplianceScore,
        nextComplianceSummary,
        nextAgentNote,
        normalizedAgentUserId,
        reviewedAtValue,
        normalizedApplicationId,
      ]
    );

    const historyComment = [nextComplianceSummary, nextAgentNote].filter(Boolean).join(" | ") || null;

    await appendCreditApplicationHistory(connection, {
      applicationId: normalizedApplicationId,
      action: nextStatus !== currentRow.status ? "status_updated" : "review_updated",
      previousStatus: currentRow.status,
      nextStatus,
      comment: historyComment,
      agentUserId: normalizedAgentUserId,
    });

    await connection.commit();

    const updatedRow = await findCreditApplicationRowById(normalizedApplicationId);
    return toPublicCreditApplication(updatedRow);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
