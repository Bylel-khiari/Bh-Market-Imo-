import { Router } from "express";
import { getMyAgentProfile } from "../controllers/agentController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/api/agent/profile", requireAuth, requireRoles("agent_bancaire"), getMyAgentProfile);

export default router;
