import { Router } from "express";
import {
	createProperty,
	createScrapeSiteByAdmin,
	createUser,
	deleteProperty,
	deleteScrapeSiteByAdmin,
	deleteUser,
	getScraperControlByAdmin,
	acceptScrapeSiteSuggestionByAdmin,
	listPropertiesByAdmin,
	listScrapeSiteSuggestionsByAdmin,
	listScrapeSites,
	listUsers,
	startScrapeSiteDiscoveryByAdmin,
	startListingCleanerByAdmin,
	startScraperByAdmin,
	stopScraperByAdmin,
	updateProperty,
	updateScraperControlByAdmin,
	updateScrapeSiteSuggestionByAdmin,
	updateScrapeSiteByAdmin,
	updateUser,
} from "../controllers/adminController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
	adminCreateScrapeSiteBodySchema,
	adminAcceptScrapeSiteSuggestionBodySchema,
	adminCreatePropertyBodySchema,
	adminCreateUserBodySchema,
	adminListPropertiesQuerySchema,
	adminListScrapeSiteSuggestionsQuerySchema,
	adminListScrapeSitesQuerySchema,
	adminListUsersQuerySchema,
	adminStartScrapeSiteDiscoveryBodySchema,
	adminStartScraperBodySchema,
	adminUpdatePropertyBodySchema,
	adminUpdateScraperControlBodySchema,
	adminUpdateScrapeSiteSuggestionBodySchema,
	adminUpdateScrapeSiteBodySchema,
	adminUpdateUserBodySchema,
	idParamSchema,
} from "../validation/schemas.js";

const router = Router();

router.get(
	"/api/admin/users",
	requireAuth,
	requireRoles("admin"),
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
	"/api/admin/properties",
	requireAuth,
	requireRoles("admin"),
	validateRequest({ query: adminListPropertiesQuerySchema }),
	listPropertiesByAdmin
);
router.post(
	"/api/admin/properties",
	requireAuth,
	requireRoles("admin"),
	validateRequest({ body: adminCreatePropertyBodySchema }),
	createProperty
);
router.put(
	"/api/admin/properties/:id",
	requireAuth,
	requireRoles("admin"),
	validateRequest({ params: idParamSchema, body: adminUpdatePropertyBodySchema }),
	updateProperty
);
router.delete(
	"/api/admin/properties/:id",
	requireAuth,
	requireRoles("admin"),
	validateRequest({ params: idParamSchema }),
	deleteProperty
);
router.get(
	"/api/admin/scraper-control",
	requireAuth,
	requireRoles("admin"),
	getScraperControlByAdmin
);
router.put(
	"/api/admin/scraper-control",
	requireAuth,
	requireRoles("admin"),
	validateRequest({ body: adminUpdateScraperControlBodySchema }),
	updateScraperControlByAdmin
);
router.post(
	"/api/admin/scraper-control/start",
	requireAuth,
	requireRoles("admin"),
	validateRequest({ body: adminStartScraperBodySchema }),
	startScraperByAdmin
);
router.post(
	"/api/admin/scraper-control/cleaner/start",
	requireAuth,
	requireRoles("admin"),
	startListingCleanerByAdmin
);
router.post(
	"/api/admin/scraper-control/stop",
	requireAuth,
	requireRoles("admin"),
	stopScraperByAdmin
);
router.get(
	"/api/admin/scrape-site-suggestions",
	requireAuth,
	requireRoles("admin"),
	validateRequest({ query: adminListScrapeSiteSuggestionsQuerySchema }),
	listScrapeSiteSuggestionsByAdmin
);
router.post(
	"/api/admin/scrape-site-discovery/start",
	requireAuth,
	requireRoles("admin"),
	validateRequest({ body: adminStartScrapeSiteDiscoveryBodySchema }),
	startScrapeSiteDiscoveryByAdmin
);
router.patch(
	"/api/admin/scrape-site-suggestions/:id",
	requireAuth,
	requireRoles("admin"),
	validateRequest({ params: idParamSchema, body: adminUpdateScrapeSiteSuggestionBodySchema }),
	updateScrapeSiteSuggestionByAdmin
);
router.post(
	"/api/admin/scrape-site-suggestions/:id/accept",
	requireAuth,
	requireRoles("admin"),
	validateRequest({ params: idParamSchema, body: adminAcceptScrapeSiteSuggestionBodySchema }),
	acceptScrapeSiteSuggestionByAdmin
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
