import crypto from "crypto";

export const RIB_PATTERN = /^[A-Z0-9-]{8,50}$/;

export function normalizeRib(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

export function isValidRib(value) {
  const normalized = normalizeRib(value);
  return RIB_PATTERN.test(normalized);
}

export function generateInternalRib(userId) {
  const paddedUserId = String(Number(userId) || 0).padStart(6, "0");
  const suffix = String(crypto.randomInt(0, 10000)).padStart(4, "0");
  return `RIB-${paddedUserId}-${suffix}`;
}
