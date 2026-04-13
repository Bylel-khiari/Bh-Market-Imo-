import { Router } from "express";
import { login, me, register } from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { authLoginBodySchema, authRegisterBodySchema } from "../validation/schemas.js";

const router = Router();

router.post("/api/auth/register", validateRequest({ body: authRegisterBodySchema }), register);
router.post("/api/auth/login", validateRequest({ body: authLoginBodySchema }), login);
router.get("/api/auth/me", requireAuth, me);

export default router;
