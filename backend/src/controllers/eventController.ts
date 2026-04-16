import { Request, Response } from "express";
import { pool } from "../config/db";

export async function getEvents(req: Request, res: Response) {
  const userId = (req as any).userId;
  const { start, end } = req.query;

  try {
    let query = "SELECT * FROM events WHERE user_id = $1";
    const params: any[] = [userId];

    if (start) {
      params.push(start);
      query += ` AND start_datetime >= $${params.length}`;
    }
    if (end) {
      params.push(end);
      query += ` AND start_datetime <= $${params.length}`;
    }

    query += " ORDER BY start_datetime ASC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("getEvents error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getEventById(req: Request, res: Response) {
  const userId = (req as any).userId;
  const eventId = Number(req.params.id);

  try {
    const result = await pool.query(
      "SELECT * FROM events WHERE id = $1 AND user_id = $2",
      [eventId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("getEventById error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function createEvent(req: Request, res: Response) {
  const userId = (req as any).userId;
  const { title, description, start_datetime, end_datetime, is_all_day, location, color } = req.body;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return res.status(400).json({ message: "Title is required" });
  }
  if (!start_datetime || !end_datetime) {
    return res.status(400).json({ message: "start_datetime and end_datetime are required" });
  }

  const start = new Date(start_datetime);
  const end = new Date(end_datetime);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ message: "Invalid datetime format" });
  }
  if (end < start) {
    return res.status(400).json({ message: "end_datetime must be after start_datetime" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO events (user_id, title, description, start_datetime, end_datetime, is_all_day, location, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        title.trim().substring(0, 500),
        description ?? null,
        start.toISOString(),
        end.toISOString(),
        is_all_day ?? false,
        location ?? null,
        color ?? "blue",
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("createEvent error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function updateEvent(req: Request, res: Response) {
  const userId = (req as any).userId;
  const eventId = Number(req.params.id);
  const { title, description, start_datetime, end_datetime, is_all_day, location, color } = req.body;

  if (start_datetime && end_datetime) {
    const start = new Date(start_datetime);
    const end = new Date(end_datetime);
    if (end < start) {
      return res.status(400).json({ message: "end_datetime must be after start_datetime" });
    }
  }

  try {
    const result = await pool.query(
      `UPDATE events
       SET
         title          = COALESCE($1, title),
         description    = COALESCE($2, description),
         start_datetime = COALESCE($3, start_datetime),
         end_datetime   = COALESCE($4, end_datetime),
         is_all_day     = COALESCE($5, is_all_day),
         location       = COALESCE($6, location),
         color          = COALESCE($7, color),
         updated_at     = NOW()
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [
        title ? title.trim().substring(0, 500) : null,
        description ?? null,
        start_datetime ?? null,
        end_datetime ?? null,
        is_all_day ?? null,
        location ?? null,
        color ?? null,
        eventId,
        userId,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("updateEvent error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function deleteEvent(req: Request, res: Response) {
  const userId = (req as any).userId;
  const eventId = Number(req.params.id);

  try {
    const result = await pool.query(
      "DELETE FROM events WHERE id = $1 AND user_id = $2",
      [eventId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(204).send();
  } catch (err) {
    console.error("deleteEvent error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
