import { Request, Response } from "express";
import { pool } from "../config/db";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ──────────────────────────────────────────────────────────────────────────────
// Helper: strip markdown fences Gemini sometimes wraps around JSON
// ──────────────────────────────────────────────────────────────────────────────
function stripFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

// ──────────────────────────────────────────────────────────────────────────────
// Internal: fetch behavioral analysis for a user (reusable by other functions)
// ──────────────────────────────────────────────────────────────────────────────
async function internalAnalyzeBehavior(userId: number): Promise<any> {
  // 1. User profile
  const userRes = await pool.query(
    "SELECT sleep_time, wake_time, preferred_work_hours FROM users WHERE id = $1",
    [userId]
  );
  const profile = userRes.rows[0] ?? {
    sleep_time: "23:30",
    wake_time: "07:30",
    preferred_work_hours: "unknown",
  };

  // 2. Task history (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const taskRes = await pool.query(
    `SELECT
       t.title         AS task_name,
       t.category,
       sb.start_datetime AS scheduled_time,
       t.status,
       t.updated_at    AS completion_time
     FROM tasks t
     LEFT JOIN scheduled_blocks sb ON sb.task_id = t.id
     WHERE t.user_id = $1
       AND (sb.start_datetime >= $2 OR sb.start_datetime IS NULL)
     ORDER BY sb.start_datetime ASC
     LIMIT 100`,
    [userId, thirtyDaysAgo.toISOString()]
  );

  const taskHistory = taskRes.rows.map((row) => ({
    task_name: row.task_name,
    category: row.category ?? "uncategorized",
    scheduled_time: row.scheduled_time
      ? new Date(row.scheduled_time).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null,
    completed: row.status === "completed",
    completion_time:
      row.status === "completed" && row.completion_time
        ? new Date(row.completion_time).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : null,
  }));

  // 3. Prompt
  const inputPayload = {
    user_profile: {
      preferred_work_hours: profile.preferred_work_hours ?? "unknown",
      sleep_time: profile.sleep_time ?? "23:30",
      wake_time: profile.wake_time ?? "07:30",
    },
    task_history: taskHistory,
    date: new Date().toISOString().split("T")[0],
  };

  const systemPrompt = `You are an AI behavior analyst inside a smart life planning app.
Analyze the user's task history and identify behavioral patterns.

Focus on:
1. Time-of-day productivity trends
2. Task completion vs failure patterns
3. Categories the user avoids or prefers
4. Signs of procrastination
5. Consistency patterns

Return ONLY a valid JSON object (no markdown, no extra text):
{
  "productive_hours": [],
  "low_productivity_hours": [],
  "preferred_task_types": [],
  "avoided_task_types": [],
  "procrastination_patterns": [],
  "consistency_score": 0,
  "insights": []
}

Be precise and base everything strictly on the data provided.`;

  const userMessage = `Here is the user data:\n${JSON.stringify(inputPayload, null, 2)}`;

  // 4. Call Gemini
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent([systemPrompt, userMessage]);
  const rawText = result.response.text().trim();
  return JSON.parse(stripFences(rawText));
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/ai/analyze — Behavioral analysis
// ──────────────────────────────────────────────────────────────────────────────
export async function analyzeUserBehavior(req: Request, res: Response) {
  const userId = (req as any).userId;
  try {
    const analysis = await internalAnalyzeBehavior(userId);
    return res.json({ analysis, generatedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error("analyzeUserBehavior error:", err?.message ?? err);
    return res.status(500).json({ message: "Server error during AI analysis" });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/ai/optimize — Intelligent schedule optimization
// ──────────────────────────────────────────────────────────────────────────────
export async function optimizeSchedule(req: Request, res: Response) {
  const userId = (req as any).userId;

  try {
    // ── 1. Get behavioral insights ──────────────────────────────────────────
    let behaviorInsights: any;
    try {
      behaviorInsights = await internalAnalyzeBehavior(userId);
    } catch {
      // If analysis fails (e.g. not enough data), use safe defaults
      behaviorInsights = {
        productive_hours: ["09:00-12:00"],
        low_productivity_hours: ["14:00-16:00"],
        preferred_task_types: [],
        avoided_task_types: [],
        procrastination_patterns: [],
        consistency_score: 50,
        insights: [],
      };
    }

    // ── 2. Fetch current schedule (next 48 hours) ───────────────────────────
    const now = new Date();
    const end48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const scheduleRes = await pool.query(
      `SELECT
         sb.id,
         sb.start_datetime,
         sb.end_datetime,
         sb.block_type,
         t.title       AS task_name,
         t.category,
         t.priority,
         t.estimated_duration_minutes
       FROM scheduled_blocks sb
       LEFT JOIN tasks t ON sb.task_id = t.id
       WHERE sb.user_id = $1
         AND sb.start_datetime >= $2
         AND sb.start_datetime <= $3
       ORDER BY sb.start_datetime ASC`,
      [userId, now.toISOString(), end48h.toISOString()]
    );

    const currentSchedule = scheduleRes.rows.map((row) => ({
      task_name: row.task_name ?? row.block_type,
      category: row.category ?? row.block_type,
      priority: row.priority ?? 3,
      current_time: new Date(row.start_datetime).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      end_time: new Date(row.end_datetime).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      date: new Date(row.start_datetime).toISOString().split("T")[0],
      estimated_minutes: row.estimated_duration_minutes ?? 60,
    }));

    // ── 3. Also fetch unscheduled tasks (pending, no block yet) ─────────────
    const unscheduledRes = await pool.query(
      `SELECT t.title AS task_name, t.category, t.priority,
              t.estimated_duration_minutes, t.due_datetime
       FROM tasks t
       WHERE t.user_id = $1
         AND t.status != 'completed'
         AND t.id NOT IN (
           SELECT COALESCE(task_id, 0) FROM scheduled_blocks
           WHERE user_id = $1
             AND start_datetime >= $2
         )
       ORDER BY t.priority DESC, t.due_datetime ASC NULLS LAST
       LIMIT 20`,
      [userId, now.toISOString()]
    );

    const unscheduledTasks = unscheduledRes.rows.map((row) => ({
      task_name: row.task_name,
      category: row.category ?? "uncategorized",
      priority: row.priority ?? 3,
      estimated_minutes: row.estimated_duration_minutes ?? 60,
      due: row.due_datetime
        ? new Date(row.due_datetime).toISOString().split("T")[0]
        : null,
    }));

    // ── 4. Build Gemini prompt ──────────────────────────────────────────────
    const optimizePayload = {
      behavioral_insights: behaviorInsights,
      current_schedule: currentSchedule,
      unscheduled_tasks: unscheduledTasks,
      current_date: now.toISOString().split("T")[0],
      current_time: now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const systemPrompt = `You are an intelligent scheduling engine inside a smart life planning app.

Using the user's behavioral insights and their current schedule, optimize task placement.

Rules:
- Place high-focus tasks (categories: "study", "work"; priority 4-5) during productive hours
- Avoid scheduling difficult tasks during low-energy / low-productivity times
- Reduce overload if the user has a history of skipping tasks (check consistency_score; below 50 means reduce load)
- Maintain realistic spacing between tasks (at least 15 min gaps)
- Keep task durations realistic based on estimated_minutes
- If there are unscheduled pending tasks, suggest optimal times for them too
- Do NOT schedule anything during sleep hours
- Only rearrange tasks that would benefit from moving; leave well-placed ones alone

Return ONLY a valid JSON object (no markdown, no extra text):
{
  "adjusted_schedule": [
    {
      "task_name": "string",
      "suggested_time": "HH:MM",
      "suggested_date": "YYYY-MM-DD",
      "duration_minutes": number,
      "reason": "brief explanation of why this placement is optimal"
    }
  ],
  "tasks_kept_unchanged": ["task names that are already well-placed"],
  "optimization_summary": "1-2 sentence overview of what was changed and why"
}

Explain each decision briefly. Base everything on the behavioral data provided.`;

    const userMessage = `Here is the scheduling data:\n${JSON.stringify(optimizePayload, null, 2)}`;

    // ── 5. Call Gemini ──────────────────────────────────────────────────────
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([systemPrompt, userMessage]);
    const rawText = result.response.text().trim();

    let optimization: any;
    try {
      optimization = JSON.parse(stripFences(rawText));
    } catch {
      console.error("Gemini optimize returned non-JSON:\n", rawText);
      return res.status(502).json({
        message: "AI returned an unexpected format. Please try again.",
      });
    }

    return res.json({
      optimization,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("optimizeSchedule error:", err?.message ?? err);
    return res
      .status(500)
      .json({ message: "Server error during schedule optimization" });
  }
}
