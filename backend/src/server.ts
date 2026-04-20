import app from "./app";
import { pool } from "./config/db";

const PORT = Number(process.env.PORT) || 4000;

function assertEnv() {
  const missing: string[] = [];
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    missing.push("JWT_SECRET (must be >=16 chars)");
  }
  for (const k of ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"]) {
    if (!process.env[k]) missing.push(k);
  }
  if (missing.length > 0) {
    console.error("Missing required env vars:", missing.join(", "));
    process.exit(1);
  }
}

async function startServer() {
  assertEnv();
  try {
    await pool.query("SELECT 1");
    console.log("PostgreSQL connected");

    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`${signal} received, shutting down`);
      server.close(() => pool.end().finally(() => process.exit(0)));
    };
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Startup error:", error);
    process.exit(1);
  }
}

startServer();
