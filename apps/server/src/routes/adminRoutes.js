import { Router } from "express";
import { createUser, deleteUser, listUsers, updateUser } from "../controllers/adminController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
	adminCreateUserBodySchema,
	adminListUsersQuerySchema,
	adminUpdateUserBodySchema,
	idParamSchema,
} from "../validation/schemas.js";

const router = Router();

router.get(
	"/api/admin/users",
	requireAuth,
	requireRoles("responsable_decisionnel", "admin"),
	validateRequest({ query: adminListUsersQuerySchema }),
	listUsers
);
router.post(
	"/api/admin/users",
	requireAuth,
	requireRoles("admin"),
	validateRequest({ body: adminCreateUserBodySchema }),
	createUser
);
router.put(
	"/api/admin/users/:id",
	requireAuth,
	requireRoles("admin"),
	validateRequest({ params: idParamSchema, body: adminUpdateUserBodySchema }),
	updateUser
);
router.delete(
	"/api/admin/users/:id",
	requireAuth,
	requireRoles("admin"),
	validateRequest({ params: idParamSchema }),
	deleteUser
);

export default router;
