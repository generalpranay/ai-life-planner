import { Router } from "express";
import { authRequired } from "../middleware/authMiddleware";
import { analyzeUserBehavior, optimizeSchedule, parseNaturalTask } from "../controllers/aiController";

const router = Router();

// POST /api/ai/analyze  — runs behavioral analysis via Gemini
router.post("/analyze", authRequired, analyzeUserBehavior);

// POST /api/ai/optimize — intelligent schedule optimization via Gemini
router.post("/optimize", authRequired, optimizeSchedule);
router.post("/parse-task", authRequired, parseNaturalTask);

export default router;
