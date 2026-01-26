import request from 'supertest';
import app from '../app';
import { pool } from '../config/db';

describe('GET /', () => {
    afterAll(async () => {
        await pool.end();
    });

    it('should return 200 OK', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ message: "AI Life Planner API is running" });
    });
});
