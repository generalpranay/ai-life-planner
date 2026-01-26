// src/controllers/scheduleController.ts
import { Request, Response } from "express";
import { pool } from "../config/db";

/**
 * Scheduler v1 (Deterministic)
 * - Fixed events first
 * - Then tasks sorted by due date + priority
 * - Creates study blocks in free time
 */
// Get today's schedule with task details
export async function getTodaySchedule(req: Request, res: Response) {
  const userId = (req as any).userId;

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  try {
    const result = await pool.query(
      `
      SELECT 
        sb.id,
        sb.block_type,
        sb.start_datetime,
        sb.end_datetime,
        sb.task_id,
        t.title as task_title,
        t.description as task_description,
        t.todays_goal,
        (SELECT COUNT(*) FROM checklist_items ci WHERE ci.task_id = t.id) as checklist_total,
        (SELECT COUNT(*) FROM checklist_items ci WHERE ci.task_id = t.id AND ci.done = TRUE) as checklist_done
      FROM scheduled_blocks sb
      LEFT JOIN tasks t ON sb.task_id = t.id
      WHERE sb.user_id = $1
        AND sb.start_datetime BETWEEN $2 AND $3
      ORDER BY sb.start_datetime
    `,
      [userId, start, end]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("getTodaySchedule error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Get weekly schedule
export async function getWeekSchedule(req: Request, res: Response) {
  const userId = (req as any).userId;

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setDate(end.getDate() + 7);
  end.setHours(23, 59, 59, 999);

  try {
    const result = await pool.query(
      `
      SELECT 
        sb.id,
        sb.block_type,
        sb.start_datetime,
        sb.end_datetime,
        sb.task_id,
        t.title as task_title,
        t.description as task_description,
        t.todays_goal,
        (SELECT COUNT(*) FROM checklist_items ci WHERE ci.task_id = t.id) as checklist_total,
        (SELECT COUNT(*) FROM checklist_items ci WHERE ci.task_id = t.id AND ci.done = TRUE) as checklist_done
      FROM scheduled_blocks sb
      LEFT JOIN tasks t ON sb.task_id = t.id
      WHERE sb.user_id = $1
        AND sb.start_datetime BETWEEN $2 AND $3
      ORDER BY sb.start_datetime
    `,
      [userId, start, end]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("getWeekSchedule error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
// Generate weekly schedule using AI Scheduler (Python)
export async function generateWeekSchedule(req: Request, res: Response) {
  const userId = (req as any).userId;
  const startDate = req.body.startDate || new Date().toISOString();

  try {
    const { spawn } = require("child_process");
    const path = require("path");

    // Construct path to python script
    // __dirname is .../backend/src/controllers or .../backend/dist/controllers
    // relative path to project root is ../../../
    const scriptPath = path.resolve(
      __dirname,
      "../../../ai_scheduler/run_scheduler.py"
    );

    // Construct DATABASE_URL for Python
    const dbUrl = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

    const pythonProcess = spawn("python", [scriptPath, userId.toString(), "--start-date", startDate], {
      env: {
        ...process.env,
        DATABASE_URL: dbUrl,
        PYTHONUNBUFFERED: "1"
      }
    });

    let stdoutData = "";
    let stderrData = "";

    pythonProcess.stdout.on("data", (data: any) => {
      stdoutData += data.toString();
    });

    pythonProcess.stderr.on("data", (data: any) => {
      stderrData += data.toString();
    });

    pythonProcess.on("close", (code: number) => {
      if (code !== 0) {
        console.error("AI Scheduler failed:", stderrData);
        return res.status(500).json({
          message: "AI Scheduler failed to generate schedule",
          details: stderrData
        });
      }

      try {
        const result = JSON.parse(stdoutData);
        res.json(result);
      } catch (e) {
        console.error("Failed to parse AI output:", stdoutData);
        res.status(500).json({ message: "Invalid output from AI Scheduler" });
      }
    });

  } catch (err) {
    console.error("generateWeekSchedule error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Clear all scheduled blocks for a user
export async function clearSchedule(req: Request, res: Response) {
  const userId = (req as any).userId;

  try {
    // Delete all scheduled blocks for this user
    await pool.query(
      "DELETE FROM scheduled_blocks WHERE user_id = $1",
      [userId]
    );

    // Also delete non-recurring tasks to prevent them from hitting the schedule again
    const result = await pool.query(
      "DELETE FROM tasks WHERE user_id = $1 AND is_recurring = FALSE",
      [userId]
    );

    res.json({
      message: "Schedule and tasks cleared successfully",
      deletedCount: result.rowCount || 0
    });
  } catch (err) {
    console.error("clearSchedule error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
