import { Router } from "express";
import {
  forgotPassword,
  login,
  logout,
  me,
  resetPassword,
  updatePassword,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  authChangePasswordBodySchema,
  authForgotPasswordBodySchema,
  authLoginBodySchema,
  authResetPasswordBodySchema,
} from "../validation/schemas.js";

const router = Router();

router.post("/api/auth/login", validateRequest({ body: authLoginBodySchema }), login);
router.post("/api/auth/logout", logout);
router.post(
  "/api/auth/forgot-password",
  validateRequest({ body: authForgotPasswordBodySchema }),
  forgotPassword
);
router.post(
  "/api/auth/reset-password",
  validateRequest({ body: authResetPasswordBodySchema }),
  resetPassword
);
router.get("/api/auth/me", requireAuth, me);
router.patch(
  "/api/auth/password",
  requireAuth,
  validateRequest({ body: authChangePasswordBodySchema }),
  updatePassword
);

export default router;
