import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { authenticateToken, requireAdmin } from "./auth.js";
import { getUsers, saveUsers } from "../helpers/storage.js";

const router = express.Router();

const MIN_PASSWORD_LENGTH = 8;

router.get("/", authenticateToken, requireAdmin, (req, res) => {
  const users = getUsers();
  const safeUsers = users.map(({ passwordHash, ...u }) => u);
  res.json(safeUsers);
});

router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
  }

  const users = getUsers();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ message: "User already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = {
    id: crypto.randomUUID(),
    username,
    passwordHash,
    role: role || "Viewer",
  };

  users.push(newUser);
  saveUsers(users);
  res
    .status(201)
    .json({ id: newUser.id, username: newUser.username, role: newUser.role });
});

router.delete("/:id", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  let users = getUsers();

  const userToDelete = users.find((u) => u.id === id);
  if (!userToDelete) {
    return res.status(404).json({ message: "User not found" });
  }

  // Protect the last remaining Admin, whoever they are — not a hardcoded
  // "admin" username. First-run setup lets you pick any username, so a
  // string check here would silently stop protecting the actual owner.
  const adminCount = users.filter((u) => u.role === "Admin").length;
  if (userToDelete.role === "Admin" && adminCount <= 1) {
    return res
      .status(403)
      .json({ message: "Cannot delete the last remaining Admin account" });
  }

  users = users.filter((u) => u.id !== id);
  saveUsers(users);
  res.json({ message: "User deleted" });
});

router.put(
  "/:id/password",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
    }

    const users = getUsers();
    const targetUser = users.find((u) => u.id === id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    targetUser.passwordHash = await bcrypt.hash(newPassword, 10);
    saveUsers(users);

    res.json({
      message: `Password for user '${targetUser.username}' updated successfully.`,
    });
  },
);

export default router;
