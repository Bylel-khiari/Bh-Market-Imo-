import { ZodError } from "zod";
import { httpError } from "../utils/httpError.js";

function formatZodIssues(issues = []) {
  return issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export function validateRequest({ body, query, params } = {}) {
  return (req, res, next) => {
    try {
      if (body) {
        req.body = body.parse(req.body ?? {});
      }

      if (query) {
        req.query = query.parse(req.query ?? {});
      }

      if (params) {
        req.params = params.parse(req.params ?? {});
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
