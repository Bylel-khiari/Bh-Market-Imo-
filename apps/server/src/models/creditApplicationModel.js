import { dbPool } from "../config/db.js";
import { httpError } from "../utils/httpError.js";
import { validateDocumentCompleteness, isValidDocumentType } from "../utils/documentTypes.js";

const CREDIT_APPLICATION_TABLE = "credit_applications";
const CREDIT_APPLICATION_HISTORY_TABLE = "credit_application_history";
const PROPERTY_TABLE = "properties";
const MAX_AGENT_APPLICATIONS_LIMIT = Number(process.env.AGENT_CREDIT_APPLICATIONS_MAX_LIMIT || 500);

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

function normalizeOptionalNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) ? normalizedValue : null;
}

function normalizeOptionalInteger(value) {
  const normalizedValue = normalizeOptionalNumber(value);
  return normalizedValue === null ? null : Math.trunc(normalizedValue);
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

      if (!type || !name) {
        return null;
      }

      if (!isValidDocumentType(type)) {
        return null;
      }

      return { type, name };
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

    await appendCreditApplicationHistory(connection, {
      applicationId: result.insertId,
      action: "created",
      previousStatus: null,
      nextStatus: applicationStatus,
      comment: normalizedTypedDocuments.length
        ? `Documents fournis: ${normalizedTypedDocuments.map(d => `${d.type} (${d.name})`).join(", ")}`
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
