import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes";
import taskRoutes from "./routes/taskRoutes";
import eventRoutes from "./routes/eventRoutes";
import scheduleRoutes from "./routes/scheduleRoutes";
import webResourceRoutes from "./routes/webResourceRoutes";
import aiRoutes from "./routes/aiRoutes";

dotenv.config();

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "AI Life Planner API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/web-resources", webResourceRoutes);
app.use("/api/ai", aiRoutes);

export default app;