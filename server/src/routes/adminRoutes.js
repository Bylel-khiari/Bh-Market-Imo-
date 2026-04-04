import { Router } from "express";
import { listUsers } from "../controllers/adminController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/api/admin/users", requireAuth, requireRoles("responsable_decisionnel"), listUsers);

export default router;
