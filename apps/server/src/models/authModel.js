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

export async function changeUserPassword(userId, payload = {}) {
  const normalizedUserId = Number(userId);
  const currentPassword = String(payload.current_password || "");
  const newPassword = String(payload.new_password || "");

  if (!normalizedUserId) {
    throw httpError(401, "Invalid user session");
  }

  if (!currentPassword || !newPassword) {
    throw httpError(400, "Current password and new password are required");
  }

  if (newPassword.length < 6) {
    throw httpError(400, "Password must be at least 6 characters");
  }

  const [rows] = await dbPool.execute(
    "SELECT id, name, email, role, password_hash, created_at FROM users WHERE id = ? LIMIT 1",
    [normalizedUserId]
  );

  if (!rows.length) {
    throw httpError(404, "User not found");
  }

  const userRow = rows[0];
  const currentPasswordMatches = await bcrypt.compare(currentPassword, userRow.password_hash);

  if (!currentPasswordMatches) {
    throw httpError(401, "Mot de passe actuel incorrect");
  }

  const samePassword = await bcrypt.compare(newPassword, userRow.password_hash);

  if (samePassword) {
    throw httpError(400, "Le nouveau mot de passe doit etre different de l'ancien");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await dbPool.execute(
    "UPDATE users SET password_hash = ? WHERE id = ?",
    [passwordHash, normalizedUserId]
  );

  return toPublicUser(userRow);
}
