import { httpError } from "../utils/httpError.js";

export function notFoundHandler(req, res, next) {
  next(httpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(error, req, res, next) {
  const status = Number(error?.status) || 500;
  const message = status >= 500 ? "Internal server error" : error.message;

  if (status >= 500) {
    console.error("Unhandled error:", {
      method: req.method,
      path: req.originalUrl,
      message: error?.message,
      stack: error?.stack,
    });
  }

  const payload = {
    message,
  };

  if (error?.details) {
    payload.details = error.details;
  }

  if (process.env.NODE_ENV !== "production" && status >= 500 && error?.message) {
    payload.debug = error.message;
  }

  res.status(status).json(payload);
}
