import { Router } from "express";
import { createUser, deleteUser, listUsers, updateUser } from "../controllers/adminController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/api/admin/users", requireAuth, requireRoles("responsable_decisionnel", "admin"), listUsers);
router.post("/api/admin/users", requireAuth, requireRoles("admin"), createUser);
router.put("/api/admin/users/:id", requireAuth, requireRoles("admin"), updateUser);
router.delete("/api/admin/users/:id", requireAuth, requireRoles("admin"), deleteUser);

export default router;
