
import { Request, Response } from "express";
import { pool } from "../config/db";

export async function getWebResources(req: Request, res: Response) {
    const userId = (req as any).userId;

    try {
        const result = await pool.query(
            "SELECT * FROM web_resources WHERE user_id = $1 ORDER BY created_at DESC",
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("getWebResources error:", err);
        res.status(500).json({ message: "Server error" });
    }
}

export async function createWebResource(req: Request, res: Response) {
    const userId = (req as any).userId;
    const { name, url } = req.body;

    if (!name || !url) {
        return res.status(400).json({ message: "Name and URL are required" });
    }

    try {
        const result = await pool.query(
            "INSERT INTO web_resources (user_id, name, url) VALUES ($1, $2, $3) RETURNING *",
            [userId, name, url]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("createWebResource error:", err);
        res.status(500).json({ message: "Server error" });
    }
}

export async function deleteWebResource(req: Request, res: Response) {
    const userId = (req as any).userId;
    const resourceId = req.params.id;

    try {
        const result = await pool.query(
            "DELETE FROM web_resources WHERE id = $1 AND user_id = $2",
            [resourceId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Resource not found" });
        }

        res.status(204).send();
    } catch (err) {
        console.error("deleteWebResource error:", err);
        res.status(500).json({ message: "Server error" });
    }
}
