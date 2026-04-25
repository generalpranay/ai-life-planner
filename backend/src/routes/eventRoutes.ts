import { Router } from "express";
import { authRequired } from "../middleware/authMiddleware";
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../controllers/eventController";

const router = Router();

router.get("/", authRequired, getEvents);
router.get("/:id", authRequired, getEventById);
router.post("/", authRequired, createEvent);
router.patch("/:id", authRequired, updateEvent);
router.put("/:id", authRequired, updateEvent);
router.delete("/:id", authRequired, deleteEvent);

export default router;
