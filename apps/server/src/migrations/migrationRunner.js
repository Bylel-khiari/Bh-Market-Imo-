import { dbPool } from "../config/db.js";
import { generateInternalRib } from "../utils/rib.js";

const MIGRATIONS_TABLE = "schema_migrations";

async function tableExists(tableName) {
  const [rows] = await dbPool.query("SHOW TABLES LIKE ?", [tableName]);
  return Array.isArray(rows) && rows.length > 0;
}

async function columnExists(tableName, columnName) {
  const [rows] = await dbPool.execute(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    LIMIT 1
    `,
    [tableName, columnName]
  );

  return Array.isArray(rows) && rows.length > 0;
}

async function getColumn(tableName, columnName) {
  const [rows] = await dbPool.execute(
    `
    SELECT IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    LIMIT 1
    `,
    [tableName, columnName]
  );

  return rows?.[0] || null;
}

async function indexExists(tableName, indexName) {
  const [rows] = await dbPool.execute(
    `
    SELECT INDEX_NAME
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND INDEX_NAME = ?
    LIMIT 1
    `,
    [tableName, indexName]
  );

  return Array.isArray(rows) && rows.length > 0;
}

async function addColumnIfMissing(tableName, columnName, definition) {
  if (!(await tableExists(tableName)) || (await columnExists(tableName, columnName))) {
    return;
  }

  await dbPool.query(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
}

async function modifyColumnIfPresent(tableName, columnName, definition, predicate) {
  if (!(await tableExists(tableName))) {
    return;
  }

  const column = await getColumn(tableName, columnName);
  if (!column || (typeof predicate === "function" && !predicate(column))) {
    return;
  }

  await dbPool.query(`ALTER TABLE ${tableName} MODIFY COLUMN ${definition}`);
}

async function addIndexIfMissing(tableName, indexName, statement) {
  if (!(await tableExists(tableName)) || (await indexExists(tableName, indexName))) {
    return;
  }

  await dbPool.query(statement);
}

async function createAuditLogTable() {
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      admin_user_id BIGINT NULL,
      action VARCHAR(120) NOT NULL,
      target_type VARCHAR(80) NULL,
      target_id VARCHAR(120) NULL,
      ip_address VARCHAR(64) NULL,
      user_agent VARCHAR(255) NULL,
      metadata_json LONGTEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_admin_audit_logs_admin_created_at (admin_user_id, created_at),
      KEY idx_admin_audit_logs_action_created_at (action, created_at)
    )
  `);
}

async function createClientActivityLogTable() {
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS client_activity_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      client_user_id BIGINT UNSIGNED NOT NULL,
      event_type VARCHAR(80) NOT NULL,
      event_label VARCHAR(120) NULL,
      page VARCHAR(255) NULL,
      target_type VARCHAR(80) NULL,
      target_id VARCHAR(120) NULL,
      ip_address VARCHAR(64) NULL,
      user_agent VARCHAR(255) NULL,
      metadata_json LONGTEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_client_activity_logs_client_created_at (client_user_id, created_at),
      KEY idx_client_activity_logs_event_created_at (event_type, created_at),
      KEY idx_client_activity_logs_created_at (created_at)
    )
  `);
}

async function createCreditApplicationDocumentTable() {
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS credit_application_documents (
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
    ALTER TABLE credit_application_documents
    MODIFY COLUMN content LONGBLOB NULL
  `);
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS credit_application_document_chunks (
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
}

async function createPasswordResetTokensTable() {
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_password_reset_tokens_hash (token_hash),
      KEY idx_password_reset_tokens_user_active (user_id, used_at, expires_at)
    )
  `);
}

async function ribExists(connection, rib) {
  const [rows] = await connection.query(
    "SELECT id FROM users WHERE rib_bancaire = ? LIMIT 1",
    [rib]
  );
  return rows.length > 0;
}

async function generateUniqueRib(connection, userId) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const rib = generateInternalRib(userId);
    if (!(await ribExists(connection, rib))) {
      return rib;
    }
  }

  throw new Error(`Unable to generate a unique RIB for user ${userId}`);
}

async function assertNoDuplicateRibs() {
  const [rows] = await dbPool.query(
    `
    SELECT rib_bancaire
    FROM users
    WHERE rib_bancaire IS NOT NULL
    GROUP BY rib_bancaire
    HAVING COUNT(*) > 1
    LIMIT 1
    `
  );

  if (rows.length) {
    throw new Error(`Duplicate RIB found before unique constraint: ${rows[0].rib_bancaire}`);
  }
}

async function addUsersRibBancaireColumnAndBackfillClients() {
  if (!(await tableExists("users"))) {
    return;
  }

  await addColumnIfMissing("users", "rib_bancaire", "rib_bancaire VARCHAR(50) NULL AFTER email");

  const connection = await dbPool.getConnection();
  try {
    const [clients] = await connection.query(
      `
      SELECT id
      FROM users
      WHERE role = 'client'
        AND rib_bancaire IS NULL
      ORDER BY id ASC
      `
    );

    for (const client of clients) {
      const rib = await generateUniqueRib(connection, client.id);
      await connection.query(
        `
        UPDATE users
        SET rib_bancaire = ?
        WHERE id = ?
          AND role = 'client'
          AND rib_bancaire IS NULL
        `,
        [rib, client.id]
      );
    }
  } finally {
    connection.release();
  }

  await assertNoDuplicateRibs();
  await addIndexIfMissing(
    "users",
    "unique_users_rib_bancaire",
    "ALTER TABLE users ADD CONSTRAINT unique_users_rib_bancaire UNIQUE (rib_bancaire)"
  );
}

async function createScraperRunTables() {
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS scraper_run_history (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      run_type VARCHAR(32) NOT NULL,
      trigger_source VARCHAR(32) NOT NULL DEFAULT 'manual',
      status VARCHAR(24) NOT NULL DEFAULT 'running',
      total_steps SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      started_at DATETIME NOT NULL,
      finished_at DATETIME NULL,
      duration_seconds INT UNSIGNED NULL,
      error_message TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_scraper_run_history_started_at (started_at),
      KEY idx_scraper_run_history_status_started_at (status, started_at)
    )
  `);

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS scraper_spider_metrics (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      run_id BIGINT UNSIGNED NULL,
      scrape_site_id BIGINT UNSIGNED NULL,
      spider_name VARCHAR(120) NOT NULL,
      site_name VARCHAR(120) NULL,
      status VARCHAR(24) NOT NULL,
      started_at DATETIME NOT NULL,
      finished_at DATETIME NULL,
      duration_seconds INT UNSIGNED NULL,
      error_message TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_scraper_spider_metrics_run_id (run_id),
      KEY idx_scraper_spider_metrics_spider_started_at (spider_name, started_at)
    )
  `);
}

const migrations = [
  {
    version: "202605030001",
    name: "properties-admin-columns",
    up: async () => {
      await addColumnIfMissing("properties", "raw_id", "raw_id VARCHAR(190) NULL");
      await addColumnIfMissing("properties", "title", "title VARCHAR(255) NULL");
      await addColumnIfMissing("properties", "normalized_title", "normalized_title VARCHAR(255) NULL");
      await addColumnIfMissing("properties", "price_raw", "price_raw VARCHAR(255) NULL");
      await addColumnIfMissing("properties", "price_value", "price_value DECIMAL(15, 2) NULL");
      await addColumnIfMissing("properties", "location_raw", "location_raw VARCHAR(255) NULL");
      await addColumnIfMissing("properties", "normalized_location", "normalized_location VARCHAR(255) NULL");
      await addColumnIfMissing("properties", "city", "city VARCHAR(120) NULL");
      await addColumnIfMissing("properties", "country", "country VARCHAR(120) NULL");
      await addColumnIfMissing("properties", "image", "image TEXT NULL");
      await addColumnIfMissing("properties", "images_json", "images_json LONGTEXT NULL");
      await addColumnIfMissing("properties", "description", "description LONGTEXT NULL");
      await addColumnIfMissing("properties", "normalized_description", "normalized_description LONGTEXT NULL");
      await addColumnIfMissing("properties", "source", "source VARCHAR(120) NULL");
      await addColumnIfMissing("properties", "url", "url TEXT NULL");
      await addColumnIfMissing("properties", "dedupe_key", "dedupe_key VARCHAR(64) NULL");
      await addColumnIfMissing("properties", "scraped_at", "scraped_at DATETIME NULL");
      await addColumnIfMissing("properties", "created_at", "created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
      await addColumnIfMissing("properties", "is_active", "is_active TINYINT(1) NOT NULL DEFAULT 1");
      await addColumnIfMissing("properties", "is_deleted", "is_deleted TINYINT(1) NOT NULL DEFAULT 0");
      await addColumnIfMissing("properties", "created_by_admin", "created_by_admin TINYINT(1) NOT NULL DEFAULT 0");
      await addColumnIfMissing("properties", "manual_title", "manual_title VARCHAR(255) NULL");
      await addColumnIfMissing("properties", "manual_price_raw", "manual_price_raw VARCHAR(255) NULL");
      await addColumnIfMissing("properties", "manual_price_value", "manual_price_value DECIMAL(15, 2) NULL");
      await addColumnIfMissing("properties", "manual_location_raw", "manual_location_raw VARCHAR(255) NULL");
      await addColumnIfMissing("properties", "manual_city", "manual_city VARCHAR(120) NULL");
      await addColumnIfMissing("properties", "manual_country", "manual_country VARCHAR(120) NULL");
      await addColumnIfMissing("properties", "manual_image", "manual_image TEXT NULL");
      await addColumnIfMissing("properties", "manual_description", "manual_description LONGTEXT NULL");
      await addColumnIfMissing("properties", "manual_source", "manual_source VARCHAR(120) NULL");
      await addColumnIfMissing("properties", "manual_url", "manual_url TEXT NULL");
      await addColumnIfMissing("properties", "manual_scraped_at", "manual_scraped_at DATETIME NULL");
      await addColumnIfMissing("properties", "admin_updated_at", "admin_updated_at TIMESTAMP NULL DEFAULT NULL");
      await addIndexIfMissing(
        "properties",
        "idx_properties_admin_status_id",
        "CREATE INDEX idx_properties_admin_status_id ON properties (is_deleted, is_active, id)"
      );
    },
  },
  {
    version: "202605030002",
    name: "reclamation-admin-columns",
    up: async () => {
      await addColumnIfMissing("reclamations", "site_source_id", "site_source_id BIGINT UNSIGNED NULL AFTER annonce_id");
      await addColumnIfMissing("reclamations", "source_kind", "source_kind VARCHAR(24) NOT NULL DEFAULT 'ANNONCE' AFTER site_source_id");
      await addColumnIfMissing("reclamations", "priorite", "priorite VARCHAR(24) NOT NULL DEFAULT 'MOYENNE' AFTER statut");
      await addColumnIfMissing("reclamations", "note_admin", "note_admin TEXT NULL AFTER admin_id");
      await addColumnIfMissing("reclamations", "resolved_at", "resolved_at DATETIME NULL AFTER updated_at");
      await addColumnIfMissing("reclamation_history", "old_status", "old_status VARCHAR(24) NULL AFTER action");
      await addColumnIfMissing("reclamation_history", "new_status", "new_status VARCHAR(24) NULL AFTER old_status");
      await addColumnIfMissing("reclamation_history", "commentaire", "commentaire TEXT NULL AFTER new_status");
      await addColumnIfMissing("reclamation_history", "admin_id", "admin_id BIGINT NULL AFTER commentaire");
      await modifyColumnIfPresent(
        "reclamation_history",
        "admin_id",
        "admin_id BIGINT NULL",
        (column) => String(column.IS_NULLABLE || "").toUpperCase() !== "YES"
      );
    },
  },
  {
    version: "202605030003",
    name: "scraper-control-progress-columns",
    up: async () => {
      await addColumnIfMissing("scraper_control", "run_type", "run_type VARCHAR(32) NULL AFTER status");
      await addColumnIfMissing("scraper_control", "max_listing_age_days", "max_listing_age_days SMALLINT UNSIGNED NOT NULL DEFAULT 1095 AFTER interval_days");
      await addColumnIfMissing("scraper_control", "current_stage", "current_stage VARCHAR(32) NULL AFTER run_type");
      await addColumnIfMissing("scraper_control", "progress_current", "progress_current SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER current_spider_name");
      await addColumnIfMissing("scraper_control", "progress_total", "progress_total SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER progress_current");
      await addColumnIfMissing("scraper_control", "progress_percent", "progress_percent DECIMAL(5, 2) NOT NULL DEFAULT 0 AFTER progress_total");
      await addColumnIfMissing("scraper_control", "estimated_remaining_seconds", "estimated_remaining_seconds INT UNSIGNED NULL AFTER progress_percent");
      await addColumnIfMissing("scraper_control", "recent_log", "recent_log LONGTEXT NULL AFTER estimated_remaining_seconds");
    },
  },
  {
    version: "202605030004",
    name: "scrape-sites-integration-status",
    up: async () => {
      await addColumnIfMissing(
        "scrape_sites",
        "integration_status",
        "integration_status VARCHAR(32) NOT NULL DEFAULT 'ready' AFTER is_active"
      );
    },
  },
  {
    version: "202605030005",
    name: "credit-applications-documents-json",
    up: async () => {
      await addColumnIfMissing("credit_applications", "documents_json", "documents_json LONGTEXT NULL");
    },
  },
  {
    version: "202605230001",
    name: "credit-application-documents-db-storage",
    up: createCreditApplicationDocumentTable,
  },
  {
    version: "202605030006",
    name: "admin-audit-logs",
    up: createAuditLogTable,
  },
  {
    version: "202605030007",
    name: "scraper-run-history",
    up: createScraperRunTables,
  },
  {
    version: "202605030008",
    name: "client-activity-logs",
    up: createClientActivityLogTable,
  },
  {
    version: "202605150001",
    name: "password-reset-tokens",
    up: createPasswordResetTokensTable,
  },
  {
    version: "202605180001",
    name: "property-gallery-images",
    up: async () => {
      await addColumnIfMissing("properties", "images_json", "images_json LONGTEXT NULL");
    },
  },
  {
    version: "202605230002",
    name: "users-rib-bancaire-client-backfill",
    up: addUsersRibBancaireColumnAndBackfillClients,
  },
];

async function ensureMigrationsTable() {
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      version VARCHAR(32) NOT NULL,
      name VARCHAR(190) NOT NULL,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (version)
    )
  `);
}

async function hasMigrationRun(version) {
  const [rows] = await dbPool.execute(
    `SELECT version FROM ${MIGRATIONS_TABLE} WHERE version = ? LIMIT 1`,
    [version]
  );

  return Array.isArray(rows) && rows.length > 0;
}

export async function runMigrations() {
  await ensureMigrationsTable();

  for (const migration of migrations) {
    if (await hasMigrationRun(migration.version)) {
      continue;
    }

    await migration.up();
    await dbPool.execute(
      `INSERT INTO ${MIGRATIONS_TABLE} (version, name) VALUES (?, ?)`,
      [migration.version, migration.name]
    );
  }
}
