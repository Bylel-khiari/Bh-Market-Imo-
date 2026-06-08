import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { fileURLToPath } from "url";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const isProduction = process.env.NODE_ENV === "production";
const configuredPassword = process.env.MYSQL_PASSWORD || "root";
const configuredDatabase = process.env.MYSQL_DATABASE || "bh_market";
const baseDbConfig = {
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: configuredPassword,
};

if (isProduction && (!configuredPassword || !configuredPassword.trim())) {
  throw new Error("MYSQL_PASSWORD must be configured in production");
}

function quoteMysqlIdentifier(identifier) {
  const normalizedIdentifier = String(identifier || "").trim();
  if (!normalizedIdentifier) {
    throw new Error("MYSQL_DATABASE must be configured");
  }

  return `\`${normalizedIdentifier.replace(/`/g, "``")}\``;
}

export const dbPool = mysql.createPool({
  ...baseDbConfig,
  database: configuredDatabase,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function ensureDatabaseReady() {
  try {
    await dbPool.query("SELECT 1 AS ok");
    return;
  } catch (error) {
    if (error?.code !== "ER_BAD_DB_ERROR") {
      throw error;
    }
  }

  const bootstrapConnection = await mysql.createConnection(baseDbConfig);
  try {
    await bootstrapConnection.query(
      `CREATE DATABASE IF NOT EXISTS ${quoteMysqlIdentifier(configuredDatabase)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await bootstrapConnection.end();
  }

  await dbPool.query("SELECT 1 AS ok");
}

export async function checkDbHealth() {
  const [rows] = await dbPool.query("SELECT 1 AS ok");
  return rows?.[0]?.ok === 1;
}
