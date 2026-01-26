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
} from "../controllers/taskController";

const router = Router();


router.get("/", authRequired, getTasks);
router.get("/:id", authRequired, getTaskById);
router.post("/", authRequired, createTask);
router.patch("/:id", authRequired, updateTask);
router.delete("/:id", authRequired, deleteTask);

router.post("/:id/checklist", authRequired, addChecklistItem);
router.patch("/checklist/:itemId", authRequired, updateChecklistItem);

export default router;
