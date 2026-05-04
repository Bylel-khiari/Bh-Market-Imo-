import { Router } from "express";
import { login, logout, me, updatePassword } from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { authChangePasswordBodySchema, authLoginBodySchema } from "../validation/schemas.js";

const router = Router();

router.post("/api/auth/login", validateRequest({ body: authLoginBodySchema }), login);
router.post("/api/auth/logout", logout);
router.get("/api/auth/me", requireAuth, me);
router.patch(
  "/api/auth/password",
  requireAuth,
  validateRequest({ body: authChangePasswordBodySchema }),
  updatePassword
);

export default router;
