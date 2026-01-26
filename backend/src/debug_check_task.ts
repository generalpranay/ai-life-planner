
import { pool } from './config/db';

async function check() {
    console.log("Checking DB...");
    const res = await pool.query("SELECT id, title, start_time, due_datetime FROM tasks WHERE title ILIKE '%SAVE ON FOODS%' ORDER BY id DESC LIMIT 1");
    console.log('TASK ROW:', res.rows[0]);

    if (res.rows.length > 0) {
        const res2 = await pool.query("SELECT start_datetime, generated_by_ai FROM scheduled_blocks WHERE task_id = (SELECT id FROM tasks WHERE title ILIKE '%SAVE ON FOODS%' LIMIT 1)");
        console.log('BLOCK ROW:', res2.rows[0]);
    }
    await pool.end();
}

check();
