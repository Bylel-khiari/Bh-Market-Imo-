import { Router } from "express";
import {
  listAgentCreditApplications,
  listMyCreditApplications,
  submitCreditApplication,
  updateAgentCreditApplication,
} from "../controllers/creditApplicationController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  agentListCreditApplicationsQuerySchema,
  agentUpdateCreditApplicationBodySchema,
  creditApplicationCreateBodySchema,
  creditApplicationListQuerySchema,
  idParamSchema,
} from "../validation/schemas.js";

const router = Router();

router.post(
  "/api/credit-applications",
  requireAuth,
  requireRoles("client"),
  validateRequest({ body: creditApplicationCreateBodySchema }),
  submitCreditApplication
);

router.get(
  "/api/client/credit-applications",
  requireAuth,
  requireRoles("client"),
  validateRequest({ query: creditApplicationListQuerySchema }),
  listMyCreditApplications
);

router.get(
  "/api/agent/credit-applications",
  requireAuth,
  requireRoles("agent_bancaire"),
  validateRequest({ query: agentListCreditApplicationsQuerySchema }),
  listAgentCreditApplications
);

router.patch(
  "/api/agent/credit-applications/:id",
  requireAuth,
  requireRoles("agent_bancaire"),
  validateRequest({ params: idParamSchema, body: agentUpdateCreditApplicationBodySchema }),
  updateAgentCreditApplication
);

export default router;
