import fs from "fs";
import crypto from "crypto";
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
      // No hardcoded default password — a public repo can't ship a known
      // credential. Generate a random one, print it once, and require it be
      // changed like any other freshly-provisioned account.
      const generatedPassword = crypto.randomBytes(9).toString("base64url");
      const defaultUsers = [
        {
          id: "1",
          username: "admin",
          passwordHash: bcrypt.hashSync(generatedPassword, 10),
          role: "Admin",
        },
      ];
      fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
      console.warn(
        "\n==============================================================\n" +
          " First run: created the default admin account\n" +
          "   username: admin\n" +
          `   password: ${generatedPassword}\n` +
          " This password is shown only once here in the logs — save it now,\n" +
          " or change it from Settings > Users after logging in.\n" +
          "==============================================================\n",
      );
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
