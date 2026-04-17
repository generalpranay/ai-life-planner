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
// Returns { analysis, dbStats } where dbStats are DB-computed facts.
// ──────────────────────────────────────────────────────────────────────────────
async function internalAnalyzeBehavior(userId: number): Promise<{ analysis: any; dbStats: any }> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Run all DB queries in parallel for speed
  const [userRes, consistencyRes, categoryRes, bucketRes, taskRes] = await Promise.all([
    // 1. User profile
    pool.query(
      "SELECT sleep_time, wake_time, preferred_work_hours FROM users WHERE id = $1",
      [userId]
    ),
    // 2. Block-level completion/skip totals → DB-computed consistency score
    pool.query(
      `SELECT
         COUNT(*)                                             AS total_blocks,
         COUNT(*) FILTER (WHERE completed = TRUE)             AS completed_blocks,
         COUNT(*) FILTER (WHERE skipped_at IS NOT NULL)       AS skipped_blocks
       FROM scheduled_blocks
       WHERE user_id = $1
         AND start_datetime >= $2
         AND task_id IS NOT NULL`,
      [userId, thirtyDaysAgo.toISOString()]
    ),
    // 3. Per-category success rates (task level)
    pool.query(
      `SELECT
         COALESCE(category, 'uncategorized')                          AS category,
         COUNT(*)                                                      AS total,
         COUNT(*) FILTER (WHERE status = 'completed')                 AS completed,
         COUNT(*) FILTER (WHERE status = 'skipped')                   AS skipped,
         ROUND(
           100.0 * COUNT(*) FILTER (WHERE status = 'completed')
           / NULLIF(COUNT(*), 0), 1
         )                                                            AS success_rate
       FROM tasks
       WHERE user_id = $1 AND created_at >= $2
       GROUP BY category
       ORDER BY success_rate DESC NULLS LAST`,
      [userId, thirtyDaysAgo.toISOString()]
    ),
    // 4. Time-of-day bucket stats (block level)
    pool.query(
      `SELECT
         CASE
           WHEN EXTRACT(HOUR FROM start_datetime) >= 5  AND EXTRACT(HOUR FROM start_datetime) < 12 THEN 'morning'
           WHEN EXTRACT(HOUR FROM start_datetime) >= 12 AND EXTRACT(HOUR FROM start_datetime) < 17 THEN 'afternoon'
           WHEN EXTRACT(HOUR FROM start_datetime) >= 17 AND EXTRACT(HOUR FROM start_datetime) < 21 THEN 'evening'
           ELSE 'night'
         END                                                          AS period,
         COUNT(*)                                                      AS total,
         COUNT(*) FILTER (WHERE completed = TRUE)                     AS completed,
         COUNT(*) FILTER (WHERE skipped_at IS NOT NULL)               AS skipped,
         ROUND(
           100.0 * COUNT(*) FILTER (WHERE completed = TRUE)
           / NULLIF(COUNT(*), 0), 1
         )                                                            AS success_rate
       FROM scheduled_blocks
       WHERE user_id = $1
         AND start_datetime >= $2
         AND task_id IS NOT NULL
       GROUP BY period
       ORDER BY success_rate DESC NULLS LAST`,
      [userId, thirtyDaysAgo.toISOString()]
    ),
    // 5. Recent task history for Gemini context
    pool.query(
      `SELECT
         t.title           AS task_name,
         t.category,
         sb.start_datetime AS scheduled_time,
         t.status,
         t.completed_at,
         t.skipped_at
       FROM tasks t
       LEFT JOIN scheduled_blocks sb ON sb.task_id = t.id
       WHERE t.user_id = $1
         AND (sb.start_datetime >= $2 OR sb.start_datetime IS NULL)
       ORDER BY sb.start_datetime ASC
       LIMIT 80`,
      [userId, thirtyDaysAgo.toISOString()]
    ),
  ]);

  const profile = userRes.rows[0] ?? { sleep_time: "23:30", wake_time: "07:30", preferred_work_hours: "unknown" };

  // Build DB stats object
  const cs = consistencyRes.rows[0];
  const totalBlocks     = Number(cs.total_blocks)     || 0;
  const completedBlocks = Number(cs.completed_blocks) || 0;
  const skippedBlocks   = Number(cs.skipped_blocks)   || 0;
  const dbConsistencyScore = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0;

  const dbStats = {
    consistency_score:  dbConsistencyScore,
    total_blocks:       totalBlocks,
    completed_blocks:   completedBlocks,
    skipped_blocks:     skippedBlocks,
    skip_rate:          totalBlocks > 0 ? Math.round((skippedBlocks / totalBlocks) * 100) : 0,
    category_stats: categoryRes.rows.map((r) => ({
      category:     r.category,
      total:        Number(r.total),
      completed:    Number(r.completed),
      skipped:      Number(r.skipped),
      success_rate: Number(r.success_rate) || 0,
    })),
    time_bucket_stats: bucketRes.rows.map((r) => ({
      period:       r.period,
      total:        Number(r.total),
      completed:    Number(r.completed),
      skipped:      Number(r.skipped),
      success_rate: Number(r.success_rate) || 0,
    })),
  };

  const taskHistory = taskRes.rows.map((row) => ({
    task_name:      row.task_name,
    category:       row.category ?? "uncategorized",
    scheduled_time: row.scheduled_time
      ? new Date(row.scheduled_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : null,
    status:         row.status,
    completed_at:   row.completed_at
      ? new Date(row.completed_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : null,
    skipped_at:     row.skipped_at
      ? new Date(row.skipped_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : null,
  }));

  // Build Gemini prompt with pre-computed stats as ground truth
  const inputPayload = {
    user_profile: {
      preferred_work_hours: profile.preferred_work_hours ?? "unknown",
      sleep_time:  profile.sleep_time  ?? "23:30",
      wake_time:   profile.wake_time   ?? "07:30",
    },
    db_computed_stats: {
      consistency_score:           dbConsistencyScore,
      skip_rate_percent:           dbStats.skip_rate,
      category_success_rates:      dbStats.category_stats,
      time_of_day_success_rates:   dbStats.time_bucket_stats,
    },
    task_history: taskHistory,
    date: new Date().toISOString().split("T")[0],
  };

  const systemPrompt = `You are an AI behavior analyst inside a smart life planning app.
The db_computed_stats field contains ACCURATE, DATABASE-COMPUTED statistics. Trust these numbers exactly.
Use them to explain WHY the user succeeds or struggles in specific categories and time slots.

Focus on:
1. Time-of-day productivity (use time_of_day_success_rates — explain which periods are strong/weak and why)
2. Category strengths/weaknesses (use category_success_rates — call out the best and worst categories)
3. Skip/procrastination patterns (use skip_rate_percent and skipped tasks)
4. Actionable improvement suggestions based on the actual numbers

Return ONLY a valid JSON object (no markdown):
{
  "productive_hours": [],
  "low_productivity_hours": [],
  "preferred_task_types": [],
  "avoided_task_types": [],
  "procrastination_patterns": [],
  "consistency_score": ${dbConsistencyScore},
  "insights": []
}

RULES:
- Set consistency_score to exactly ${dbConsistencyScore}
- Make insights specific and data-driven (e.g. "Your morning success rate is 80% vs 40% in the evening")
- Keep each insight to one actionable sentence`;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent([
    systemPrompt,
    `User data:\n${JSON.stringify(inputPayload, null, 2)}`,
  ]);
  const analysis = JSON.parse(stripFences(result.response.text().trim()));

  // Always override with the DB-computed score
  analysis.consistency_score = dbConsistencyScore;

  return { analysis, dbStats };
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/ai/analyze — Behavioral analysis
// ──────────────────────────────────────────────────────────────────────────────
export async function analyzeUserBehavior(req: Request, res: Response) {
  const userId = (req as any).userId;
  try {
    const { analysis, dbStats } = await internalAnalyzeBehavior(userId);
    return res.json({ analysis, db_stats: dbStats, generatedAt: new Date().toISOString() });
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
      const { analysis } = await internalAnalyzeBehavior(userId);
      behaviorInsights = analysis;
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

// Parse natural language into structured task fields
export async function parseNaturalTask(req: Request, res: Response) {
  const { text } = req.body as { text: string };
  if (!text?.trim()) return res.status(400).json({ message: "text is required" });

  const today = new Date().toISOString().split("T")[0];
  const prompt = `Today is ${today}. Parse this natural language task description into a JSON object.
Input: "${text.trim()}"

Return ONLY a JSON object with these fields (omit fields you cannot determine):
{
  "title": string,
  "description": string | null,
  "category": "study" | "work" | "health" | "personal" | "other",
  "priority": 1-5 (default 3),
  "is_recurring": boolean,
  "recurrence_days": ["Mon","Tue",...] | null,
  "start_time": "HH:MM" | null,
  "end_time": "HH:MM" | null,
  "due_date": "YYYY-MM-DD" | null,
  "estimated_minutes": number | null
}

Rules:
- "every Tuesday" → is_recurring: true, recurrence_days: ["Tue"]
- "tomorrow" → due_date: ${new Date(Date.now()+86400000).toISOString().split("T")[0]}
- "6pm-8pm" → start_time: "18:00", end_time: "20:00"
- Infer category from keywords (gym/workout→health, meeting/report→work, etc.)
- Higher priority for urgent/important keywords`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const parsed = JSON.parse(stripFences(raw));
    return res.json(parsed);
  } catch (err: any) {
    console.error("parseNaturalTask error:", err?.message ?? err);
    return res.status(500).json({ message: "Failed to parse task" });
  }
}
