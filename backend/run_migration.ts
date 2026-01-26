
import fs from 'fs';
import path from 'path';
import { pool } from './src/config/db';

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'migrations', 'recurrence_and_web.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration...');
        await pool.query(sql);
        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

runMigration();
