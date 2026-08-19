import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { JWT_SECRET } from "../config/constants.js";
import { getUsers, saveUsers } from "../helpers/storage.js";

const router = express.Router();

// --- Rate limiting ----------------------------------------------------------
// Small in-memory limiter (no new dependency needed): a handful of attempts
// per IP is fine, hammering it is not. Used for both /login and /register.
function createRateLimiter({ windowMs, maxAttempts }) {
  const attempts = new Map();
  const limiter = function rateLimiter(req, res, next) {
    const key = req.ip;
    const now = Date.now();
    const entry = attempts.get(key);

    if (!entry || now - entry.firstAttempt > windowMs) {
      attempts.set(key, { count: 1, firstAttempt: now });
      return next();
    }

    if (entry.count >= maxAttempts) {
      const retryAfterSec = Math.ceil(
        (entry.firstAttempt + windowMs - now) / 1000,
      );
      res.setHeader("Retry-After", String(retryAfterSec));
      return res
        .status(429)
        .json({ message: "Too many attempts. Try again later." });
    }

    entry.count += 1;
    next();
  };
  limiter.reset = (key) => attempts.delete(key);
  return limiter;
}

const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 10,
});
const registerRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 10,
});

// Lets the frontend show a "create your admin account" screen instead of a
// login form when no account exists yet. No auth needed — that's the point,
// this runs before anyone can log in.
router.get("/setup-status", (req, res) => {
  res.json({ setupRequired: getUsers().length === 0 });
});

// Creates the first (and only, via this route) admin account. Once any user
// exists, this permanently refuses — it's a one-time bootstrap, not an open
// registration endpoint. Whoever reaches this first after a fresh deploy
// becomes the owner, same trade-off most self-hosted apps make (Nextcloud,
// Immich, etc.) — so set this up right after first starting the container.
router.post("/register", registerRateLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (getUsers().length > 0) {
    return res.status(403).json({ message: "Setup has already been completed" });
  }

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }
  if (username.trim().length < 3) {
    return res
      .status(400)
      .json({ message: "Username must be at least 3 characters" });
  }
  if (password.length < 8) {
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters" });
  }

  // Re-check right before writing — closes most of the race window where two
  // requests both pass the check above before either has saved.
  const users = getUsers();
  if (users.length > 0) {
    return res.status(403).json({ message: "Setup has already been completed" });
  }

  const newUser = {
    id: crypto.randomUUID(),
    username: username.trim(),
    passwordHash: await bcrypt.hash(password, 10),
    role: "Admin",
  };
  saveUsers([newUser]);

  const token = jwt.sign(
    { id: newUser.id, username: newUser.username, role: newUser.role },
    JWT_SECRET,
    { expiresIn: "12h" },
  );

  res.status(201).json({
    token,
    user: { id: newUser.id, username: newUser.username, role: newUser.role },
  });
});

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
  loginRateLimiter.reset(req.ip);

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
