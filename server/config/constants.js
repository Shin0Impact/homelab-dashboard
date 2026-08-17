import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

export const PORT = process.env.PORT || 3000;
export const JWT_SECRET =
  process.env.JWT_SECRET || "homelab-super-secret-key-change-me";

// File & Directory Paths
export const DATA_FILE = path.resolve(ROOT_DIR, "custom_services.json");
export const USERS_FILE = path.resolve(ROOT_DIR, "users.json");
export const SETTINGS_FILE = path.resolve(ROOT_DIR, "settings.json");
export const STACKS_DIR = path.resolve(ROOT_DIR, "stacks");

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
