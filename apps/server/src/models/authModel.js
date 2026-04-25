import bcrypt from "bcrypt";
import { dbPool } from "../config/db.js";
import { signAccessToken } from "../utils/jwt.js";
import { httpError } from "../utils/httpError.js";

function toPublicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    created_at: row.created_at,
  };
}

export async function loginUser(payload = {}) {
  const { email, password } = payload;
  if (!email || !password) {
    throw httpError(400, "email and password are required");
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const [rows] = await dbPool.execute(
    "SELECT id, name, email, role, password_hash, created_at FROM users WHERE email = ? LIMIT 1",
    [normalizedEmail]
  );

  if (!rows.length) {
    throw httpError(401, "Invalid credentials");
  }

  const userRow = rows[0];
  const ok = await bcrypt.compare(String(password), userRow.password_hash);
  if (!ok) {
    throw httpError(401, "Invalid credentials");
  }

  const user = toPublicUser(userRow);
  const token = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  return { token, user };
}

export async function getUserById(userId) {
  const [rows] = await dbPool.execute(
    "SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1",
    [userId]
  );

  if (!rows.length) {
    throw httpError(404, "User not found");
  }

  return toPublicUser(rows[0]);
}
