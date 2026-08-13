import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Docker from "dockerode";
import path from "path";
import fs from "fs";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3333;
const JWT_SECRET =
  process.env.JWT_SECRET || "homelab-super-secret-key-change-me";

// --- Persistent Storage Setup ---
const DATA_FILE = path.resolve(__dirname, "custom_services.json");
const USERS_FILE = path.resolve(__dirname, "users.json");
const SETTINGS_FILE = path.resolve(__dirname, "settings.json");
const STACKS_DIR = path.resolve(__dirname, "stacks");

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

if (!fs.existsSync(STACKS_DIR)) {
  fs.mkdirSync(STACKS_DIR, { recursive: true });
}

// Custom Services Helpers
const getCustomServices = () => {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return [];
  }
};

const saveCustomServices = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// Users File Helpers
const getUsers = () => {
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
};

const saveUsers = (usersData) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(usersData, null, 2));
};

// UI Settings Helpers
const DEFAULT_SETTINGS = {
  categories: ["AI", "Media", "Infra", "Network", "Automation"],
  compact: false,
  amoled: false,
  refresh: 10,
};

const getSettings = () => {
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
};

const saveSettings = (settingsData) => {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsData, null, 2));
};

// --- Dockerode Initialization ---
const isWindows = process.platform === "win32";
const docker = new Docker(
  isWindows
    ? { socketPath: "//./pipe/docker_engine" }
    : { socketPath: "/var/run/docker.sock" },
);

app.use(cors());
app.use(express.json());

// --- Static Frontend Serving ---
const distPath = fs.existsSync(path.resolve(__dirname, "../dist"))
  ? path.resolve(__dirname, "../dist")
  : path.resolve(__dirname, "dist");

app.use(express.static(distPath));

// --- Auth Middleware ---
function authenticateToken(req, res, next) {
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

function requireAdmin(req, res, next) {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ message: "Admin privileges required" });
  }
  next();
}

// --- Auth Endpoints ---

app.post("/api/login", async (req, res) => {
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

app.get("/api/tailscale", async (req, res) => {
  try {
    // Queries local host Tailscale CLI
    const { stdout } = await execAsync("tailscale status --json");
    const status = JSON.parse(stdout);

    const isConnected = status.BackendState === "Running";
    // Count connected peer devices + local host
    const activePeers = status.Peer ? Object.keys(status.Peer).length : 0;
    const totalDevices = isConnected ? activePeers + 1 : 0;

    res.json({
      connected: isConnected,
      devicesCount: totalDevices,
      tailnet: status.CurrentTailnet?.Name || "tailnet",
    });
  } catch (err) {
    // Fallback if Tailscale CLI isn't installed or accessible on host
    res.json({
      connected: false,
      devicesCount: 0,
      tailnet: "disconnected",
    });
  }
});

app.get("/api/users", authenticateToken, requireAdmin, (req, res) => {
  const users = getUsers();
  const safeUsers = users.map(({ passwordHash, ...u }) => u);
  res.json(safeUsers);
});

app.post("/api/users", authenticateToken, requireAdmin, async (req, res) => {
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

app.delete("/api/users/:id", authenticateToken, requireAdmin, (req, res) => {
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

app.put(
  "/api/users/:id/password",
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

// --- Server Settings Endpoints ---

app.get("/api/settings", (req, res) => {
  res.json(getSettings());
});

app.put("/api/settings", authenticateToken, (req, res) => {
  const currentSettings = getSettings();
  const updatedSettings = { ...currentSettings, ...req.body };
  saveSettings(updatedSettings);
  res.json({ success: true, settings: updatedSettings });
});

// --- Docker Container Management & Telemetry ---

const WELL_KNOWN_PORTS = {
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

function inferCategoryAndIcon(rawName, image = "") {
  const nameLower = rawName.toLowerCase();
  const imageLower = image.toLowerCase();
  const fullText = `${nameLower} ${imageLower}`;

  let iconName = "";

  if (fullText.includes("open-webui") || fullText.includes("openwebui"))
    iconName = "open-webui";
  else if (fullText.includes("adguard")) iconName = "adguard-home";
  else if (fullText.includes("uptime-kuma") || fullText.includes("uptime_kuma"))
    iconName = "uptime-kuma";
  else if (
    fullText.includes("home-assistant") ||
    fullText.includes("homeassistant")
  )
    iconName = "home-assistant";
  else if (fullText.includes("nextcloud")) iconName = "nextcloud";
  else if (fullText.includes("immich")) iconName = "immich";
  else if (fullText.includes("frigate")) iconName = "frigate";
  else if (fullText.includes("navidrome")) iconName = "navidrome";
  else if (fullText.includes("mosquitto")) iconName = "mosquitto";
  else if (fullText.includes("redis") || fullText.includes("valkey"))
    iconName = "redis";
  else if (fullText.includes("postgres")) iconName = "postgresql";
  else if (fullText.includes("lidarr")) iconName = "lidarr";
  else {
    let clean = nameLower
      .replace(/^(big-bear|docker|my|local)[-_]/, "")
      .replace(/[-_](main|app|server|container|service|1|2|3)$/g, "");
    iconName = clean.replace(/[-_]/g, "");
  }

  const dashboardIconBase =
    "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png";

  let category = "Infra";
  let fallbackIcon = "container";

  if (
    fullText.includes("open-webui") ||
    fullText.includes("ollama") ||
    fullText.includes("ai")
  ) {
    category = "AI";
    fallbackIcon = "bot";
  } else if (fullText.includes("navidrome") || fullText.includes("lidarr")) {
    category = "Media";
    fallbackIcon = "music";
  } else if (
    fullText.includes("home-assistant") ||
    fullText.includes("mosquitto")
  ) {
    category = "Automation";
    fallbackIcon = "workflow";
  }

  return {
    category,
    icon: fallbackIcon,
    iconUrl: `${dashboardIconBase}/${iconName}.png`,
  };
}

app.get(["/api/containers", "/api/services"], async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  try {
    const rawContainers = await docker.listContainers({ all: true });
    const customOverrides = getCustomServices();

    const hostHeader = req.headers.host || req.hostname;
    const clientHost = hostHeader.split(":")[0];

    const containerServices = rawContainers.map((container) => {
      const rawName = container.Names[0]
        ? container.Names[0].replace("/", "")
        : "unnamed";

      const cleanName = rawName.toLowerCase();
      const meta = inferCategoryAndIcon(rawName, container.Image || "");

      const stackName =
        container.Labels?.["com.docker.compose.project"] || "standalone";

      const custom =
        customOverrides.find(
          (c) => c.id === container.Id || c.containerName === rawName,
        ) || {};

      let detectedPort = null;

      if (Array.isArray(container.Ports) && container.Ports.length > 0) {
        const boundPort = container.Ports.find(
          (p) => p.PublicPort && p.PublicPort > 0,
        );
        if (boundPort) {
          detectedPort = boundPort.PublicPort;
        } else {
          const firstPrivate = container.Ports.find((p) => p.PrivatePort);
          if (firstPrivate) detectedPort = firstPrivate.PrivatePort;
        }
      }

      if (!detectedPort) {
        for (const [key, knownPort] of Object.entries(WELL_KNOWN_PORTS)) {
          if (cleanName.includes(key)) {
            detectedPort = knownPort;
            break;
          }
        }
      }

      const isInternalBackend =
        cleanName.includes("cron") ||
        cleanName.includes("redis") ||
        cleanName.includes("postgres") ||
        cleanName.includes("db-") ||
        cleanName.includes("machine_learning") ||
        cleanName.includes("watchtower");

      let finalUrl = null;
      if (custom.url) {
        finalUrl = custom.url;
      } else if (detectedPort && !isInternalBackend) {
        finalUrl = `http://${clientHost}:${detectedPort}`;
      }

      return {
        id: container.Id,
        containerName: rawName,
        name: custom.name || rawName,
        stack: stackName,
        labels: container.Labels || {},
        status: container.State === "running" ? "online" : "offline",
        online: container.State === "running",
        state: container.State,
        category: custom.category || meta.category,
        icon: custom.icon || meta.icon,
        iconUrl: custom.iconUrl || meta.iconUrl,
        port: isInternalBackend ? null : detectedPort,
        url: finalUrl,
        image: container.Image,
        ports: container.Ports,
        hidden: custom.hidden || false,
      };
    });

    const standaloneCustom = customOverrides.filter(
      (c) =>
        c.isCustom &&
        !containerServices.some(
          (cs) => cs.id === c.id || cs.containerName === c.containerName,
        ),
    );

    const services = [...containerServices, ...standaloneCustom];

    res.json({
      services,
      totalContainers: services.length,
      onlineCount: services.filter((s) => s.online).length,
    });
  } catch (err) {
    console.error("Error fetching containers:", err);
    res
      .status(500)
      .json({ error: "Failed to list containers", details: err.message });
  }
});

app.post("/api/services", (req, res) => {
  try {
    const custom = getCustomServices();
    const newService = {
      id: req.body.id || `custom-${Date.now()}`,
      isCustom: true,
      online: true,
      hidden: false,
      ...req.body,
    };

    custom.push(newService);
    saveCustomServices(custom);
    res.status(201).json(newService);
  } catch (err) {
    res.status(500).json({ error: "Failed to create service" });
  }
});

app.put("/api/services/:id", async (req, res) => {
  try {
    let custom = getCustomServices();
    const { id } = req.params;

    let containerName = req.body.containerName || "";
    if (!containerName) {
      try {
        const rawContainers = await docker.listContainers({ all: true });
        const match = rawContainers.find((c) => c.Id === id);
        if (match && match.Names[0]) {
          containerName = match.Names[0].replace("/", "");
        }
      } catch (e) {}
    }

    const existingIndex = custom.findIndex(
      (s) =>
        s.id === id || (containerName && s.containerName === containerName),
    );

    const updatedData = { id, containerName, ...req.body };

    if (existingIndex > -1) {
      custom[existingIndex] = { ...custom[existingIndex], ...updatedData };
    } else {
      custom.push(updatedData);
    }

    saveCustomServices(custom);
    res.json({ success: true, service: updatedData });
  } catch (err) {
    res.status(500).json({ error: "Failed to update service" });
  }
});

app.delete("/api/services/:id", (req, res) => {
  try {
    const { id } = req.params;
    let custom = getCustomServices();
    custom = custom.filter((s) => s.id !== id);
    saveCustomServices(custom);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete service" });
  }
});

// Telemetry Logic
function getCpuUsage() {
  const cpus = os.cpus();
  let user = 0,
    nice = 0,
    sys = 0,
    idle = 0,
    irq = 0;
  for (const cpu of cpus) {
    user += cpu.times.user;
    nice += cpu.times.nice;
    sys += cpu.times.sys;
    idle += cpu.times.idle;
    irq += cpu.times.irq;
  }
  const total = user + nice + sys + idle + irq;
  return { idle, total };
}

let startCpu = getCpuUsage();
let currentCpuPercent = 0;

setInterval(() => {
  const endCpu = getCpuUsage();
  const idleDiff = endCpu.idle - startCpu.idle;
  const totalDiff = endCpu.total - startCpu.total;
  startCpu = endCpu;
  currentCpuPercent = Math.max(
    0,
    Math.min(100, Math.round((1 - idleDiff / (totalDiff || 1)) * 100)),
  );
}, 2000);

app.get("/api/telemetry", async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  try {
    const cpuPercent = currentCpuPercent;

    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const totalMemGB = parseFloat((totalMemBytes / 1024 ** 3).toFixed(1));
    const freeMemGB = parseFloat((freeMemBytes / 1024 ** 3).toFixed(1));
    const usedMemGB = parseFloat((totalMemGB - freeMemGB).toFixed(1));

    const ramBreakdown = [
      { name: "Used RAM", value: usedMemGB, fill: "#a855f7" },
      { name: "Free RAM", value: freeMemGB, fill: "#22c55e" },
    ];

    let dockerContainers = [];
    try {
      dockerContainers = await docker.listContainers({ all: false });
    } catch (e) {
      console.error("Docker list error:", e.message);
    }

    const processList = await Promise.all(
      dockerContainers.map(async (c) => {
        const name = c.Names[0] ? c.Names[0].replace("/", "") : "unnamed";
        let containerCpu = 0;
        let memUsageMB = 0;

        try {
          const container = docker.getContainer(c.Id);
          const stats = await container.stats({ stream: false });

          const cpuDelta =
            stats.cpu_stats.cpu_usage.total_usage -
            stats.precpu_stats.cpu_usage.total_usage;
          const systemDelta =
            stats.cpu_stats.system_cpu_usage -
            stats.precpu_stats.system_cpu_usage;

          if (systemDelta > 0 && cpuDelta > 0) {
            containerCpu = parseFloat(
              ((cpuDelta / systemDelta) * 100).toFixed(1),
            );
          }

          const memBytes = stats.memory_stats.usage || 0;
          memUsageMB = Math.round(memBytes / (1024 * 1024));
        } catch (err) {
          containerCpu = 0;
          memUsageMB = 0;
        }

        return {
          id: c.Id,
          name,
          pid: c.Id.substring(0, 8),
          cpu: containerCpu,
          mem: `${memUsageMB} MB`,
          memValue: memUsageMB,
          status: c.State === "running" ? "running" : "stopped",
        };
      }),
    );

    processList.sort((a, b) => {
      if (b.cpu !== a.cpu) return b.cpu - a.cpu;
      return b.memValue - a.memValue;
    });

    res.json({
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      cpuLoad: cpuPercent,
      ram: ramBreakdown,
      net: {
        down: Math.floor(Math.random() * 400) + 50,
        up: Math.floor(Math.random() * 120) + 15,
      },
      totalMemGB,
      usedMemGB,
      freeMemGB,
      processes: processList,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to collect telemetry", details: err.message });
  }
});

app.post("/api/containers/:id/:action", async (req, res) => {
  const { id, action } = req.params;
  try {
    const container = docker.getContainer(id);
    if (action === "start") await container.start();
    else if (action === "stop") await container.stop();
    else if (action === "restart") await container.restart();
    else return res.status(400).json({ error: "Invalid action" });

    res.json({ success: true });
  } catch (err) {
    res
      .status(500)
      .json({ error: `Failed to ${action} container`, details: err.message });
  }
});

// --- Stacks Management Endpoints ---

app.get("/api/stacks", async (req, res) => {
  try {
    const rawContainers = await docker.listContainers({ all: true });
    const stackMap = {};

    rawContainers.forEach((c) => {
      const projectName =
        c.Labels?.["com.docker.compose.project"] || "standalone";
      if (!stackMap[projectName]) {
        stackMap[projectName] = {
          name: projectName,
          containers: [],
          status: "stopped",
        };
      }
      stackMap[projectName].containers.push({
        id: c.Id,
        name: c.Names[0] ? c.Names[0].replace("/", "") : c.Id.substring(0, 8),
        state: c.State,
      });
    });

    Object.values(stackMap).forEach((st) => {
      if (st.containers.some((c) => c.state === "running")) {
        st.status = "running";
      }
    });

    const localStackDirs = fs
      .readdirSync(STACKS_DIR, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    localStackDirs.forEach((dirName) => {
      if (!stackMap[dirName]) {
        stackMap[dirName] = {
          name: dirName,
          containers: [],
          status: "stopped",
        };
      }
      const composeFile = path.join(STACKS_DIR, dirName, "docker-compose.yml");
      if (fs.existsSync(composeFile)) {
        stackMap[dirName].composeContent = fs.readFileSync(
          composeFile,
          "utf-8",
        );
      }
    });

    res.json(Object.values(stackMap));
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to list stacks", details: err.message });
  }
});

app.post("/api/stacks", async (req, res) => {
  const { name, composeContent } = req.body;
  if (!name || !composeContent) {
    return res
      .status(400)
      .json({ error: "Stack name and composeContent are required" });
  }

  const stackDir = path.join(STACKS_DIR, name);
  if (!fs.existsSync(stackDir)) {
    fs.mkdirSync(stackDir, { recursive: true });
  }

  const composePath = path.join(stackDir, "docker-compose.yml");
  fs.writeFileSync(composePath, composeContent, "utf-8");

  try {
    const { stdout, stderr } = await execAsync(
      `docker compose -f "${composePath}" -p "${name}" up -d`,
    );
    res.json({ success: true, stdout, stderr });
  } catch (err) {
    res.status(500).json({
      error: "Failed to deploy stack using docker compose",
      details: err.message,
    });
  }
});

app.delete("/api/stacks/:name", async (req, res) => {
  const { name } = req.params;
  const stackDir = path.join(STACKS_DIR, name);
  const composePath = path.join(stackDir, "docker-compose.yml");

  try {
    if (fs.existsSync(composePath)) {
      await execAsync(`docker compose -f "${composePath}" -p "${name}" down`);
      fs.rmSync(stackDir, { recursive: true, force: true });
    } else {
      await execAsync(`docker stack rm "${name}"`).catch(() => {});
    }
    res.json({ success: true });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to stop/remove stack", details: err.message });
  }
});

// Fallback to React App
app.get("*", (req, res) => {
  const indexPath = path.join(distPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res
      .status(404)
      .send("Frontend build not found. Please run 'npm run build'.");
  }
});

app.listen(PORT, () =>
  console.log(`Server listening on http://localhost:${PORT}`),
);
