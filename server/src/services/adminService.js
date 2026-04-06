import bcrypt from "bcrypt";
import { dbPool } from "../config/db.js";

const VALID_ROLES = ["client", "agent_bancaire", "responsable_decisionnel", "admin"];

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function syncUserProfileByRole(connection, userId, role, payload = {}) {
  await connection.query("DELETE FROM client_profiles WHERE user_id = ?", [userId]);
  await connection.query("DELETE FROM agent_profiles WHERE user_id = ?", [userId]);
  await connection.query("DELETE FROM decision_profiles WHERE user_id = ?", [userId]);
  await connection.query("DELETE FROM admin_profiles WHERE user_id = ?", [userId]);

  if (role === "client") {
    await connection.query(
      "INSERT INTO client_profiles (user_id, address, phone) VALUES (?, ?, ?)",
      [userId, payload.address ?? null, payload.phone ?? null]
    );
    return;
  }

  if (role === "agent_bancaire") {
    await connection.query(
      "INSERT INTO agent_profiles (user_id, matricule) VALUES (?, ?)",
      [userId, payload.matricule ?? null]
    );
    return;
  }

  if (role === "responsable_decisionnel") {
    await connection.query(
      "INSERT INTO decision_profiles (user_id, department) VALUES (?, ?)",
      [userId, payload.department ?? null]
    );
    return;
  }

  await connection.query("INSERT INTO admin_profiles (user_id) VALUES (?)", [userId]);
}

export async function fetchUsers({ limit = 50 } = {}) {
  const boundedLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);
  const [rows] = await dbPool.query(
    `
    SELECT id, name, email, role, created_at
    FROM users
    ORDER BY id DESC
    LIMIT ${boundedLimit}
    `
  );
  return rows;
}

export async function createUserByAdmin(payload = {}) {
  const {
    name,
    email,
    password,
    role = "client",
    address = null,
    phone = null,
    matricule = null,
    department = null,
  } = payload;

  if (!name || !email || !password) {
    throw httpError(400, "name, email and password are required");
  }

  if (!VALID_ROLES.includes(role)) {
    throw httpError(400, "Invalid role");
  }

  if (String(password).length < 6) {
    throw httpError(400, "Password must be at least 6 characters");
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const hashedPassword = await bcrypt.hash(String(password), 10);
  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    if (existingRows.length > 0) {
      throw httpError(409, "Email already in use");
    }

    const [insertResult] = await connection.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [String(name).trim(), normalizedEmail, hashedPassword, role]
    );

    const userId = insertResult.insertId;
    await syncUserProfileByRole(connection, userId, role, {
      address,
      phone,
      matricule,
      department,
    });

    const [userRows] = await connection.query(
      "SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    await connection.commit();
    return userRows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateUserByAdmin(userId, payload = {}) {
  const normalizedUserId = Number(userId);
  if (!normalizedUserId) {
    throw httpError(400, "Invalid user id");
  }

  const {
    name,
    email,
    password,
    role,
    address = null,
    phone = null,
    matricule = null,
    department = null,
  } = payload;

  if (role && !VALID_ROLES.includes(role)) {
    throw httpError(400, "Invalid role");
  }

  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();

    const [currentRows] = await connection.query(
      "SELECT id, email, role FROM users WHERE id = ? LIMIT 1",
      [normalizedUserId]
    );

    if (!currentRows.length) {
      throw httpError(404, "User not found");
    }

    const currentUser = currentRows[0];
    const nextRole = role || currentUser.role;
    const updates = [];
    const params = [];

    if (typeof name === "string" && name.trim()) {
      updates.push("name = ?");
      params.push(name.trim());
    }

    if (typeof email === "string" && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      const [emailRows] = await connection.query(
        "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
        [normalizedEmail, normalizedUserId]
      );
      if (emailRows.length) {
        throw httpError(409, "Email already in use");
      }
      updates.push("email = ?");
      params.push(normalizedEmail);
    }

    if (typeof password === "string" && password.length > 0) {
      if (password.length < 6) {
        throw httpError(400, "Password must be at least 6 characters");
      }
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push("password_hash = ?");
      params.push(passwordHash);
    }

    if (role) {
      updates.push("role = ?");
      params.push(role);
    }

    if (updates.length) {
      await connection.query(
        `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
        [...params, normalizedUserId]
      );
    }

    await syncUserProfileByRole(connection, normalizedUserId, nextRole, {
      address,
      phone,
      matricule,
      department,
    });

    const [userRows] = await connection.query(
      "SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1",
      [normalizedUserId]
    );

    await connection.commit();
    return userRows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteUserByAdmin(userId) {
  const normalizedUserId = Number(userId);
  if (!normalizedUserId) {
    throw httpError(400, "Invalid user id");
  }

  const [result] = await dbPool.query("DELETE FROM users WHERE id = ?", [normalizedUserId]);
  if (!result.affectedRows) {
    throw httpError(404, "User not found");
  }
}
