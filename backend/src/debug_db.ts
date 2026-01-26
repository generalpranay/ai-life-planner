
import { pool } from "./config/db";
import * as fs from 'fs';

async function debug() {
    try {
        const users = await pool.query("SELECT * FROM users");
        let output = "USERS:\n" + JSON.stringify(users.rows, null, 2) + "\n\n";

        const userId = users.rows.find(u => u.email === 'test@test.com')?.id;

        if (userId) {
            output += "TASKS for " + userId + ":\n";
            const tasks = await pool.query("SELECT * FROM tasks WHERE user_id = $1", [userId]);
            output += JSON.stringify(tasks.rows, null, 2) + "\n\n";

            output += "SCHEDULED BLOCKS for " + userId + ":\n";
            const blocks = await pool.query("SELECT * FROM scheduled_blocks WHERE user_id = $1 ORDER BY start_datetime", [userId]);
            output += JSON.stringify(blocks.rows, null, 2) + "\n\n";
        } else {
            output += "User test@test.com not found";
        }

        fs.writeFileSync('debug_dump.json', output);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

debug();
