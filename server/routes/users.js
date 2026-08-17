import express from "express";
import bcrypt from "bcryptjs";
import { authenticateToken, requireAdmin } from "./auth.js";
import { getUsers, saveUsers } from "../helpers/storage.js";

const router = express.Router();

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

  const users = getUsers();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ message: "User already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = {
    id: String(Date.now()),
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
  if (userToDelete?.username === "admin") {
    return res
      .status(403)
      .json({ message: "Cannot delete primary admin account" });
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

    if (!newPassword || newPassword.trim().length === 0) {
      return res.status(400).json({ message: "New password is required" });
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
