import jwt from "jsonwebtoken";

const isProduction = process.env.NODE_ENV === "production";
const configuredSecret = process.env.JWT_SECRET;

if (isProduction && !configuredSecret) {
  throw new Error("JWT_SECRET must be configured in production");
}

if (!configuredSecret && !isProduction) {
  console.warn("JWT_SECRET is not set. Falling back to local dev secret.");
}

const JWT_SECRET = configuredSecret || "dev_secret_change_me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export function signAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
