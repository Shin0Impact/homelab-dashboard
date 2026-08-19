import express from "express";
import { authenticateToken, requireAdmin } from "./auth.js";
import { getSettings, saveSettings } from "../helpers/storage.js";

const router = express.Router();

// Left open (no auth): the frontend needs the theme/category config before
// a user has logged in — e.g. to paint the login screen correctly — and
// none of this is sensitive (no secrets, no per-user data).
router.get("/", (req, res) => {
  res.json(getSettings());
});

// These are global settings shared by every user of the dashboard, not a
// personal preference, so changing them is an Admin action — previously any
// authenticated Viewer could rewrite them too.
router.put("/", authenticateToken, requireAdmin, (req, res) => {
  const currentSettings = getSettings();
  const updatedSettings = { ...currentSettings, ...req.body };
  saveSettings(updatedSettings);
  res.json({ success: true, settings: updatedSettings });
});

export default router;
