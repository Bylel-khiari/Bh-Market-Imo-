import { Router } from "express";

import { chatWithAssistant } from "../controllers/assistantController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { assistantChatBodySchema } from "../validation/assistantValidation.js";

const router = Router();

router.post(
  "/api/assistant/chat",
  validateRequest({ body: assistantChatBodySchema }),
  chatWithAssistant
);

export default router;

