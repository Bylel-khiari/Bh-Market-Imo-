import { Router } from "express";
import { login, me } from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { authLoginBodySchema } from "../validation/schemas.js";

const router = Router();

router.post("/api/auth/login", validateRequest({ body: authLoginBodySchema }), login);
router.get("/api/auth/me", requireAuth, me);

export default router;
