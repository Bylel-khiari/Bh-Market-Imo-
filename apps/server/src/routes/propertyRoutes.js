import { Router } from "express";
import { listProperties } from "../controllers/propertyController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { propertyListQuerySchema } from "../validation/schemas.js";

const router = Router();

router.get("/api/properties", validateRequest({ query: propertyListQuerySchema }), listProperties);

export default router;
