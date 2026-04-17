import { Request, Response } from "express";
import { pool } from "../config/db";
import { spawn } from "child_process";
import path from "path";

// ──────────────────────────────────────────────────────────────────────────────
// Helper: spawn a Python script and return its stdout as parsed JSON
// ──────────────────────────────────────────────────────────────────────────────
function runPython(scriptName: string, args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, "../../../ai_scheduler", scriptName);
    const dbUrl = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

    const proc = spawn("python", [scriptPath, ...args], {
      env: { ...process.env, DATABASE_URL: dbUrl, PYTHONUNBUFFERED: "1" },
    });

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    proc.stderr.on("data", (d: Buffer) => (stderr += d.toString()));

    proc.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`Python ${scriptName} exited ${code}: ${stderr}`));
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        reject(new Error(`Invalid JSON from ${scriptName}: ${stdout.slice(0, 200)}`));
      }
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Internal: run behavior analysis via Python engine (no LLM)
// Returns { analysis, dbStats } — same shape as before
// ──────────────────────────────────────────────────────────────────────────────
async function internalAnalyzeBehavior(userId: number): Promise<{ analysis: any; dbStats: any }> {
  // Delegate entirely to the Python behavior engine — no LLM needed
  const result = await runPython("run_analyzer.py", [String(userId)]);
  return {
    analysis: result.analysis,
    dbStats:  result.db_stats,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/ai/analyze — Behavioral analysis (Python engine, no LLM)
// ──────────────────────────────────────────────────────────────────────────────
export async function analyzeUserBehavior(req: Request, res: Response) {
  const userId = (req as any).userId;
  try {
    const { analysis, dbStats } = await internalAnalyzeBehavior(userId);
    return res.json({ analysis, db_stats: dbStats, generatedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error("analyzeUserBehavior error:", err?.message ?? err);
    return res.status(500).json({ message: "Server error during behavior analysis" });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/ai/optimize — Schedule optimization (behavior engine + scheduler)
// The Python scheduler already runs with behavior hints baked in (behavior_engine.get_behavior_hints).
// This endpoint re-runs the scheduler and overlays behavioral insights on top.
// ──────────────────────────────────────────────────────────────────────────────
export async function optimizeSchedule(req: Request, res: Response) {
  const userId = (req as any).userId;

  try {
    // 1. Get behavioral insights from Python engine
    let behaviorInsights: any = {
      productive_hours: [], low_productivity_hours: [],
      preferred_task_types: [], avoided_task_types: [],
      procrastination_patterns: [], consistency_score: 50, insights: [],
    };
    let dbStats: any = null;

    try {
      const r = await internalAnalyzeBehavior(userId);
      behaviorInsights = r.analysis;
      dbStats = r.dbStats;
    } catch { /* keep defaults */ }

    // 2. Fetch what's currently on the schedule (next 7 days)
    const now  = new Date();
    const end7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const scheduleRes = await pool.query(
      `SELECT sb.start_datetime, sb.end_datetime, sb.block_type,
              t.title AS task_name, t.category, t.priority,
              t.estimated_duration_minutes
       FROM scheduled_blocks sb
       LEFT JOIN tasks t ON sb.task_id = t.id
       WHERE sb.user_id = $1
         AND sb.start_datetime >= $2 AND sb.start_datetime <= $3
       ORDER BY sb.start_datetime ASC`,
      [userId, now.toISOString(), end7.toISOString()]
    );

    const currentSchedule = scheduleRes.rows.map((r) => ({
      task_name:          r.task_name ?? r.block_type,
      category:           r.category  ?? r.block_type,
      priority:           r.priority  ?? 3,
      current_time:       new Date(r.start_datetime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      end_time:           new Date(r.end_datetime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      date:               new Date(r.start_datetime).toISOString().split("T")[0],
      estimated_minutes:  r.estimated_duration_minutes ?? 60,
    }));

    // 3. Build optimization output deterministically from behavioral data
    //    (no LLM — we classify each block as well-placed or improvable)
    const productivePeriods: string[] = behaviorInsights.productive_hours ?? [];
    const lowPeriods: string[]        = behaviorInsights.low_productivity_hours ?? [];
    const consistencyScore: number    = behaviorInsights.consistency_score ?? 50;

    const adjustedSchedule: any[] = [];
    const keptUnchanged: string[] = [];

    for (const block of currentSchedule) {
      const hour = parseInt(block.current_time.split(":")[0], 10);
      const isHighFocus = ["study", "work"].includes(block.category) && block.priority >= 4;

      // Check if block is in a low-productivity period
      const inLowPeriod = lowPeriods.some((label) => {
        const [startH] = label.split("–")[0].split(":").map(Number);
        const [endH]   = (label.split("–")[1] || "23:00").split(":").map(Number);
        return hour >= startH && hour < endH;
      });

      if (isHighFocus && inLowPeriod && productivePeriods.length > 0) {
        // Suggest moving to first productive period
        const [suggestH] = productivePeriods[0].split("–")[0].split(":").map(Number);
        adjustedSchedule.push({
          task_name:        block.task_name,
          suggested_time:   `${String(suggestH).padStart(2, "0")}:00`,
          suggested_date:   block.date,
          duration_minutes: block.estimated_minutes,
          reason: `High-focus ${block.category} task moved from low-productivity ${block.current_time} to productive window ${productivePeriods[0]}`,
        });
      } else {
        keptUnchanged.push(block.task_name);
      }
    }

    const movedCount = adjustedSchedule.length;
    const summary = movedCount > 0
      ? `Moved ${movedCount} high-focus task(s) into your productive window. ${keptUnchanged.length} task(s) are already well-placed.`
      : consistencyScore < 50
        ? `Your schedule looks manageable. With a ${consistencyScore}% completion rate, focus on completing existing blocks before adding more.`
        : `All ${keptUnchanged.length} task(s) are well-placed based on your behavioral patterns.`;

    return res.json({
      optimization: {
        adjusted_schedule:      adjustedSchedule,
        tasks_kept_unchanged:   keptUnchanged,
        optimization_summary:   summary,
      },
      behavioral_insights: behaviorInsights,
      db_stats: dbStats,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("optimizeSchedule error:", err?.message ?? err);
    return res.status(500).json({ message: "Server error during schedule optimization" });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/ai/parse-task — NLP task parser (Python regex engine, no LLM)
// ──────────────────────────────────────────────────────────────────────────────
export async function parseNaturalTask(req: Request, res: Response) {
  const { text } = req.body as { text: string };
  if (!text?.trim()) return res.status(400).json({ message: "text is required" });

  try {
    const parsed = await runPython("run_parser.py", ["--text", text.trim()]);
    if (parsed.error) {
      return res.status(422).json({ message: parsed.error });
    }
    return res.json(parsed);
  } catch (err: any) {
    console.error("parseNaturalTask error:", err?.message ?? err);
    return res.status(500).json({ message: "Failed to parse task" });
  }
}
