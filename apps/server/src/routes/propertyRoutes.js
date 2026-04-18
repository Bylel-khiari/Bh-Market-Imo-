import { Router } from "express";
import {
  addMyFavorite,
  listMyFavorites,
  listProperties,
  removeMyFavorite,
} from "../controllers/propertyController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  favoriteListQuerySchema,
  idParamSchema,
  propertyListQuerySchema,
} from "../validation/schemas.js";

const router = Router();

router.get("/api/properties", validateRequest({ query: propertyListQuerySchema }), listProperties);
router.get(
  "/api/favorites",
  requireAuth,
  requireRoles("client"),
  validateRequest({ query: favoriteListQuerySchema }),
  listMyFavorites
);
router.post(
  "/api/properties/:id/favorite",
  requireAuth,
  requireRoles("client"),
  validateRequest({ params: idParamSchema }),
  addMyFavorite
);
router.delete(
  "/api/properties/:id/favorite",
  requireAuth,
  requireRoles("client"),
  validateRequest({ params: idParamSchema }),
  removeMyFavorite
);

export default router;
