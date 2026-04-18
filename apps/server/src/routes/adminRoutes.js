import { Router } from "express";
import {
	createScrapeSiteByAdmin,
	createUser,
	deleteScrapeSiteByAdmin,
	deleteUser,
	listScrapeSites,
	listUsers,
	updateScrapeSiteByAdmin,
	updateUser,
} from "../controllers/adminController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
	adminCreateScrapeSiteBodySchema,
	adminCreateUserBodySchema,
	adminListScrapeSitesQuerySchema,
	adminListUsersQuerySchema,
	adminUpdateScrapeSiteBodySchema,
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
router.get(
	"/api/admin/scrape-sites",
	requireAuth,
	requireRoles("admin"),
	validateRequest({ query: adminListScrapeSitesQuerySchema }),
	listScrapeSites
);
router.post(
	"/api/admin/scrape-sites",
	requireAuth,
	requireRoles("admin"),
	validateRequest({ body: adminCreateScrapeSiteBodySchema }),
	createScrapeSiteByAdmin
);
router.put(
	"/api/admin/scrape-sites/:id",
	requireAuth,
	requireRoles("admin"),
	validateRequest({ params: idParamSchema, body: adminUpdateScrapeSiteBodySchema }),
	updateScrapeSiteByAdmin
);
router.delete(
	"/api/admin/scrape-sites/:id",
	requireAuth,
	requireRoles("admin"),
	validateRequest({ params: idParamSchema }),
	deleteScrapeSiteByAdmin
);

export default router;
