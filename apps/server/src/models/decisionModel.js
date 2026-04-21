import { dbPool } from "../config/db.js";

const DEFAULT_MONTH_WINDOW = 12;
const DEFAULT_ROLE_TOTALS = {
  client: 0,
  agent_bancaire: 0,
  responsable_decisionnel: 0,
  admin: 0,
};
const DEFAULT_REPORT_TOTALS = {
  NON_LU: 0,
  EN_COURS: 0,
  RESOLU: 0,
  REJETE: 0,
};

function toCount(value) {
  return Number(value || 0);
}

function formatRoleLabel(role) {
  if (role === "client") return "Clients";
  if (role === "agent_bancaire") return "Agents bancaires";
  if (role === "responsable_decisionnel") return "Responsables decisionnels";
  if (role === "admin") return "Admins";
  return role || "Inconnu";
}

function formatStatusLabel(status) {
  if (status === "NON_LU") return "Nouvelles";
  if (status === "EN_COURS") return "En cours";
  if (status === "RESOLU") return "Resolues";
  if (status === "REJETE") return "Rejetees";
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

function buildMonthlyActivity(monthKeys, userRows, propertyRows, reportRows) {
  const userMap = buildCountMap(userRows);
  const propertyMap = buildCountMap(propertyRows);
  const reportMap = buildCountMap(reportRows);

  return monthKeys.map((month) => ({
    month,
    users: userMap.get(month) || 0,
    properties: propertyMap.get(month) || 0,
    requests: reportMap.get(month) || 0,
  }));
}

export async function fetchDecisionDashboardSummary() {
  const monthKeys = getRecentMonthKeys(DEFAULT_MONTH_WINDOW);
  const fromMonthStart = `${monthKeys[0]}-01`;

  const [
    [roleRows],
    [[propertyRow]],
    [[reportRow]],
    [reportStatusRows],
    [topCityRows],
    [topSourceRows],
    [userTrendRows],
    [propertyTrendRows],
    [reportTrendRows],
    [latestUserRows],
    [latestRequestRows],
  ] = await Promise.all([
    dbPool.query("SELECT role, COUNT(*) AS total FROM users GROUP BY role"),
    dbPool.query(`
      SELECT
        COUNT(*) AS total_properties,
        SUM(CASE WHEN COALESCE(is_active, 1) = 1 THEN 1 ELSE 0 END) AS active_properties,
        SUM(CASE WHEN COALESCE(is_active, 1) = 0 THEN 1 ELSE 0 END) AS inactive_properties
      FROM clean_listings
      WHERE COALESCE(is_deleted, 0) = 0
    `),
    dbPool.query("SELECT COUNT(*) AS total_reports FROM reclamations"),
    dbPool.query("SELECT statut AS status, COUNT(*) AS total FROM reclamations GROUP BY statut"),
    dbPool.query(`
      SELECT
        COALESCE(NULLIF(COALESCE(manual_city, city), ''), 'Non renseignee') AS city,
        COUNT(*) AS total
      FROM clean_listings
      WHERE COALESCE(is_deleted, 0) = 0
      GROUP BY COALESCE(NULLIF(COALESCE(manual_city, city), ''), 'Non renseignee')
      ORDER BY total DESC, city ASC
      LIMIT 6
    `),
    dbPool.query(`
      SELECT
        COALESCE(NULLIF(COALESCE(manual_source, source), ''), 'Inconnue') AS source,
        COUNT(*) AS total
      FROM clean_listings
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
      SELECT DATE_FORMAT(COALESCE(admin_updated_at, manual_scraped_at, scraped_at), '%Y-%m') AS month, COUNT(*) AS total
      FROM clean_listings
      WHERE COALESCE(is_deleted, 0) = 0
        AND COALESCE(admin_updated_at, manual_scraped_at, scraped_at) >= ?
      GROUP BY DATE_FORMAT(COALESCE(admin_updated_at, manual_scraped_at, scraped_at), '%Y-%m')
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
    dbPool.query(`
      SELECT id, name, email, role, created_at
      FROM users
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
  ]);

  const roleTotals = roleRows.reduce(
    (acc, row) => {
      const role = row?.role;
      if (role) {
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

  const totalReports = toCount(reportRow?.total_reports);
  const closedReports = reportStatusTotals.RESOLU + reportStatusTotals.REJETE;
  const monthlyActivity = buildMonthlyActivity(
    monthKeys,
    userTrendRows,
    propertyTrendRows,
    reportTrendRows
  );

  return {
    summary: {
      total_users: Object.values(roleTotals).reduce((sum, value) => sum + value, 0),
      total_clients: roleTotals.client,
      total_agents: roleTotals.agent_bancaire,
      total_decision_makers: roleTotals.responsable_decisionnel,
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
    },
    role_distribution: [
      { key: "client", label: formatRoleLabel("client"), value: roleTotals.client },
      { key: "agent_bancaire", label: formatRoleLabel("agent_bancaire"), value: roleTotals.agent_bancaire },
      {
        key: "responsable_decisionnel",
        label: formatRoleLabel("responsable_decisionnel"),
        value: roleTotals.responsable_decisionnel,
      },
      { key: "admin", label: formatRoleLabel("admin"), value: roleTotals.admin },
    ],
    report_status_distribution: [
      { key: "NON_LU", label: formatStatusLabel("NON_LU"), value: reportStatusTotals.NON_LU },
      { key: "EN_COURS", label: formatStatusLabel("EN_COURS"), value: reportStatusTotals.EN_COURS },
      { key: "RESOLU", label: formatStatusLabel("RESOLU"), value: reportStatusTotals.RESOLU },
      { key: "REJETE", label: formatStatusLabel("REJETE"), value: reportStatusTotals.REJETE },
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
      status_label: formatStatusLabel(row.status),
      priority: row.priority,
      created_at: row.created_at,
    })),
  };
}
