import { dbPool } from "../config/db.js";

function normalizeOptionalString(value, maxLength = 255) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function getRequestIp(req) {
  const forwardedFor = String(req?.headers?.["x-forwarded-for"] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return forwardedFor[0] || req?.ip || req?.socket?.remoteAddress || null;
}

export async function recordAdminAuditLog(req, {
  action,
  targetType = null,
  targetId = null,
  metadata = null,
} = {}) {
  const normalizedAction = normalizeOptionalString(action, 120);
  if (!normalizedAction) {
    return;
  }

  try {
    await dbPool.execute(
      `
      INSERT INTO admin_audit_logs (
        admin_user_id,
        action,
        target_type,
        target_id,
        ip_address,
        user_agent,
        metadata_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        req?.user?.sub || null,
        normalizedAction,
        normalizeOptionalString(targetType, 80),
        normalizeOptionalString(targetId, 120),
        normalizeOptionalString(getRequestIp(req), 64),
        normalizeOptionalString(req?.headers?.["user-agent"], 255),
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
  } catch (error) {
    console.error("Failed to record admin audit log:", error);
  }
}
