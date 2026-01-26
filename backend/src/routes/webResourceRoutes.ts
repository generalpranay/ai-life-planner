
import { Router } from "express";
import { authRequired } from "../middleware/authMiddleware";
import {
    getWebResources,
    createWebResource,
    deleteWebResource,
} from "../controllers/webResourceController";

const router = Router();

router.get("/", authRequired, getWebResources);
router.post("/", authRequired, createWebResource);
router.delete("/:id", authRequired, deleteWebResource);

export default router;
