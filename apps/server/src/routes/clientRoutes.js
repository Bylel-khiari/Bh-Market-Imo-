import { Router } from "express";
import { getMyClientProfile, recordMyClientActivity } from "../controllers/clientController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { clientActivityLogCreateBodySchema } from "../validation/schemas.js";

const router = Router();

router.get("/api/client/profile", requireAuth, requireRoles("client"), getMyClientProfile);
router.post(
  "/api/client/activity-logs",
  requireAuth,
  requireRoles("client"),
  validateRequest({ body: clientActivityLogCreateBodySchema }),
  recordMyClientActivity
);

export default router;
