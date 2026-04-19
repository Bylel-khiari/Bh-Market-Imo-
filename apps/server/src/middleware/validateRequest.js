import { ZodError } from "zod";
import { httpError } from "../utils/httpError.js";

function formatZodIssues(issues = []) {
  return issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

function setValidatedRequestValue(req, key, value) {
  try {
    req[key] = value;
  } catch {
    // Express 5 exposes some request fields like req.query as getter-only
    // properties, so shadow them on the request instance after validation.
    Object.defineProperty(req, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
}

export function validateRequest({ body, query, params } = {}) {
  return (req, res, next) => {
    try {
      if (body) {
        setValidatedRequestValue(req, "body", body.parse(req.body ?? {}));
      }

      if (query) {
        setValidatedRequestValue(req, "query", query.parse(req.query ?? {}));
      }

      if (params) {
        setValidatedRequestValue(req, "params", params.parse(req.params ?? {}));
      }

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(httpError(400, "Request validation failed", formatZodIssues(error.issues)));
      }
      return next(error);
    }
  };
}
