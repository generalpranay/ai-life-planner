// src/controllers/authController.ts
import { Request, Response } from "express";
import { pool } from "../config/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { jwtSecret } from "../config/env";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Valid email is required" });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }
    if (password.length > 128) {
      return res.status(400).json({ message: "Password too long" });
    }

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
      email.toLowerCase().trim(),
    ]);
    if ((existing.rowCount ?? 0) > 0) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const result = await pool.query(
      `
      INSERT INTO users (email, password_hash, role, name)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, role, name, created_at
    `,
      [email.toLowerCase().trim(), hash, role || "student", name?.trim() || null]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      { userId: user.id },
      jwtSecret(),
      { expiresIn: "7d" }
    );

    res.status(201).json({ token, user });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const result = await pool.query(
      "SELECT id, email, password_hash, role, name, created_at FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id },
      jwtSecret(),
      { expiresIn: "7d" }
    );

    delete user.password_hash;
    res.json({ token, user });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function refreshToken(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, jwtSecret(), {
      ignoreExpiration: true,
    }) as { userId: number; iat: number; exp: number };

    // Only allow refresh if token expired less than 30 days ago
    const now = Math.floor(Date.now() / 1000);
    if (now - decoded.exp > 30 * 24 * 3600) {
      return res.status(401).json({ message: "Token too old to refresh" });
    }

    const newToken = jwt.sign(
      { userId: decoded.userId },
      jwtSecret(),
      { expiresIn: "7d" }
    );
    res.json({ token: newToken });
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
}
