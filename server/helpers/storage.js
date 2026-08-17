import fs from "fs";
import bcrypt from "bcryptjs";
import {
  DATA_FILE,
  USERS_FILE,
  SETTINGS_FILE,
  STACKS_DIR,
  DEFAULT_SETTINGS,
} from "../config/constants.js";

export function initStorage() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(STACKS_DIR)) {
    fs.mkdirSync(STACKS_DIR, { recursive: true });
  }
}

export function getCustomServices() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function saveCustomServices(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function getUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      const defaultUsers = [
        {
          id: "1",
          username: "admin",
          passwordHash: bcrypt.hashSync("admin", 10),
          role: "Admin",
        },
      ];
      fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
      return defaultUsers;
    }
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function saveUsers(usersData) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(usersData, null, 2));
}

export function getSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(
        SETTINGS_FILE,
        JSON.stringify(DEFAULT_SETTINGS, null, 2),
      );
      return DEFAULT_SETTINGS;
    }
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settingsData) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsData, null, 2));
}
