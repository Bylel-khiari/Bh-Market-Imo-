import bcrypt from "bcrypt";
import { dbPool } from "../config/db.js";
import { signAccessToken } from "../utils/jwt.js";
import { httpError } from "../utils/httpError.js";

const VALID_ROLES = ["client", "agent_bancaire", "responsable_decisionnel"];

function toPublicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    created_at: row.created_at,
  };
}

export async function registerUser(payload = {}) {
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

    const [existingRows] = await connection.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    if (existingRows.length > 0) {
      throw httpError(409, "Email already in use");
    }

    const [insertResult] = await connection.execute(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [String(name).trim(), normalizedEmail, hashedPassword, role]
    );

    const userId = insertResult.insertId;

    if (role === "client") {
      await connection.execute(
        "INSERT INTO client_profiles (user_id, address, phone) VALUES (?, ?, ?)",
        [userId, address, phone]
      );
    } else if (role === "agent_bancaire") {
      await connection.execute(
        "INSERT INTO agent_profiles (user_id, matricule) VALUES (?, ?)",
        [userId, matricule]
      );
    } else {
      await connection.execute(
        "INSERT INTO decision_profiles (user_id, department) VALUES (?, ?)",
        [userId, department]
      );
    }

    const [userRows] = await connection.execute(
      "SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    await connection.commit();

    const user = toPublicUser(userRows[0]);
    const token = signAccessToken({ sub: user.id, email: user.email, role: user.role });
    return { token, user };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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
