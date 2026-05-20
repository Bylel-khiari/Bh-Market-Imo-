import { Router } from "express";
import {
  listAgentCreditApplications,
  listMyCreditApplications,
  scoreAgentCreditApplication,
  submitCreditApplication,
  updateAgentCreditApplication,
  viewAgentCreditApplicationDocument,
} from "../controllers/creditApplicationController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  agentListCreditApplicationsQuerySchema,
  agentUpdateCreditApplicationBodySchema,
  creditApplicationDocumentParamSchema,
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

router.get(
  "/api/agent/credit-applications/:id/documents/:documentIndex",
  requireAuth,
  requireRoles("agent_bancaire"),
  validateRequest({ params: creditApplicationDocumentParamSchema }),
  viewAgentCreditApplicationDocument
);

router.patch(
  "/api/agent/credit-applications/:id",
  requireAuth,
  requireRoles("agent_bancaire"),
  validateRequest({ params: idParamSchema, body: agentUpdateCreditApplicationBodySchema }),
  updateAgentCreditApplication
);

router.post(
  "/api/agent/credit-applications/:id/score",
  requireAuth,
  requireRoles("agent_bancaire"),
  validateRequest({ params: idParamSchema }),
  scoreAgentCreditApplication
);

export default router;
