import { Router } from "express";
import { dbHealth, root } from "../controllers/healthController.js";

const router = Router();

router.get("/", root);
router.get("/api/health/db", dbHealth);

export default router;
