// src/routes/scheduleRoutes.ts
import { Router } from "express";
import { authRequired } from "../middleware/authMiddleware";
import { generateWeekSchedule, getTodaySchedule, getWeekSchedule, clearSchedule } from "../controllers/scheduleController";

const router = Router();

/**
 * Generate weekly schedule
 * POST /api/schedule/generate-week
 */
router.post("/generate-week", authRequired, generateWeekSchedule);

router.get("/today", authRequired, getTodaySchedule);
router.get("/week", authRequired, getWeekSchedule);
router.delete("/clear", authRequired, clearSchedule);

export default router;
