import { verifyAccessToken } from "../utils/jwt.js";
import { httpError } from "../utils/httpError.js";

const ACCESS_TOKEN_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "bh_market_access_token";

function parseCookieHeader(headerValue = "") {
  const decodeCookiePart = (value) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  return Object.fromEntries(
    String(headerValue || "")
      .split(";")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separatorIndex = entry.indexOf("=");
        if (separatorIndex === -1) {
          return [entry, ""];
        }

        return [
          decodeCookiePart(entry.slice(0, separatorIndex).trim()),
          decodeCookiePart(entry.slice(separatorIndex + 1).trim()),
        ];
      })
  );
}

function readAccessToken(req) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme === "Bearer" && token) {
    return token;
  }

  return parseCookieHeader(req.headers.cookie || "")[ACCESS_TOKEN_COOKIE_NAME] || null;
}

export function requireAuth(req, res, next) {
  const token = readAccessToken(req);

  if (!token) {
    return next(httpError(401, "Missing or invalid authorization header"));
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    return next();
  } catch (error) {
    return next(httpError(401, "Invalid or expired token"));
  }
}

export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !allowedRoles.includes(role)) {
      return next(httpError(403, "Forbidden: insufficient permissions"));
    }
    return next();
  };
}
