import app from "./app";
import { pool } from "./config/db";

const PORT = Number(process.env.PORT) || 4000;

async function startServer() {
  try {
    await pool.query("SELECT 1");
    console.log("PostgreSQL connected");

    
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Startup error:", error);
    process.exit(1);
  }
}

startServer();
