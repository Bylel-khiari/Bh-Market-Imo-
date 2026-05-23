import bcrypt from "bcrypt";
import { dbPool } from "../config/db.js";
import { httpError } from "../utils/httpError.js";
import { generateInternalRib, isValidRib, normalizeRib } from "../utils/rib.js";

const VALID_ROLES = ["client", "agent_bancaire", "admin"];
const CLIENT_ROLE = "client";
const RIB_ALREADY_USED_MESSAGE = "Ce RIB bancaire est deja utilise par un autre client.";
const CLIENT_RIB_REQUIRED_MESSAGE = "Le RIB bancaire est obligatoire pour un compte client.";

async function syncUserProfileByRole(connection, userId, role, payload = {}) {
  await connection.query("DELETE FROM client_profiles WHERE user_id = ?", [userId]);
  await connection.query("DELETE FROM agent_profiles WHERE user_id = ?", [userId]);
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

  await connection.query("INSERT INTO admin_profiles (user_id) VALUES (?)", [userId]);
}

function hasOwn(payload, key) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function isDuplicateRibDatabaseError(error) {
  return (
    error?.code === "ER_DUP_ENTRY" &&
    String(error?.message || "").toLowerCase().includes("rib")
  );
}

async function ensureRibIsUnique(connection, rib, excludeUserId = null) {
  const params = [rib];
  let query = "SELECT id FROM users WHERE rib_bancaire = ?";

  if (excludeUserId) {
    query += " AND id <> ?";
    params.push(excludeUserId);
  }

  query += " LIMIT 1";
  const [rows] = await connection.query(query, params);

  if (rows.length) {
    throw httpError(409, RIB_ALREADY_USED_MESSAGE);
  }
}

async function generateUniqueClientRib(connection, userId) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const rib = generateInternalRib(userId);
    const [rows] = await connection.query(
      "SELECT id FROM users WHERE rib_bancaire = ? LIMIT 1",
      [rib]
    );

    if (!rows.length) {
      return rib;
    }
  }

  throw httpError(500, "Unable to generate a unique RIB bancaire");
}

function normalizeAndValidateClientRib(value) {
  const normalizedRib = normalizeRib(value);

  if (!isValidRib(normalizedRib)) {
    throw httpError(400, CLIENT_RIB_REQUIRED_MESSAGE);
  }

  return normalizedRib;
}

export async function fetchUsers({ limit = 50 } = {}) {
  const boundedLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);
  const [rows] = await dbPool.query(
    `
    SELECT id, name, email, rib_bancaire, role, created_at
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
    rib_bancaire = null,
    generate_rib_bancaire = false,
    address = null,
    phone = null,
    matricule = null,
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
  const isClientRole = role === CLIENT_ROLE;
  const shouldGenerateRib = Boolean(generate_rib_bancaire);
  const normalizedRib = isClientRole && !shouldGenerateRib
    ? normalizeAndValidateClientRib(rib_bancaire)
    : null;
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

    if (normalizedRib) {
      await ensureRibIsUnique(connection, normalizedRib);
    }

    const [insertResult] = await connection.query(
      "INSERT INTO users (name, email, rib_bancaire, password_hash, role) VALUES (?, ?, ?, ?, ?)",
      [String(name).trim(), normalizedEmail, isClientRole ? normalizedRib : null, hashedPassword, role]
    );

    const userId = insertResult.insertId;

    if (isClientRole && shouldGenerateRib) {
      const generatedRib = await generateUniqueClientRib(connection, userId);
      await connection.query("UPDATE users SET rib_bancaire = ? WHERE id = ?", [
        generatedRib,
        userId,
      ]);
    }

    await syncUserProfileByRole(connection, userId, role, {
      address,
      phone,
      matricule,
    });

    const [userRows] = await connection.query(
      "SELECT id, name, email, rib_bancaire, role, created_at FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    await connection.commit();
    return userRows[0];
  } catch (error) {
    await connection.rollback();
    if (isDuplicateRibDatabaseError(error)) {
      throw httpError(409, RIB_ALREADY_USED_MESSAGE);
    }
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
    rib_bancaire,
    generate_rib_bancaire = false,
    address = null,
    phone = null,
    matricule = null,
  } = payload;

  if (role && !VALID_ROLES.includes(role)) {
    throw httpError(400, "Invalid role");
  }

  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();

    const [currentRows] = await connection.query(
      "SELECT id, email, role, rib_bancaire FROM users WHERE id = ? LIMIT 1",
      [normalizedUserId]
    );

    if (!currentRows.length) {
      throw httpError(404, "User not found");
    }

    const currentUser = currentRows[0];
    const nextRole = role || currentUser.role;
    const shouldGenerateRib = Boolean(generate_rib_bancaire);
    const hasRibPayload = hasOwn(payload, "rib_bancaire");
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

    if (nextRole === CLIENT_ROLE) {
      let nextRib = currentUser.rib_bancaire || null;

      if (shouldGenerateRib) {
        nextRib = await generateUniqueClientRib(connection, normalizedUserId);
      } else if (hasRibPayload) {
        nextRib = normalizeAndValidateClientRib(rib_bancaire);
      }

      if (!nextRib) {
        throw httpError(400, CLIENT_RIB_REQUIRED_MESSAGE);
      }

      if (nextRib !== currentUser.rib_bancaire) {
        await ensureRibIsUnique(connection, nextRib, normalizedUserId);
        updates.push("rib_bancaire = ?");
        params.push(nextRib);
      }
    } else if (currentUser.rib_bancaire || role) {
      updates.push("rib_bancaire = NULL");
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
    });

    const [userRows] = await connection.query(
      "SELECT id, name, email, rib_bancaire, role, created_at FROM users WHERE id = ? LIMIT 1",
      [normalizedUserId]
    );

    await connection.commit();
    return userRows[0];
  } catch (error) {
    await connection.rollback();
    if (isDuplicateRibDatabaseError(error)) {
      throw httpError(409, RIB_ALREADY_USED_MESSAGE);
    }
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
