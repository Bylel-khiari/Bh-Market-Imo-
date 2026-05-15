import { dbPool } from "../config/db.js";
import { fetchClientActivityDashboard } from "./clientActivityLogModel.js";

const DEFAULT_MONTH_WINDOW = 12;
const DEFAULT_ROLE_TOTALS = {
  client: 0,
  agent_bancaire: 0,
  admin: 0,
};
const DEFAULT_REPORT_TOTALS = {
  NON_LU: 0,
  EN_COURS: 0,
  RESOLU: 0,
  REJETE: 0,
};
const DEFAULT_CREDIT_STATUS_TOTALS = {
  SOUMIS: 0,
  EN_VERIFICATION: 0,
  DOCUMENTS_MANQUANTS: 0,
  EN_ETUDE: 0,
  ACCEPTE: 0,
  REFUSE: 0,
};

function toCount(value) {
  return Number(value || 0);
}

function formatRoleLabel(role) {
  if (role === "client") return "Clients";
  if (role === "agent_bancaire") return "Agents bancaires";
  if (role === "admin") return "Admins";
  return role || "Inconnu";
}

function formatReportStatusLabel(status) {
  if (status === "NON_LU") return "Nouvelles";
  if (status === "EN_COURS") return "En cours";
  if (status === "RESOLU") return "Resolues";
  if (status === "REJETE") return "Rejetees";
  return status || "Inconnu";
}

function formatCreditStatusLabel(status) {
  if (status === "SOUMIS") return "Soumis";
  if (status === "EN_VERIFICATION") return "En verification";
  if (status === "DOCUMENTS_MANQUANTS") return "Pieces manquantes";
  if (status === "EN_ETUDE") return "En etude";
  if (status === "ACCEPTE") return "Acceptes";
  if (status === "REFUSE") return "Refuses";
  return status || "Inconnu";
}

function getRecentMonthKeys(monthCount = DEFAULT_MONTH_WINDOW) {
  const cursor = new Date();
  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();
  const keys = [];

  for (let index = monthCount - 1; index >= 0; index -= 1) {
    const itemDate = new Date(Date.UTC(year, month - index, 1));
    const monthKey = `${itemDate.getUTCFullYear()}-${String(itemDate.getUTCMonth() + 1).padStart(2, "0")}`;
    keys.push(monthKey);
  }

  return keys;
}

function buildCountMap(rows = []) {
  return rows.reduce((acc, row) => {
    if (row?.month) {
      acc.set(row.month, toCount(row.total));
    }

    return acc;
  }, new Map());
}

function buildMonthlyActivity(monthKeys, userRows, propertyRows, reportRows, creditRows) {
  const userMap = buildCountMap(userRows);
  const propertyMap = buildCountMap(propertyRows);
  const reportMap = buildCountMap(reportRows);
  const creditMap = buildCountMap(creditRows);

  return monthKeys.map((month) => ({
    month,
    users: userMap.get(month) || 0,
    properties: propertyMap.get(month) || 0,
    requests: reportMap.get(month) || 0,
    credit_applications: creditMap.get(month) || 0,
  }));
}

export async function fetchAgentProfile(userId) {
  const [rows] = await dbPool.execute(
    `
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      ap.matricule,
      u.created_at
    FROM users u
    LEFT JOIN agent_profiles ap ON ap.user_id = u.id
    WHERE u.id = ?
    LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
}

export async function fetchAgentDashboardSummary() {
  const monthKeys = getRecentMonthKeys(DEFAULT_MONTH_WINDOW);
  const fromMonthStart = `${monthKeys[0]}-01`;

  const [
    [roleRows],
    [[propertyRow]],
    [[reportRow]],
    [[creditApplicationRow]],
    [reportStatusRows],
    [creditStatusRows],
    [topCityRows],
    [topSourceRows],
    [userTrendRows],
    [propertyTrendRows],
    [reportTrendRows],
    [creditTrendRows],
    [latestUserRows],
    [latestRequestRows],
    [latestCreditApplicationRows],
    clientActivity,
  ] = await Promise.all([
    dbPool.query("SELECT role, COUNT(*) AS total FROM users GROUP BY role"),
    dbPool.query(`
      SELECT
        COUNT(*) AS total_properties,
        SUM(CASE WHEN COALESCE(is_active, 1) = 1 THEN 1 ELSE 0 END) AS active_properties,
        SUM(CASE WHEN COALESCE(is_active, 1) = 0 THEN 1 ELSE 0 END) AS inactive_properties
      FROM properties
      WHERE COALESCE(is_deleted, 0) = 0
    `),
    dbPool.query("SELECT COUNT(*) AS total_reports FROM reclamations"),
    dbPool.query(`
      SELECT
        COUNT(*) AS total_credit_applications,
        SUM(CASE WHEN status IN ('SOUMIS', 'EN_VERIFICATION', 'DOCUMENTS_MANQUANTS', 'EN_ETUDE') THEN 1 ELSE 0 END)
          AS pending_credit_applications,
        SUM(CASE WHEN status = 'ACCEPTE' THEN 1 ELSE 0 END) AS accepted_credit_applications,
        SUM(CASE WHEN status = 'REFUSE' THEN 1 ELSE 0 END) AS refused_credit_applications,
        ROUND(AVG(compliance_score), 0) AS average_compliance_score
      FROM credit_applications
    `),
    dbPool.query("SELECT statut AS status, COUNT(*) AS total FROM reclamations GROUP BY statut"),
    dbPool.query("SELECT status, COUNT(*) AS total FROM credit_applications GROUP BY status"),
    dbPool.query(`
      SELECT
        COALESCE(NULLIF(COALESCE(manual_city, city), ''), 'Non renseignee') AS city,
        COUNT(*) AS total
      FROM properties
      WHERE COALESCE(is_deleted, 0) = 0
      GROUP BY COALESCE(NULLIF(COALESCE(manual_city, city), ''), 'Non renseignee')
      ORDER BY total DESC, city ASC
      LIMIT 6
    `),
    dbPool.query(`
      SELECT
        COALESCE(NULLIF(COALESCE(manual_source, source), ''), 'Inconnue') AS source,
        COUNT(*) AS total
      FROM properties
      WHERE COALESCE(is_deleted, 0) = 0
      GROUP BY COALESCE(NULLIF(COALESCE(manual_source, source), ''), 'Inconnue')
      ORDER BY total DESC, source ASC
      LIMIT 6
    `),
    dbPool.query(
      `
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS total
      FROM users
      WHERE created_at >= ?
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
      `,
      [fromMonthStart]
    ),
    dbPool.query(
      `
      SELECT DATE_FORMAT(COALESCE(admin_updated_at, manual_scraped_at, scraped_at, created_at), '%Y-%m') AS month, COUNT(*) AS total
      FROM properties
      WHERE COALESCE(is_deleted, 0) = 0
        AND COALESCE(admin_updated_at, manual_scraped_at, scraped_at, created_at) >= ?
      GROUP BY DATE_FORMAT(COALESCE(admin_updated_at, manual_scraped_at, scraped_at, created_at), '%Y-%m')
      ORDER BY month ASC
      `,
      [fromMonthStart]
    ),
    dbPool.query(
      `
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS total
      FROM reclamations
      WHERE created_at >= ?
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
      `,
      [fromMonthStart]
    ),
    dbPool.query(
      `
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS total
      FROM credit_applications
      WHERE created_at >= ?
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
      `,
      [fromMonthStart]
    ),
    dbPool.query(`
      SELECT id, name, email, role, created_at
      FROM users
      WHERE role IN ('client', 'agent_bancaire', 'admin')
      ORDER BY created_at DESC, id DESC
      LIMIT 6
    `),
    dbPool.query(`
      SELECT
        r.id,
        reporter.name AS client_name,
        reporter.email AS client_email,
        r.type,
        r.statut AS status,
        r.priorite AS priority,
        r.created_at
      FROM reclamations r
      LEFT JOIN users reporter ON reporter.id = r.client_id
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT 6
    `),
    dbPool.query(`
      SELECT
        id,
        full_name,
        email,
        status,
        compliance_score,
        created_at
      FROM credit_applications
      ORDER BY created_at DESC, id DESC
      LIMIT 6
    `),
    fetchClientActivityDashboard({ monthCount: DEFAULT_MONTH_WINDOW, limit: 8 }),
  ]);

  const roleTotals = roleRows.reduce(
    (acc, row) => {
      const role = row?.role;
      if (role && Object.prototype.hasOwnProperty.call(acc, role)) {
        acc[role] = toCount(row.total);
      }

      return acc;
    },
    { ...DEFAULT_ROLE_TOTALS }
  );

  const reportStatusTotals = reportStatusRows.reduce(
    (acc, row) => {
      const status = row?.status;
      if (status) {
        acc[status] = toCount(row.total);
      }

      return acc;
    },
    { ...DEFAULT_REPORT_TOTALS }
  );
  const creditStatusTotals = creditStatusRows.reduce(
    (acc, row) => {
      const status = row?.status;
      if (status) {
        acc[status] = toCount(row.total);
      }

      return acc;
    },
    { ...DEFAULT_CREDIT_STATUS_TOTALS }
  );

  const totalReports = toCount(reportRow?.total_reports);
  const closedReports = reportStatusTotals.RESOLU + reportStatusTotals.REJETE;
  const totalCreditApplications = toCount(creditApplicationRow?.total_credit_applications);
  const pendingCreditApplications = toCount(creditApplicationRow?.pending_credit_applications);
  const acceptedCreditApplications = toCount(creditApplicationRow?.accepted_credit_applications);
  const refusedCreditApplications = toCount(creditApplicationRow?.refused_credit_applications);
  const averageComplianceScore = toCount(creditApplicationRow?.average_compliance_score);
  const creditRequestStarts = toCount(clientActivity?.summary?.credit_request_starts);
  const creditApprovalRate =
    totalCreditApplications > 0
      ? Math.round((acceptedCreditApplications / totalCreditApplications) * 100)
      : 0;
  const creditSubmitConversionRate =
    creditRequestStarts > 0
      ? Math.round((totalCreditApplications / creditRequestStarts) * 100)
      : 0;
  const monthlyActivity = buildMonthlyActivity(
    monthKeys,
    userTrendRows,
    propertyTrendRows,
    reportTrendRows,
    creditTrendRows
  );

  return {
    summary: {
      total_users: Object.values(roleTotals).reduce((sum, value) => sum + value, 0),
      total_clients: roleTotals.client,
      total_agents: roleTotals.agent_bancaire,
      total_admins: roleTotals.admin,
      total_properties: toCount(propertyRow?.total_properties),
      active_properties: toCount(propertyRow?.active_properties),
      inactive_properties: toCount(propertyRow?.inactive_properties),
      total_reports: totalReports,
      unread_reports: reportStatusTotals.NON_LU,
      in_review_reports: reportStatusTotals.EN_COURS,
      resolved_reports: reportStatusTotals.RESOLU,
      rejected_reports: reportStatusTotals.REJETE,
      closed_reports: closedReports,
      resolution_rate: totalReports > 0 ? Math.round((closedReports / totalReports) * 100) : 0,
      total_credit_applications: totalCreditApplications,
      pending_credit_applications: pendingCreditApplications,
      accepted_credit_applications: acceptedCreditApplications,
      refused_credit_applications: refusedCreditApplications,
      average_compliance_score: averageComplianceScore,
      credit_approval_rate: creditApprovalRate,
      credit_submit_conversion_rate: creditSubmitConversionRate,
    },
    credit_application_summary: {
      total: totalCreditApplications,
      pending: pendingCreditApplications,
      accepted: acceptedCreditApplications,
      refused: refusedCreditApplications,
      average_compliance_score: averageComplianceScore,
      approval_rate: creditApprovalRate,
      submit_conversion_rate: creditSubmitConversionRate,
    },
    role_distribution: [
      { key: "client", label: formatRoleLabel("client"), value: roleTotals.client },
      { key: "agent_bancaire", label: formatRoleLabel("agent_bancaire"), value: roleTotals.agent_bancaire },
      { key: "admin", label: formatRoleLabel("admin"), value: roleTotals.admin },
    ],
    report_status_distribution: [
      { key: "NON_LU", label: formatReportStatusLabel("NON_LU"), value: reportStatusTotals.NON_LU },
      { key: "EN_COURS", label: formatReportStatusLabel("EN_COURS"), value: reportStatusTotals.EN_COURS },
      { key: "RESOLU", label: formatReportStatusLabel("RESOLU"), value: reportStatusTotals.RESOLU },
      { key: "REJETE", label: formatReportStatusLabel("REJETE"), value: reportStatusTotals.REJETE },
    ],
    credit_application_status_distribution: [
      { key: "SOUMIS", label: formatCreditStatusLabel("SOUMIS"), value: creditStatusTotals.SOUMIS },
      { key: "EN_VERIFICATION", label: formatCreditStatusLabel("EN_VERIFICATION"), value: creditStatusTotals.EN_VERIFICATION },
      { key: "DOCUMENTS_MANQUANTS", label: formatCreditStatusLabel("DOCUMENTS_MANQUANTS"), value: creditStatusTotals.DOCUMENTS_MANQUANTS },
      { key: "EN_ETUDE", label: formatCreditStatusLabel("EN_ETUDE"), value: creditStatusTotals.EN_ETUDE },
      { key: "ACCEPTE", label: formatCreditStatusLabel("ACCEPTE"), value: creditStatusTotals.ACCEPTE },
      { key: "REFUSE", label: formatCreditStatusLabel("REFUSE"), value: creditStatusTotals.REFUSE },
    ],
    monthly_activity: monthlyActivity,
    top_cities: topCityRows.map((row) => ({
      city: row.city,
      total: toCount(row.total),
    })),
    top_sources: topSourceRows.map((row) => ({
      source: row.source,
      total: toCount(row.total),
    })),
    latest_users: latestUserRows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      role_label: formatRoleLabel(row.role),
      created_at: row.created_at,
    })),
    latest_requests: latestRequestRows.map((row) => ({
      id: row.id,
      client_name: row.client_name,
      client_email: row.client_email,
      type: row.type,
      status: row.status,
      status_label: formatReportStatusLabel(row.status),
      priority: row.priority,
      created_at: row.created_at,
    })),
    latest_credit_applications: latestCreditApplicationRows.map((row) => ({
      id: row.id,
      full_name: row.full_name,
      email: row.email,
      status: row.status,
      status_label: formatCreditStatusLabel(row.status),
      compliance_score: row.compliance_score,
      created_at: row.created_at,
    })),
    client_activity: clientActivity,
  };
}
