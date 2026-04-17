// src/controllers/scheduleController.ts
import { Request, Response } from "express";
import { spawn } from "child_process";
import path from "path";
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
        sb.completed,
        sb.completed_at,
        sb.skipped_at,
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
        sb.completed,
        sb.completed_at,
        sb.skipped_at,
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
    // Construct path to python script
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

// Mark a schedule block as completed and update streak
export async function completeBlock(req: Request, res: Response) {
  const userId = (req as any).userId;
  const blockId = parseInt(req.params.id);
  const { completed } = req.body as { completed: boolean };

  try {
    const result = await pool.query(
      `UPDATE scheduled_blocks
       SET completed    = $1,
           completed_at = CASE WHEN $1 = TRUE THEN NOW() ELSE NULL END,
           skipped_at   = NULL
       WHERE id = $2 AND user_id = $3
       RETURNING task_id`,
      [completed, blockId, userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Block not found" });

    const taskId = result.rows[0].task_id;

    // Keep task status in sync for non-recurring tasks
    if (taskId) {
      if (completed) {
        await pool.query(
          `UPDATE tasks SET status = 'completed', completed_at = NOW(), skipped_at = NULL
           WHERE id = $1 AND user_id = $2 AND is_recurring = FALSE`,
          [taskId, userId]
        );
      } else {
        await pool.query(
          `UPDATE tasks SET status = 'pending', completed_at = NULL
           WHERE id = $1 AND user_id = $2 AND is_recurring = FALSE`,
          [taskId, userId]
        );
      }
    }

    if (completed) {
      const today = new Date().toISOString().split("T")[0];
      await pool.query(
        `INSERT INTO completion_streaks (user_id, current_streak, longest_streak, last_completed_date)
         VALUES ($1, 1, 1, $2)
         ON CONFLICT (user_id) DO UPDATE SET
           current_streak = CASE
             WHEN completion_streaks.last_completed_date = ($2::date - INTERVAL '1 day')::date THEN completion_streaks.current_streak + 1
             WHEN completion_streaks.last_completed_date = $2::date THEN completion_streaks.current_streak
             ELSE 1
           END,
           longest_streak = GREATEST(completion_streaks.longest_streak,
             CASE
               WHEN completion_streaks.last_completed_date = ($2::date - INTERVAL '1 day')::date THEN completion_streaks.current_streak + 1
               ELSE 1
             END),
           last_completed_date = $2`,
        [userId, today]
      );
    }

    res.json({ success: true, completed });
  } catch (err) {
    console.error("completeBlock error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Mark a schedule block as skipped
export async function skipBlock(req: Request, res: Response) {
  const userId = (req as any).userId;
  const blockId = parseInt(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE scheduled_blocks
       SET skipped_at  = NOW(),
           completed   = FALSE,
           completed_at = NULL
       WHERE id = $1 AND user_id = $2
       RETURNING task_id`,
      [blockId, userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Block not found" });

    const taskId = result.rows[0].task_id;

    // Mark non-recurring tasks as skipped at the task level too
    if (taskId) {
      await pool.query(
        `UPDATE tasks SET status = 'skipped', skipped_at = NOW(), completed_at = NULL
         WHERE id = $1 AND user_id = $2 AND is_recurring = FALSE`,
        [taskId, userId]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error("skipBlock error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Get user's current streak
export async function getStreak(req: Request, res: Response) {
  const userId = (req as any).userId;
  try {
    const result = await pool.query(
      `SELECT current_streak, longest_streak, last_completed_date FROM completion_streaks WHERE user_id = $1`,
      [userId]
    );
    const row = result.rows[0];
    if (!row) return res.json({ current_streak: 0, longest_streak: 0 });

    // Reset streak if last completion was >1 day ago
    const today = new Date().toISOString().split("T")[0];
    const last = row.last_completed_date?.toISOString().split("T")[0];
    const daysDiff = last ? Math.floor((new Date(today).getTime() - new Date(last).getTime()) / 86400000) : 999;
    const current = daysDiff > 1 ? 0 : row.current_streak;

    res.json({ current_streak: current, longest_streak: row.longest_streak });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

// Clear all scheduled blocks for a user (tasks are preserved)
export async function clearSchedule(req: Request, res: Response) {
  const userId = (req as any).userId;

  try {
    const result = await pool.query(
      "DELETE FROM scheduled_blocks WHERE user_id = $1",
      [userId]
    );

    res.json({
      message: "Schedule cleared successfully. Tasks have been preserved.",
      deletedCount: result.rowCount || 0,
    });
  } catch (err) {
    console.error("clearSchedule error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
