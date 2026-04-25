import { Router } from "express";
import { getAgentDashboard, getMyAgentProfile } from "../controllers/agentController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/api/agent/profile", requireAuth, requireRoles("agent_bancaire"), getMyAgentProfile);
router.get("/api/agent/dashboard", requireAuth, requireRoles("agent_bancaire"), getAgentDashboard);

export default router;
