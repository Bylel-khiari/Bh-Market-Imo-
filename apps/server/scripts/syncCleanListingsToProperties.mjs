import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

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

    await connection.query("CREATE TABLE IF NOT EXISTS properties LIKE clean_listings");

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

    const sharedColumns = cleanColumns.filter((columnName) => propertiesColumns.has(columnName));
    if (sharedColumns.length === 0) {
      throw new Error("No shared columns between clean_listings and properties.");
    }

    const projection = sharedColumns.map(quoteIdentifier).join(", ");

    await connection.beginTransaction();
    await connection.query("DELETE FROM properties");
    const [insertResult] = await connection.query(
      `INSERT INTO properties (${projection}) SELECT ${projection} FROM clean_listings`
    );
    await connection.commit();

    const [[cleanCount]] = await connection.query("SELECT COUNT(*) AS total FROM clean_listings");
    const [[propertiesCount]] = await connection.query("SELECT COUNT(*) AS total FROM properties");

    console.log(
      JSON.stringify(
        {
          copied_rows: insertResult.affectedRows,
          clean_listings_total: cleanCount.total,
          properties_total: propertiesCount.total,
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

main().catch((error) => {
  console.error("Failed to sync clean_listings to properties:", error.message);
  process.exitCode = 1;
});
