import express from "express";
import cors from "cors";
import Docker from "dockerode";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3333;

const DATA_FILE = path.resolve(__dirname, "custom_services.json");

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

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

const isWindows = process.platform === "win32";
const docker = new Docker(
  isWindows
    ? { socketPath: "//./pipe/docker_engine" }
    : { socketPath: "/var/run/docker.sock" },
);

app.use(cors());
app.use(express.json());

const distPath = fs.existsSync(path.resolve(__dirname, "../dist"))
  ? path.resolve(__dirname, "../dist")
  : path.resolve(__dirname, "dist");

app.use(express.static(distPath));

// Known default web UI ports for common self-hosted applications
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

// Containers & Services Endpoint
app.get(["/api/containers", "/api/services"], async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  try {
    const rawContainers = await docker.listContainers({ all: true });
    const customOverrides = getCustomServices();

    const hostHeader = req.headers.host || req.hostname;
    const clientHost = hostHeader.split(":")[0];

    const services = rawContainers.map((container) => {
      const rawName = container.Names[0]
        ? container.Names[0].replace("/", "")
        : "unnamed";

      const cleanName = rawName.toLowerCase();
      const meta = inferCategoryAndIcon(rawName, container.Image || "");

      // Extract real Docker Compose project name, or default to "standalone"
      const stackName =
        container.Labels?.["com.docker.compose.project"] || "standalone";

      // Match by container ID OR raw container name so updates persist
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
      };
    });

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

// Telemetry & System Metrics Endpoint
app.get("/api/telemetry", async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  try {
    // 1. Calculate Real System RAM
    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const totalMemGB = (totalMemBytes / 1024 ** 3).toFixed(1);
    const freeMemGB = parseFloat((freeMemBytes / 1024 ** 3).toFixed(1));
    const usedMemGB = parseFloat((totalMemGB - freeMemGB).toFixed(1));

    // 2. Real Host CPU Load Average
    const loadAvg = os.loadavg()[0]; // 1 min load avg
    const cpuCount = os.cpus().length;
    const cpuPercent = Math.min(Math.round((loadAvg / cpuCount) * 100), 100);

    // 3. Dynamic Memory Allocation breakdown (GB)
    const ramBreakdown = [
      { name: "Used RAM", value: usedMemGB, fill: "#a855f7" },
      { name: "Free RAM", value: freeMemGB, fill: "#22c55e" },
    ];

    let dockerContainers = [];
    try {
      dockerContainers = await docker.listContainers({ all: false });
    } catch (e) {
      // Fallback if socket fails
    }

    const processList = dockerContainers.map((c) => ({
      id: c.Id,
      name: c.Names[0] ? c.Names[0].replace("/", "") : "unnamed",
      pid: c.Id.substring(0, 8),
      status: c.State === "running" ? "running" : "stopped",
    }));

    res.json({
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      cpuLoad: cpuPercent || 15,
      ram: ramBreakdown,
      totalMemGB: totalMemGB,
      usedMemGB: usedMemGB,
      freeMemGB: freeMemGB,
      processes: processList,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to collect telemetry", details: err.message });
  }
});

// Container actions
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

// Resilient PUT endpoint matching by container ID or container name
app.put("/api/services/:id", async (req, res) => {
  try {
    let custom = getCustomServices();
    const { id } = req.params;

    // Retrieve container details from Docker to grab its container name
    let containerName = req.body.containerName || "";
    if (!containerName) {
      try {
        const rawContainers = await docker.listContainers({ all: true });
        const match = rawContainers.find((c) => c.Id === id);
        if (match && match.Names[0]) {
          containerName = match.Names[0].replace("/", "");
        }
      } catch (e) {
        // Fallback if Docker inspect isn't accessible
      }
    }

    const existingIndex = custom.findIndex(
      (s) =>
        s.id === id || (containerName && s.containerName === containerName),
    );

    const updatedData = {
      id,
      containerName,
      ...req.body,
    };

    if (existingIndex > -1) {
      custom[existingIndex] = { ...custom[existingIndex], ...updatedData };
    } else {
      custom.push(updatedData);
    }

    saveCustomServices(custom);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to update service" });
  }
});

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
