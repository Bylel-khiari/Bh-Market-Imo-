import { dbPool } from "../config/db.js";

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
