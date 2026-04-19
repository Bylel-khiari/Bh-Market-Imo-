import { Router } from "express";
import {
  listAdminPropertyReports,
  submitPropertyReport,
  updateAdminPropertyReportStatus,
} from "../controllers/propertyReportController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  adminListPropertyReportsQuerySchema,
  adminUpdatePropertyReportStatusBodySchema,
  idParamSchema,
  propertyReportCreateBodySchema,
} from "../validation/schemas.js";

const router = Router();

router.post(
  "/api/properties/:id/reports",
  requireAuth,
  requireRoles("client"),
  validateRequest({ params: idParamSchema, body: propertyReportCreateBodySchema }),
  submitPropertyReport
);

router.get(
  "/api/admin/property-reports",
  requireAuth,
  requireRoles("admin"),
  validateRequest({ query: adminListPropertyReportsQuerySchema }),
  listAdminPropertyReports
);

router.patch(
  "/api/admin/property-reports/:id/status",
  requireAuth,
  requireRoles("admin"),
  validateRequest({ params: idParamSchema, body: adminUpdatePropertyReportStatusBodySchema }),
  updateAdminPropertyReportStatus
);

export default router;