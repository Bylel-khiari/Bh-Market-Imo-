import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env"), quiet: true });

const ADMIN_PROPERTY_COLUMNS = [
  ["is_active", "is_active TINYINT(1) NOT NULL DEFAULT 1"],
  ["is_deleted", "is_deleted TINYINT(1) NOT NULL DEFAULT 0"],
  ["created_by_admin", "created_by_admin TINYINT(1) NOT NULL DEFAULT 0"],
  ["manual_title", "manual_title VARCHAR(255) NULL"],
  ["manual_price_raw", "manual_price_raw VARCHAR(255) NULL"],
  ["manual_price_value", "manual_price_value DECIMAL(15, 2) NULL"],
  ["manual_location_raw", "manual_location_raw VARCHAR(255) NULL"],
  ["manual_city", "manual_city VARCHAR(120) NULL"],
  ["manual_country", "manual_country VARCHAR(120) NULL"],
  ["manual_image", "manual_image TEXT NULL"],
  ["manual_description", "manual_description LONGTEXT NULL"],
  ["manual_source", "manual_source VARCHAR(120) NULL"],
  ["manual_url", "manual_url TEXT NULL"],
  ["manual_scraped_at", "manual_scraped_at DATETIME NULL"],
  ["admin_updated_at", "admin_updated_at TIMESTAMP NULL DEFAULT NULL"],
];
const ADMIN_MANAGED_COLUMN_NAMES = ADMIN_PROPERTY_COLUMNS.map(([columnName]) => columnName);

function getEnv(name, fallback) {
  const value = process.env[name];
  if (typeof value === "string" && value.trim() !== "") {
    return value;
  }

  return fallback;
}

function quoteIdentifier(identifier) {
  return `\`${String(identifier).replace(/`/g, "``")}\``;
}

async function ensurePropertiesAdminColumns(connection) {
  await connection.query("CREATE TABLE IF NOT EXISTS properties LIKE clean_listings");

  const [columnRows] = await connection.query("SHOW COLUMNS FROM properties");
  const existingColumns = new Set(columnRows.map((row) => row.Field));

  for (const [columnName, definition] of ADMIN_PROPERTY_COLUMNS) {
    if (!existingColumns.has(columnName)) {
      await connection.query(`ALTER TABLE properties ADD COLUMN ${definition}`);
    }
  }
}

function buildPreservedAdminSelects(hasPreviousRows) {
  if (!hasPreviousRows) {
    return [
      "1 AS is_active",
      "0 AS is_deleted",
      "0 AS created_by_admin",
      "NULL AS manual_title",
      "NULL AS manual_price_raw",
      "NULL AS manual_price_value",
      "NULL AS manual_location_raw",
      "NULL AS manual_city",
      "NULL AS manual_country",
      "NULL AS manual_image",
      "NULL AS manual_description",
      "NULL AS manual_source",
      "NULL AS manual_url",
      "NULL AS manual_scraped_at",
      "NULL AS admin_updated_at",
    ];
  }

  return [
    "COALESCE(prev.is_active, 1) AS is_active",
    "COALESCE(prev.is_deleted, 0) AS is_deleted",
    "0 AS created_by_admin",
    "prev.manual_title AS manual_title",
    "prev.manual_price_raw AS manual_price_raw",
    "prev.manual_price_value AS manual_price_value",
    "prev.manual_location_raw AS manual_location_raw",
    "prev.manual_city AS manual_city",
    "prev.manual_country AS manual_country",
    "prev.manual_image AS manual_image",
    "prev.manual_description AS manual_description",
    "prev.manual_source AS manual_source",
    "prev.manual_url AS manual_url",
    "prev.manual_scraped_at AS manual_scraped_at",
    "prev.admin_updated_at AS admin_updated_at",
  ];
}

export function buildSyncPlan({ cleanColumns, propertiesColumns }) {
  const cleanColumnSet = new Set(cleanColumns);
  const propertiesColumnSet = new Set(propertiesColumns);
  const sourceHasAuthoritativeAdminColumns = ADMIN_MANAGED_COLUMN_NAMES.every((columnName) =>
    cleanColumnSet.has(columnName)
  );

  const sharedColumns = cleanColumns.filter((columnName) => {
    if (!propertiesColumnSet.has(columnName)) {
      return false;
    }

    if (!sourceHasAuthoritativeAdminColumns && ADMIN_MANAGED_COLUMN_NAMES.includes(columnName)) {
      return false;
    }

    return true;
  });

  if (sharedColumns.length === 0) {
    throw new Error("No shared columns between clean_listings and properties.");
  }

  const sourceProjection = sharedColumns.map((columnName) => `src.${quoteIdentifier(columnName)}`);
  const canMatchPreviousById = sharedColumns.includes("id");
  const canMatchPreviousByUrl = sharedColumns.includes("url");
  const previousJoinCondition = canMatchPreviousById
    ? "prev.id = src.id"
    : canMatchPreviousByUrl
      ? "prev.url = src.url"
      : "";

  if (sourceHasAuthoritativeAdminColumns) {
    return {
      sharedColumns,
      insertColumns: sharedColumns,
      selectFragments: sourceProjection,
      previousJoinCondition: "",
      replaceAllRows: true,
    };
  }

  return {
    sharedColumns,
    insertColumns: [...sharedColumns, ...ADMIN_MANAGED_COLUMN_NAMES],
    selectFragments: [...sourceProjection, ...buildPreservedAdminSelects(Boolean(previousJoinCondition))],
    previousJoinCondition,
    replaceAllRows: false,
  };
}

function isDirectExecution() {
  return process.argv[1] ? path.resolve(process.argv[1]) === __filename : false;
}

async function main() {
  const connection = await mysql.createConnection({
    host: getEnv("MYSQL_HOST", "127.0.0.1"),
    port: Number(getEnv("MYSQL_PORT", "3306")),
    user: getEnv("MYSQL_USER", "root"),
    password: process.env.MYSQL_PASSWORD,
    database: getEnv("MYSQL_DATABASE", "database"),
  });

  try {
    const [cleanExistsRows] = await connection.query("SHOW TABLES LIKE 'clean_listings'");
    if (!Array.isArray(cleanExistsRows) || cleanExistsRows.length === 0) {
      throw new Error("Source table clean_listings does not exist.");
    }

    await ensurePropertiesAdminColumns(connection);

    const [columnRows] = await connection.query(
      `
        SELECT TABLE_NAME, COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME IN ('clean_listings', 'properties')
        ORDER BY TABLE_NAME, ORDINAL_POSITION
      `,
      [getEnv("MYSQL_DATABASE", "database")]
    );

    const cleanColumns = [];
    const propertiesColumns = new Set();

    for (const row of columnRows) {
      if (row.TABLE_NAME === "clean_listings") {
        cleanColumns.push(row.COLUMN_NAME);
      }

      if (row.TABLE_NAME === "properties") {
        propertiesColumns.add(row.COLUMN_NAME);
      }
    }

    const syncPlan = buildSyncPlan({
      cleanColumns,
      propertiesColumns: [...propertiesColumns],
    });

    await connection.beginTransaction();

    if (syncPlan.replaceAllRows) {
      await connection.query("DELETE FROM properties");
    } else {
      await connection.query("CREATE TEMPORARY TABLE properties_previous AS SELECT * FROM properties");
      await connection.query("DELETE FROM properties WHERE COALESCE(created_by_admin, 0) = 0");
    }

    const insertSql = `
      INSERT INTO properties (${syncPlan.insertColumns.map(quoteIdentifier).join(", ")})
      SELECT ${syncPlan.selectFragments.join(", ")}
      FROM clean_listings src
      ${syncPlan.previousJoinCondition ? `LEFT JOIN properties_previous prev ON ${syncPlan.previousJoinCondition}` : ""}
    `;

    const [insertResult] = await connection.query(insertSql);
    await connection.commit();

    const [[cleanCount]] = await connection.query("SELECT COUNT(*) AS total FROM clean_listings");
    const [[propertiesCount]] = await connection.query(
      "SELECT COUNT(*) AS total FROM properties WHERE COALESCE(is_deleted, 0) = 0"
    );
    const [[adminCreatedCount]] = await connection.query(
      "SELECT COUNT(*) AS total FROM properties WHERE created_by_admin = 1 AND COALESCE(is_deleted, 0) = 0"
    );

    console.log(
      JSON.stringify(
        {
          copied_rows: insertResult.affectedRows,
          clean_listings_total: cleanCount.total,
          properties_total: propertiesCount.total,
          admin_created_properties_total: adminCreatedCount.total,
        },
        null,
        2
      )
    );
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Ignore rollback errors if no active transaction.
    }

    throw error;
  } finally {
    await connection.end();
  }
}

if (isDirectExecution()) {
  main().catch((error) => {
    console.error("Failed to sync clean_listings to properties:", error.message);
    process.exitCode = 1;
  });
}
