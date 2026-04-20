// src/routes/authRoutes.ts
import { Router } from "express";
import { register, login, refreshToken } from "../controllers/authController";
import { rateLimit } from "../middleware/rateLimit";

const router = Router();

// Protect credential endpoints against brute-force.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const refreshLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/refresh", refreshLimiter, refreshToken);

export default router;
