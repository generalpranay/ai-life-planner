import { Router } from "express";
import { authRequired } from "../middleware/authMiddleware";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  addChecklistItem,
  updateChecklistItem,
  resolveConflict,
} from "../controllers/taskController";

const router = Router();

// Specific named routes must come before parameterized routes
router.post("/resolve-conflict", authRequired, resolveConflict);
router.patch("/checklist/:itemId", authRequired, updateChecklistItem);

router.get("/", authRequired, getTasks);
router.post("/", authRequired, createTask);
router.get("/:id", authRequired, getTaskById);
router.patch("/:id", authRequired, updateTask);
router.delete("/:id", authRequired, deleteTask);
router.post("/:id/checklist", authRequired, addChecklistItem);

export default router;
