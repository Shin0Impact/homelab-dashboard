import express from "express";
import { authenticateToken } from "./auth.js";
import { getSettings, saveSettings } from "../helpers/storage.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json(getSettings());
});

router.put("/", authenticateToken, (req, res) => {
  const currentSettings = getSettings();
  const updatedSettings = { ...currentSettings, ...req.body };
  saveSettings(updatedSettings);
  res.json({ success: true, settings: updatedSettings });
});

export default router;
