import { Router } from "express";
import { listProperties } from "../controllers/propertyController.js";

const router = Router();

router.get("/api/properties", listProperties);

export default router;
