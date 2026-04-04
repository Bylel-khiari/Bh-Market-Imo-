import { Router } from "express";
import { getMyClientProfile } from "../controllers/clientController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/api/client/profile", requireAuth, requireRoles("client"), getMyClientProfile);

export default router;
