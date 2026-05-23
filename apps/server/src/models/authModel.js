import crypto from "crypto";
import bcrypt from "bcrypt";
import { dbPool } from "../config/db.js";
import {
  isPasswordResetMailConfigured,
  sendPasswordResetEmail,
} from "../services/passwordResetMailer.js";
import { signAccessToken } from "../utils/jwt.js";
import { httpError } from "../utils/httpError.js";
import { isValidRib, normalizeRib } from "../utils/rib.js";

const PASSWORD_RESET_TOKEN_BYTES = 32;
const DEFAULT_PASSWORD_RESET_TTL_MINUTES = 30;

function toPublicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    created_at: row.created_at,
  };
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function getResetTokenTtlMinutes() {
  const configured = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_PASSWORD_RESET_TTL_MINUTES;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function getFrontendBaseUrl(origin) {
  const configured = String(
    process.env.PASSWORD_RESET_FRONTEND_URL || process.env.FRONTEND_URL || process.env.APP_PUBLIC_URL || ""
  ).trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (origin && /^https?:\/\//i.test(origin)) {
    return String(origin).replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

function buildResetUrl(token, origin) {
  const url = new URL("/reset-password", getFrontendBaseUrl(origin));
  url.searchParams.set("token", token);
  return url.toString();
}

function normalizeDate(value) {
  if (value instanceof Date) {
    return value;
  }

  return new Date(value);
}

export async function loginUser(payload = {}) {
  const { password } = payload;
  const rawIdentifier = payload.identifier ?? payload.rib_bancaire ?? payload.email;

  if (!rawIdentifier || !password) {
    throw httpError(400, "identifier and password are required");
  }

  const identifier = String(rawIdentifier).trim();
  const usesEmail = identifier.includes("@");
  let rows = [];

  if (usesEmail) {
    const normalizedEmail = identifier.toLowerCase();
    [rows] = await dbPool.execute(
      `
      SELECT id, name, email, role, password_hash, created_at
      FROM users
      WHERE email = ?
        AND role IN ('admin', 'agent_bancaire')
      LIMIT 1
      `,
      [normalizedEmail]
    );
  } else {
    const normalizedRib = normalizeRib(identifier);
    if (!isValidRib(normalizedRib)) {
      throw httpError(401, "Invalid credentials");
    }

    [rows] = await dbPool.execute(
      `
      SELECT id, name, email, role, password_hash, created_at
      FROM users
      WHERE rib_bancaire = ?
        AND role = 'client'
      LIMIT 1
      `,
      [normalizedRib]
    );
  }

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

export async function requestPasswordReset(payload = {}, options = {}) {
  const normalizedEmail = String(payload.email || "").trim().toLowerCase();
  const genericMessage =
    "Si un compte existe avec cette adresse, un e-mail de reinitialisation vient d'etre envoye.";

  if (!normalizedEmail) {
    throw httpError(400, "Email is required");
  }

  if (!isPasswordResetMailConfigured()) {
    throw httpError(
      503,
      "Service e-mail non configure. Ajoutez SMTP_HOST, SMTP_USER et SMTP_PASS dans apps/server/.env."
    );
  }

  const [rows] = await dbPool.execute(
    "SELECT id, name, email, role, created_at FROM users WHERE email = ? LIMIT 1",
    [normalizedEmail]
  );

  if (!rows.length) {
    return { message: genericMessage, sent: false };
  }

  const user = toPublicUser(rows[0]);

  const token = crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("hex");
  const tokenHash = hashResetToken(token);
  const expiresInMinutes = getResetTokenTtlMinutes();
  const expiresAt = addMinutes(new Date(), expiresInMinutes);
  const resetUrl = buildResetUrl(token, options.origin);

  await dbPool.execute(
    `
    UPDATE password_reset_tokens
    SET used_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
      AND used_at IS NULL
    `,
    [user.id]
  );

  await dbPool.execute(
    `
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
    `,
    [user.id, tokenHash, expiresAt]
  );

  try {
    await sendPasswordResetEmail({ user, resetUrl, expiresInMinutes });
  } catch (error) {
    console.error("Failed to send password reset email:", {
      userId: user.id,
      email: user.email,
      message: error?.message,
    });
    throw httpError(502, "Impossible d'envoyer l'e-mail de reinitialisation pour le moment");
  }

  return { message: genericMessage, sent: true };
}

export async function resetUserPassword(payload = {}) {
  const token = String(payload.token || "").trim();
  const newPassword = String(payload.new_password || "");

  if (!token || !newPassword) {
    throw httpError(400, "Reset token and new password are required");
  }

  if (newPassword.length < 6) {
    throw httpError(400, "Password must be at least 6 characters");
  }

  const tokenHash = hashResetToken(token);
  const [rows] = await dbPool.execute(
    `
    SELECT
      prt.id AS reset_token_id,
      prt.expires_at,
      prt.used_at,
      u.id,
      u.name,
      u.email,
      u.role,
      u.password_hash,
      u.created_at
    FROM password_reset_tokens prt
    INNER JOIN users u ON u.id = prt.user_id
    WHERE prt.token_hash = ?
    LIMIT 1
    `,
    [tokenHash]
  );

  if (!rows.length) {
    throw httpError(400, "Lien de reinitialisation invalide ou expire");
  }

  const row = rows[0];
  const expiresAt = normalizeDate(row.expires_at);

  if (row.used_at || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    throw httpError(400, "Lien de reinitialisation invalide ou expire");
  }

  const samePassword = await bcrypt.compare(newPassword, row.password_hash);

  if (samePassword) {
    throw httpError(400, "Le nouveau mot de passe doit etre different de l'ancien");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await dbPool.execute(
    "UPDATE users SET password_hash = ? WHERE id = ?",
    [passwordHash, row.id]
  );

  await dbPool.execute(
    "UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?",
    [row.reset_token_id]
  );

  await dbPool.execute(
    `
    UPDATE password_reset_tokens
    SET used_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
      AND id <> ?
      AND used_at IS NULL
    `,
    [row.id, row.reset_token_id]
  );

  return toPublicUser(row);
}
