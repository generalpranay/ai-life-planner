
import { pool } from "./src/config/db";
import fs from 'fs';

async function debug() {
    try {
        console.log("Fetching data...");

        const tasks = await pool.query("SELECT id, user_id, title, status, start_time, end_time, due_datetime, is_recurring FROM tasks");
        const blocks = await pool.query("SELECT id, task_id, start_datetime, end_datetime, generated_by_ai FROM scheduled_blocks ORDER BY start_datetime");

        const out = {
            tasks: tasks.rows,
            blocks: blocks.rows
        };

        fs.writeFileSync("debug_output.txt", JSON.stringify(out, null, 2));
        console.log("Done writing to debug_output.txt");
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

debug();
