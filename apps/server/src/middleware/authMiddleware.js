import { verifyAccessToken } from "../utils/jwt.js";
import { httpError } from "../utils/httpError.js";

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
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
