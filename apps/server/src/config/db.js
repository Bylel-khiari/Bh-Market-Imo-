import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { fileURLToPath } from "url";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const isProduction = process.env.NODE_ENV === "production";
const configuredPassword = process.env.MYSQL_PASSWORD;

if (isProduction && (!configuredPassword || !configuredPassword.trim())) {
  throw new Error("MYSQL_PASSWORD must be configured in production");
}

export const dbPool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: configuredPassword,
  database: process.env.MYSQL_DATABASE || "database",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function checkDbHealth() {
  const [rows] = await dbPool.query("SELECT 1 AS ok");
  return rows?.[0]?.ok === 1;
}
