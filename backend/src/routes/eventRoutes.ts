import { Router } from "express";
import { authRequired } from "../middleware/authMiddleware";

const router = Router();

// GET all events (placeholder)
router.get("/", authRequired, (_req, res) => {
  res.json([]);
});

// POST create event (placeholder)
router.post("/", authRequired, (_req, res) => {
  res.status(201).json({ message: "Event created (placeholder)" });
});

export default router;
