import { dbPool } from "../config/db.js";

export async function fetchUsers({ limit = 50 } = {}) {
  const boundedLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);
  const [rows] = await dbPool.execute(
    `
    SELECT id, name, email, role, created_at
    FROM users
    ORDER BY id DESC
    LIMIT ?
    `,
    [boundedLimit]
  );
  return rows;
}
