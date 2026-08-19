import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

export const PORT = process.env.PORT || 3000;

// File & Directory Paths
// Everything persistent lives under DATA_DIR, which is what docker-compose.yml
// actually mounts a volume onto (./data:/app/server/data). Keep these in sync —
// previously these files lived one level up, outside any mounted volume, so
// users/settings/stacks were silently lost on every container recreation.
const DATA_DIR = path.resolve(ROOT_DIR, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

export const DATA_FILE = path.join(DATA_DIR, "custom_services.json");
export const USERS_FILE = path.join(DATA_DIR, "users.json");
export const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
export const STACKS_DIR = path.join(DATA_DIR, "stacks");

// --- JWT secret -----------------------------------------------------------
// Never fall back to a hardcoded string — this repo is public, so a baked-in
// default would be a known secret anyone could sign tokens with. If
// JWT_SECRET isn't set in the environment, generate a random one on first
// boot and persist it in DATA_DIR so existing sessions survive restarts.
// Set JWT_SECRET yourself (env var) if you want it to also survive a fresh
// data volume, or to keep it stable across multiple replicas.
const JWT_SECRET_FILE = path.join(DATA_DIR, ".jwt_secret");

function loadOrCreateJwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim()) {
    return process.env.JWT_SECRET.trim();
  }

  try {
    if (fs.existsSync(JWT_SECRET_FILE)) {
      const existing = fs.readFileSync(JWT_SECRET_FILE, "utf-8").trim();
      if (existing) return existing;
    }
  } catch {
    // fall through and generate a fresh one
  }

  const generated = crypto.randomBytes(48).toString("hex");
  try {
    fs.writeFileSync(JWT_SECRET_FILE, generated, { mode: 0o600 });
  } catch (err) {
    console.warn("Could not persist generated JWT secret:", err.message);
  }
  console.warn(
    "[homelab-os] No JWT_SECRET set in the environment — generated a random " +
      "one and saved it to server/data/.jwt_secret. Set JWT_SECRET yourself " +
      "for a stable, portable secret instead.",
  );
  return generated;
}

export const JWT_SECRET = loadOrCreateJwtSecret();

export const DEFAULT_SETTINGS = {
  categories: ["AI", "Media", "Infra", "Network", "Automation"],
  compact: false,
  amoled: false,
  refresh: 10,
};

export const WELL_KNOWN_PORTS = {
  "home-assistant": 8123,
  homeassistant: 8123,
  n8n: 5678,
  qbittorrent: 8080,
  nextcloud: 80,
  immich: 2283,
  "immich-server": 2283,
  portainer: 9000,
  "adguard-home": 3000,
  adguard: 3000,
  "open-webui": 8080,
  navidrome: 4533,
  frigate: 5000,
  prowlarr: 9696,
  lidarr: 8686,
  searxng: 8080,
  beets: 8337,
};
