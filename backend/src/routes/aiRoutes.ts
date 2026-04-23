import { Router } from "express";
import { authRequired } from "../middleware/authMiddleware";
import { analyzeUserBehavior, optimizeSchedule, parseNaturalTask, detectDayRisks, predictDayRisks, applyRiskAction, decomposeGoal } from "../controllers/aiController";

const router = Router();

// POST /api/ai/analyze  — runs behavioral analysis via Gemini
router.post("/analyze", authRequired, analyzeUserBehavior);

// POST /api/ai/optimize — intelligent schedule optimization via Gemini
router.post("/optimize", authRequired, optimizeSchedule);
router.post("/parse-task", authRequired, parseNaturalTask);
router.post("/detect-risks", authRequired, detectDayRisks);

// Proactive risk prediction (uses DB history, no body needed)
router.get("/predict-risks", authRequired, predictDayRisks);
router.post("/risk-action",  authRequired, applyRiskAction);
router.post("/decompose-goal", authRequired, decomposeGoal);

export default router;
