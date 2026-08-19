import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { JWT_SECRET } from "../config/constants.js";
import { getUsers } from "../helpers/storage.js";

const router = express.Router();

// --- Login rate limiting ---------------------------------------------------
// Small in-memory limiter (no new dependency needed): a handful of failed
// attempts per IP is fine, hammering it is not. Resets on a successful login.
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_MAX_ATTEMPTS = 10;
const loginAttempts = new Map();

function loginRateLimiter(req, res, next) {
  const key = req.ip;
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || now - entry.firstAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAttempt: now });
    return next();
  }

  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil(
      (entry.firstAttempt + LOGIN_WINDOW_MS - now) / 1000,
    );
    res.setHeader("Retry-After", String(retryAfterSec));
    return res
      .status(429)
      .json({ message: "Too many login attempts. Try again later." });
  }

  entry.count += 1;
  next();
}

router.post("/login", loginRateLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  const users = getUsers();
  const user = users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase(),
  );

  if (!user) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);

  if (!isMatch) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  // Successful login — this IP is no longer under suspicion.
  loginAttempts.delete(req.ip);

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: "12h" },
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
});

export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Access token required" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err)
      return res.status(403).json({ message: "Invalid or expired token" });
    req.user = user;
    next();
  });
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ message: "Admin privileges required" });
  }
  next();
}

export default router;
