import { dbPool } from "../config/db.js";

export async function fetchClientProfile(userId) {
  const [rows] = await dbPool.execute(
    `
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      cp.address,
      cp.phone,
      u.created_at
    FROM users u
    LEFT JOIN client_profiles cp ON cp.user_id = u.id
    WHERE u.id = ?
    LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
}
