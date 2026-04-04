import { Router } from "express";
import { login, me, register } from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/api/auth/register", register);
router.post("/api/auth/login", login);
router.get("/api/auth/me", requireAuth, me);

export default router;
