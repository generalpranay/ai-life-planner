import { Request, Response, NextFunction } from "express";

type Bucket = { count: number; resetAt: number };

/**
 * Tiny in-memory sliding-window limiter. Not distributed — fine for a single node.
 * For production clusters, swap for express-rate-limit + Redis store.
 */
export function rateLimit(opts: { windowMs: number; max: number; key?: (req: Request) => string }) {
  const { windowMs, max } = opts;
  const getKey = opts.key ?? ((req: Request) => req.ip ?? "unknown");
  const buckets = new Map<string, Bucket>();

  // Periodic cleanup to bound memory
  setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }, Math.max(windowMs, 60_000)).unref?.();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = getKey(req);
    const now = Date.now();
    const b = buckets.get(key);
    if (!b || b.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (b.count >= max) {
      const retryAfter = Math.ceil((b.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ message: "Too many requests, try again later" });
    }
    b.count += 1;
    next();
  };
}
