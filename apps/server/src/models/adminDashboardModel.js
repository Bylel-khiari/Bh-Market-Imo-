import { dbPool } from "../config/db.js";

function toNumber(value) {
  return Number(value || 0);
}

function mapDashboardSummary({
  userRow = {},
  propertyRow = {},
  scrapeSiteRow = {},
  suggestionRow = {},
  reportRow = {},
} = {}) {
  return {
    users: {
      total: toNumber(userRow.total),
      roles: {
        client: toNumber(userRow.clients),
        agent_bancaire: toNumber(userRow.agents),
        admin: toNumber(userRow.admins),
      },
    },
    properties: {
      total: toNumber(propertyRow.total),
      active: toNumber(propertyRow.active),
      inactive: toNumber(propertyRow.inactive),
      adminCreated: toNumber(propertyRow.admin_created),
      manualChanges: toNumber(propertyRow.manual_changes),
    },
    scrapeSites: {
      total: toNumber(scrapeSiteRow.total),
      active: toNumber(scrapeSiteRow.active),
      inactive: toNumber(scrapeSiteRow.inactive),
      pendingSpider: toNumber(scrapeSiteRow.pending_spider),
    },
    scrapeSiteSuggestions: {
      total: toNumber(suggestionRow.total),
      pending: toNumber(suggestionRow.pending),
      accepted: toNumber(suggestionRow.accepted),
      rejected: toNumber(suggestionRow.rejected),
      ignored: toNumber(suggestionRow.ignored),
    },
    reports: {
      total: toNumber(reportRow.total),
      unread: toNumber(reportRow.unread),
      inReview: toNumber(reportRow.in_review),
      resolved: toNumber(reportRow.resolved),
      rejected: toNumber(reportRow.rejected),
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function fetchAdminDashboardSummary() {
  const [
    [userRows],
    [propertyRows],
    [scrapeSiteRows],
    [suggestionRows],
    [reportRows],
  ] = await Promise.all([
    dbPool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN role = 'client' THEN 1 ELSE 0 END) AS clients,
        SUM(CASE WHEN role = 'agent_bancaire' THEN 1 ELSE 0 END) AS agents,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS admins
      FROM users
    `),
    dbPool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN COALESCE(is_active, 1) = 1 THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN COALESCE(is_active, 1) = 0 THEN 1 ELSE 0 END) AS inactive,
        SUM(CASE WHEN COALESCE(created_by_admin, 0) = 1 THEN 1 ELSE 0 END) AS admin_created,
        SUM(
          CASE WHEN
            manual_title IS NOT NULL OR
            manual_price_raw IS NOT NULL OR
            manual_price_value IS NOT NULL OR
            manual_location_raw IS NOT NULL OR
            manual_city IS NOT NULL OR
            manual_country IS NOT NULL OR
            manual_image IS NOT NULL OR
            manual_description IS NOT NULL OR
            manual_source IS NOT NULL OR
            manual_url IS NOT NULL OR
            manual_scraped_at IS NOT NULL
          THEN 1 ELSE 0 END
        ) AS manual_changes
      FROM properties
      WHERE COALESCE(is_deleted, 0) = 0
    `),
    dbPool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN COALESCE(is_active, 0) = 1 THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN COALESCE(is_active, 0) = 0 THEN 1 ELSE 0 END) AS inactive,
        SUM(CASE WHEN integration_status = 'pending_spider' THEN 1 ELSE 0 END) AS pending_spider
      FROM scrape_sites
    `),
    dbPool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS accepted,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN status = 'ignored' THEN 1 ELSE 0 END) AS ignored
      FROM scrape_site_suggestions
    `),
    dbPool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN statut = 'NON_LU' THEN 1 ELSE 0 END) AS unread,
        SUM(CASE WHEN statut = 'EN_COURS' THEN 1 ELSE 0 END) AS in_review,
        SUM(CASE WHEN statut = 'RESOLU' THEN 1 ELSE 0 END) AS resolved,
        SUM(CASE WHEN statut = 'REJETE' THEN 1 ELSE 0 END) AS rejected
      FROM reclamations
    `),
  ]);

  return mapDashboardSummary({
    userRow: userRows[0],
    propertyRow: propertyRows[0],
    scrapeSiteRow: scrapeSiteRows[0],
    suggestionRow: suggestionRows[0],
    reportRow: reportRows[0],
  });
}
