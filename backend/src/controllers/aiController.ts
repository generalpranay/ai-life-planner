import { Request, Response } from "express";
import { pool } from "../config/db";
import { spawn } from "child_process";
import path from "path";
import { randomUUID } from "crypto";

// ──────────────────────────────────────────────────────────────────────────────
// Helper: spawn a Python script and return its stdout as parsed JSON
// ──────────────────────────────────────────────────────────────────────────────
const PYTHON_TIMEOUT_MS = Number(process.env.PYTHON_TIMEOUT_MS) || 30_000;
const PYTHON_MAX_OUTPUT = 5 * 1024 * 1024; // 5 MB

function runPython(scriptName: string, args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, "../../../ai_scheduler", scriptName);
    const dbUrl = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

    const proc = spawn("python", [scriptPath, ...args], {
      env: { ...process.env, DATABASE_URL: dbUrl, PYTHONUNBUFFERED: "1" },
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const done = (fn: () => void) => { if (!settled) { settled = true; fn(); } };

    const timeout = setTimeout(() => {
      done(() => {
        try { proc.kill("SIGKILL"); } catch { /* ignore */ }
        reject(new Error(`Python ${scriptName} timed out after ${PYTHON_TIMEOUT_MS}ms`));
      });
    }, PYTHON_TIMEOUT_MS);

    proc.stdout.on("data", (d: Buffer) => {
      stdout += d.toString();
      if (stdout.length > PYTHON_MAX_OUTPUT) {
        done(() => {
          clearTimeout(timeout);
          try { proc.kill("SIGKILL"); } catch { /* ignore */ }
          reject(new Error(`Python ${scriptName} produced too much output`));
        });
      }
    });
    proc.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
      if (stderr.length > PYTHON_MAX_OUTPUT) stderr = stderr.slice(-PYTHON_MAX_OUTPUT);
    });

    proc.on("error", (err) => {
      done(() => {
        clearTimeout(timeout);
        reject(new Error(`Failed to spawn python for ${scriptName}: ${err.message}`));
      });
    });

    proc.on("close", (code) => {
      done(() => {
        clearTimeout(timeout);
        if (code !== 0) {
          return reject(new Error(`Python ${scriptName} exited ${code}: ${stderr.slice(0, 500)}`));
        }
        try {
          resolve(JSON.parse(stdout.trim()));
        } catch {
          reject(new Error(`Invalid JSON from ${scriptName}: ${stdout.slice(0, 200)}`));
        }
      });
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
// GET /api/ai/predict-risks — Proactive risk prediction (DB-aware).
// Fetches today's blocks + 30-day skip history automatically; no body needed.
// Returns { flags: [{blockId,taskId,title,type,suggestion}], totalMins, flagCount }
// ──────────────────────────────────────────────────────────────────────────────
export async function predictDayRisks(req: Request, res: Response) {
  const userId = (req as any).userId;
  try {
    const result = await runPython("run_risk_predictor.py", [String(userId)]);
    return res.json(result);
  } catch (err: any) {
    console.error("predictDayRisks error:", err?.message ?? err);
    return res.status(500).json({ message: "Server error during risk prediction" });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/ai/risk-action — Apply a risk mitigation action.
// Body: { blockId: number, action: "move_to_tomorrow" | "defer" }
// ──────────────────────────────────────────────────────────────────────────────
export async function applyRiskAction(req: Request, res: Response) {
  const userId  = (req as any).userId;
  const { blockId, action } = req.body as { blockId: number; action: string };

  if (!blockId || !action) {
    return res.status(400).json({ message: "blockId and action are required" });
  }

  try {
    if (action === "move_to_tomorrow") {
      const result = await pool.query(
        `UPDATE scheduled_blocks
            SET start_datetime = start_datetime + INTERVAL '1 day',
                end_datetime   = end_datetime   + INTERVAL '1 day'
          WHERE id = $1 AND user_id = $2
          RETURNING id`,
        [blockId, userId]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Block not found" });
      }
      return res.json({ success: true, message: "Task moved to tomorrow" });
    }

    if (action === "defer") {
      const result = await pool.query(
        `UPDATE scheduled_blocks
            SET skipped_at = NOW(), completed = FALSE
          WHERE id = $1 AND user_id = $2
          RETURNING id`,
        [blockId, userId]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Block not found" });
      }
      return res.json({ success: true, message: "Task deferred" });
    }

    return res.status(400).json({ message: `Unknown action: ${action}` });
  } catch (err: any) {
    console.error("applyRiskAction error:", err?.message ?? err);
    return res.status(500).json({ message: "Server error applying risk action" });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/ai/detect-risks — Day risk detection (OVERLOAD / SKIP_RISK / CONFLICT)
// Body: { tasks: [{ id, title, category, scheduledTime, estimatedMins, skipRate }] }
// ──────────────────────────────────────────────────────────────────────────────
export async function detectDayRisks(req: Request, res: Response) {
  const { tasks } = req.body as { tasks: unknown[] };
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ message: "tasks must be a non-empty array" });
  }

  try {
    const result = await runPython("run_risk_detector.py", [JSON.stringify(tasks)]);
    return res.json(result);
  } catch (err: any) {
    console.error("detectDayRisks error:", err?.message ?? err);
    return res.status(500).json({ message: "Server error during risk detection" });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/ai/decompose-goal
// Body: { goal, deadline, today, weeks_available?, user_behavior? }
// Returns: { goal_id, summary, skills, weeks:[{week,milestone,focus,daily_tasks}] }
// ──────────────────────────────────────────────────────────────────────────────
const SKILL_MAP: Array<[RegExp, string]> = [
  [/react/i, "React"], [/vue/i, "Vue.js"], [/angular/i, "Angular"],
  [/javascript|js\b/i, "JavaScript"], [/typescript|ts\b/i, "TypeScript"],
  [/python/i, "Python"], [/node\.?js/i, "Node.js"], [/java\b/i, "Java"],
  [/flutter/i, "Flutter"], [/dart/i, "Dart"],
  [/sql|postgres|mysql|database/i, "SQL & Databases"],
  [/api|rest\b|graphql/i, "API Design"],
  [/docker|kubernetes/i, "Containerization"],
  [/aws|azure|gcp|cloud/i, "Cloud Services"],
  [/machine learning|deep learning|\bml\b|\bai\b/i, "Machine Learning"],
  [/git\b|version control/i, "Git"], [/html|css/i, "HTML/CSS"],
  [/figma|ui\b|ux\b|design/i, "UI/UX Design"],
  [/fitness|gym|workout|exercise/i, "Physical Training"],
  [/nutrition|diet/i, "Nutrition"], [/meditat|mindful/i, "Mindfulness"],
  [/writing|blog|content/i, "Writing"], [/marketing|seo/i, "Digital Marketing"],
  [/spanish|french|german|japanese|chinese|language/i, "Language Learning"],
  [/swift|ios/i, "iOS/Swift"], [/kotlin|android/i, "Android/Kotlin"],
  [/rust\b/i, "Rust"], [/go\b|golang/i, "Go"], [/c\+\+/i, "C++"],
];

function _extractSkills(goal: string): string[] {
  const found: string[] = [];
  for (const [re, skill] of SKILL_MAP) {
    if (re.test(goal)) found.push(skill);
  }
  if (found.length === 0) {
    const words = (goal.match(/\b[A-Za-z]{4,}\b/g) ?? [])
      .filter((w) => !["that","this","with","from","have","will","been","want","need","build","learn","make","create","become"].includes(w.toLowerCase()))
      .slice(0, 5)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    found.push(...words);
  }
  return [...new Set(found)].slice(0, 8);
}

function _inferCategory(goal: string): "study" | "work" | "health" | "personal" {
  const g = goal.toLowerCase();
  if (/fitness|gym|run|health|diet|weight|exercise|workout|yoga|meditat/.test(g)) return "health";
  if (/learn|study|course|exam|certif|read|tutorial|master|understand/.test(g)) return "study";
  if (/build|develop|create|launch|project|product|code|program|implement|ship|deploy/.test(g)) return "work";
  return "personal";
}

const PHASE_LABELS: Record<string, string[]> = {
  study: [
    "Set up environment, research resources, and map skills",
    "Master foundational concepts and core theory",
    "Deepen understanding through practice and exercises",
    "Apply knowledge in real projects and advanced material",
    "Review, refine, and demonstrate mastery",
  ],
  work: [
    "Define scope, research requirements, and plan execution",
    "Build core architecture and foundational components",
    "Implement main features and primary functionality",
    "Test, iterate, and collect feedback",
    "Polish, document, and deliver",
  ],
  health: [
    "Assess baseline, set targets, and design routine",
    "Build consistency with foundational training",
    "Increase intensity and track measurable progress",
    "Push performance peaks and optimise recovery",
    "Sustain results and plan next growth cycle",
  ],
  personal: [
    "Research, plan, and define clear objectives",
    "Start execution with consistent daily actions",
    "Build momentum and tackle obstacles",
    "Refine approach based on results",
    "Complete, review, and celebrate progress",
  ],
};

const FOCUS_LABELS = [
  "Skills & Research",
  "Core Development",
  "Practice & Application",
  "Integration & Depth",
  "Polish & Delivery",
];

const CATEGORY_ALIASES: Record<string, string[]> = {
  health:   ["gym", "fitness", "exercise", "health", "workout", "sports"],
  work:     ["work", "office", "meetings", "job", "career"],
  study:    ["study", "learning", "school", "class", "course"],
  personal: ["personal", "social", "family", "hobby"],
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

interface TaskTemplate {
  title:         string;
  duration_mins: number;
  energy_type:   "deep" | "light" | "passive";
}

const WEEK1_TASKS: Record<string, TaskTemplate[]> = {
  study: [
    { title: "Research learning roadmap and top resources",  duration_mins: 30, energy_type: "deep"    },
    { title: "Set up study environment and tools",           duration_mins: 25, energy_type: "light"   },
    { title: "Identify key skills and create a skill map",   duration_mins: 30, energy_type: "deep"    },
    { title: "Read introductory material and take notes",    duration_mins: 40, energy_type: "passive" },
    { title: "Outline weekly study schedule",                duration_mins: 25, energy_type: "light"   },
  ],
  work: [
    { title: "Research industry standards and requirements", duration_mins: 35, energy_type: "deep"  },
    { title: "Identify skill gaps and draft action plan",    duration_mins: 30, energy_type: "deep"  },
    { title: "Set up project environment and toolchain",     duration_mins: 25, energy_type: "light" },
    { title: "Map deliverables and define milestones",       duration_mins: 30, energy_type: "light" },
    { title: "Scope next week's priorities",                 duration_mins: 25, energy_type: "light" },
  ],
  health: [
    { title: "Research evidence-based training methodology", duration_mins: 30, energy_type: "passive" },
    { title: "Complete baseline fitness self-assessment",    duration_mins: 25, energy_type: "light"   },
    { title: "Design weekly schedule with rest days",        duration_mins: 25, energy_type: "light"   },
    { title: "Prepare nutrition and recovery strategy",      duration_mins: 30, energy_type: "deep"    },
    { title: "Log Day 1 metrics and set benchmarks",         duration_mins: 25, energy_type: "light"   },
  ],
  personal: [
    { title: "Write clear vision statement and success metrics", duration_mins: 30, energy_type: "deep"    },
    { title: "Research best practices and inspiring examples",   duration_mins: 25, energy_type: "passive" },
    { title: "Create personal development plan",                 duration_mins: 30, energy_type: "deep"    },
    { title: "Identify potential obstacles and mitigations",     duration_mins: 25, energy_type: "light"   },
    { title: "Schedule recurring check-ins and reviews",         duration_mins: 25, energy_type: "light"   },
  ],
};

const TASK_TEMPLATES: Record<string, TaskTemplate[]> = {
  study: [
    { title: "Study core concepts from primary resource",        duration_mins: 45, energy_type: "deep"    },
    { title: "Complete practice exercises and problems",         duration_mins: 50, energy_type: "deep"    },
    { title: "Review and summarise previous material",           duration_mins: 30, energy_type: "light"   },
    { title: "Watch instructional video and take notes",         duration_mins: 40, energy_type: "passive" },
    { title: "Build small project applying learned concepts",    duration_mins: 60, energy_type: "deep"    },
    { title: "Read supplementary documentation",                 duration_mins: 35, energy_type: "passive" },
    { title: "Do spaced repetition review",                      duration_mins: 25, energy_type: "light"   },
    { title: "Write notes or blog post to reinforce learning",   duration_mins: 40, energy_type: "deep"    },
    { title: "Work through advanced problem set",                duration_mins: 55, energy_type: "deep"    },
    { title: "Participate in study community or forum",          duration_mins: 30, energy_type: "light"   },
    { title: "Take mock test on covered material",               duration_mins: 30, energy_type: "deep"    },
    { title: "Explore related advanced topics",                  duration_mins: 35, energy_type: "passive" },
  ],
  work: [
    { title: "Deep work session on primary deliverable",         duration_mins: 60, energy_type: "deep"    },
    { title: "Draft and refine project documentation",           duration_mins: 40, energy_type: "light"   },
    { title: "Build and test core feature or component",         duration_mins: 55, energy_type: "deep"    },
    { title: "Review feedback and iterate on output",            duration_mins: 35, energy_type: "light"   },
    { title: "Research competitive landscape or best practices", duration_mins: 30, energy_type: "passive" },
    { title: "Create portfolio piece or presentation",           duration_mins: 50, energy_type: "deep"    },
    { title: "Send networking outreach and follow-ups",          duration_mins: 25, energy_type: "light"   },
    { title: "Code review or quality audit session",             duration_mins: 40, energy_type: "deep"    },
    { title: "Plan next sprint or work cycle",                   duration_mins: 30, energy_type: "light"   },
    { title: "Polish and finalise deliverable",                  duration_mins: 55, energy_type: "deep"    },
  ],
  health: [
    { title: "Morning mobility and warm-up routine",             duration_mins: 25, energy_type: "light"   },
    { title: "Cardio endurance session",                         duration_mins: 40, energy_type: "deep"    },
    { title: "Strength training workout",                        duration_mins: 45, energy_type: "deep"    },
    { title: "Recovery stretch and foam roll",                   duration_mins: 25, energy_type: "passive" },
    { title: "Meal prep and nutrition planning",                 duration_mins: 35, energy_type: "light"   },
    { title: "HIIT or interval training session",                duration_mins: 30, energy_type: "deep"    },
    { title: "Mindfulness meditation and breathing work",        duration_mins: 25, energy_type: "passive" },
    { title: "Progress assessment and metrics logging",          duration_mins: 25, energy_type: "light"   },
  ],
  personal: [
    { title: "Journal and reflect on progress",                  duration_mins: 25, energy_type: "passive" },
    { title: "Deep work on personal project milestone",          duration_mins: 50, energy_type: "deep"    },
    { title: "Learn new skill or technique",                     duration_mins: 40, energy_type: "deep"    },
    { title: "Review and update personal plan",                  duration_mins: 25, energy_type: "light"   },
    { title: "Reach out and build meaningful connections",       duration_mins: 30, energy_type: "light"   },
    { title: "Creative exploration session",                     duration_mins: 45, energy_type: "passive" },
    { title: "Audit progress and adjust strategy",               duration_mins: 30, energy_type: "light"   },
    { title: "Complete high-priority personal task",             duration_mins: 55, energy_type: "deep"    },
  ],
};

export async function decomposeGoal(req: Request, res: Response): Promise<Response> {
  const { goal, deadline, today, weeks_available, user_behavior } = req.body as {
    goal?: string;
    deadline?: string;
    today?: string;
    weeks_available?: number;
    user_behavior?: {
      productive_hours?: string[];
      strong_categories?: string[];
      avoid_categories?: string[];
    };
  };

  if (!goal?.trim()) return res.status(400).json({ message: "goal is required" });
  if (!deadline)     return res.status(400).json({ message: "deadline is required" });

  const todayDate    = new Date(today ?? new Date().toISOString().split("T")[0]);
  const deadlineDate = new Date(deadline);

  if (isNaN(todayDate.getTime()) || isNaN(deadlineDate.getTime()))
    return res.status(400).json({ message: "Invalid date format — use YYYY-MM-DD" });
  if (deadlineDate <= todayDate)
    return res.status(400).json({ message: "deadline must be after today" });

  const totalDays  = Math.ceil((deadlineDate.getTime() - todayDate.getTime()) / 86_400_000);
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));

  const weeksAvail: number =
    typeof weeks_available === "number" && weeks_available > 0
      ? Math.min(weeks_available, totalWeeks)
      : totalWeeks;

  const behavior   = user_behavior ?? {};
  const avoidCats  = (behavior.avoid_categories  ?? []).map((s) => s.toLowerCase());
  const strongCats = (behavior.strong_categories ?? []).map((s) => s.toLowerCase());

  function isCategoryAvoided(cat: string): boolean {
    const aliases = CATEGORY_ALIASES[cat] ?? [cat];
    return avoidCats.some((av) =>
      aliases.some((alias) => alias.includes(av) || av.includes(alias)),
    );
  }

  const rawCategory  = _inferCategory(goal);
  const effectiveCat =
    (["study", "work", "personal", "health"] as const).find(
      (c) => c === rawCategory && !isCategoryAvoided(c),
    ) ??
    (["study", "work", "personal", "health"] as const).find((c) => !isCategoryAvoided(c)) ??
    rawCategory;

  const isStrong =
    strongCats.length === 0 ||
    (CATEGORY_ALIASES[effectiveCat] ?? [effectiveCat]).some((alias) =>
      strongCats.some((s) => s.includes(alias) || alias.includes(s)),
    );

  const goalWords = goal.trim().split(/\s+/);
  const summary   = goalWords.length <= 15 ? goal.trim() : goalWords.slice(0, 15).join(" ");
  const skills    = _extractSkills(goal);
  const goal_id   = randomUUID();
  const phases    = PHASE_LABELS[effectiveCat];

  function phaseIdx(pct: number): number {
    if (pct <= 0.15) return 0;
    if (pct <= 0.40) return 1;
    if (pct <= 0.70) return 2;
    if (pct <= 0.90) return 3;
    return 4;
  }

  function buildDailyTasks(weekNum: number, isFirst: boolean) {
    const taskCount = weekNum % 2 === 0 ? 4 : 3;
    const days      = WEEKDAYS.slice(0, taskCount);
    const pool      = isFirst ? WEEK1_TASKS[effectiveCat] : TASK_TEMPLATES[effectiveCat];
    const offset    = isFirst
      ? 0
      : Math.floor(((weekNum - 2) / Math.max(1, weeksAvail - 1)) * pool.length);

    return days.map((day, i) => {
      const tpl        = pool[(offset + i) % pool.length];
      const energy_type: "deep" | "light" | "passive" =
        !isStrong && tpl.energy_type === "deep" ? "light" : tpl.energy_type;
      return {
        title:         tpl.title,
        category:      effectiveCat,
        duration_mins: tpl.duration_mins,
        energy_type,
        day_of_week:   day,
      };
    });
  }

  const weeks = Array.from({ length: weeksAvail }, (_, idx) => {
    const weekNum = idx + 1;
    const pct     = weekNum / weeksAvail;
    const pi      = phaseIdx(pct);
    const isFirst = weekNum === 1;
    return {
      week:        weekNum,
      milestone:   phases[pi],
      focus:       isFirst ? FOCUS_LABELS[0] : FOCUS_LABELS[pi],
      daily_tasks: buildDailyTasks(weekNum, isFirst),
    };
  });

  return res.json({ goal_id, summary, skills, weeks });
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
