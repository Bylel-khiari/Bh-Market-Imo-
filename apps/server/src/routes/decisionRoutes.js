import { Router } from "express";
import { getDecisionDashboard } from "../controllers/decisionController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";

const router = Router();

router.get(
  "/api/decision/dashboard",
  requireAuth,
  requireRoles("responsable_decisionnel"),
  getDecisionDashboard
);

export default router;
