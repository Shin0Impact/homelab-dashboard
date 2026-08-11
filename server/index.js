import express from "express";
import cors from "cors";
import Docker from "dockerode";
import si from "systeminformation";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3333;

const DATA_FILE = path.resolve(__dirname, "custom_services.json");

// Helper to read saved custom services and port overrides
const getCustomServices = () => {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return [];
  }
};

// Helper to save services array to JSON disk file
const saveCustomServices = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// Auto-detect Windows Named Pipe vs Linux Socket
const isWindows = process.platform === "win32";
const docker = new Docker(
  isWindows
    ? { socketPath: "//./pipe/docker_engine" }
    : { socketPath: "/var/run/docker.sock" },
);

app.use(cors());
app.use(express.json());

// Helper: Infer brand icon URL & category based on container name/image
function inferCategoryAndIcon(name, image = "") {
  const text = `${name} ${image}`.toLowerCase();

  // Dashboard-Icons CDN base (handles almost all homelab services)
  const dashboardIconBase =
    "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png";

  // Clean the container name (e.g., "navidrome-server" -> "navidrome")
  const cleanKey = name.toLowerCase().replace(/[-_].*/, "");

  // Default fallbacks
  let category = "Infra";
  let fallbackIcon = "container";

  if (
    text.includes("chroma") ||
    text.includes("ollama") ||
    text.includes("ai")
  ) {
    category = "AI";
    fallbackIcon = "brain";
  } else if (
    text.includes("navidrome") ||
    text.includes("lidarr") ||
    text.includes("deemix") ||
    text.includes("plex") ||
    text.includes("jellyfin")
  ) {
    category = "Media";
    fallbackIcon = "music";
  } else if (
    text.includes("searxng") ||
    text.includes("ntfy") ||
    text.includes("homeassistant") ||
    text.includes("palgate")
  ) {
    category = "Automation";
    fallbackIcon = "home";
  }

  // Construct automatic logo CDN URL
  const iconUrl = `${dashboardIconBase}/${cleanKey}.png`;

  return { category, icon: fallbackIcon, iconUrl };
}

// 1. DOCKER AUTO-DISCOVERY + CUSTOM SERVICES MERGE
app.get("/api/containers", async (req, res) => {
  try {
    const custom = getCustomServices();
    let dockerContainers = [];

    try {
      dockerContainers = await docker.listContainers({ all: true });
    } catch (dockerErr) {
      console.warn("Docker socket query failed:", dockerErr.message);
    }

    const formattedDocker = dockerContainers.map((c) => {
      const cleanName = c.Names[0].replace("/", "");
      const state = c.State;

      const inferred = inferCategoryAndIcon(cleanName, c.Image);
      const category = c.Labels["homelab.category"] || inferred.category;
      const icon = c.Labels["homelab.icon"] || inferred.icon;

      const publicPort = c.Ports.find((p) => p.PublicPort)?.PublicPort;

      // Check if user saved a custom port/category/icon override for this container
      const override = custom.find(
        (item) =>
          item.id === c.Id ||
          item.name.toLowerCase() === cleanName.toLowerCase(),
      );

      return {
        id: c.Id,
        name: override?.name || cleanName,
        status: state,
        online: state === "running",
        port: override?.port !== undefined ? override.port : publicPort || null,
        category: override?.category || category,
        icon: override?.icon || icon,
        iconUrl: override?.iconUrl || inferred.iconUrl,
        image: c.Image,
        isCustom: false,
      };
    });

    // Add purely custom services created through the UI (that are not Docker containers)
    const customOnly = custom
      .filter(
        (item) =>
          !formattedDocker.some(
            (d) =>
              d.id === item.id ||
              d.name.toLowerCase() === item.name.toLowerCase(),
          ),
      )
      .map((item) => {
        const inferred = inferCategoryAndIcon(item.name);
        return {
          ...item,
          status: item.online !== false ? "running" : "exited",
          online: item.online !== false,
          iconUrl: item.iconUrl || inferred.iconUrl,
          isCustom: true,
        };
      });

    res.json([...formattedDocker, ...customOnly]);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch containers", details: err.message });
  }
});

// 2. CRUD ROUTES FOR CUSTOM SERVICES & OVERRIDES
app.post("/api/services", (req, res) => {
  try {
    const custom = getCustomServices();
    const newService = {
      ...req.body,
      id: req.body.id || `custom-${Date.now()}`,
    };
    custom.push(newService);
    saveCustomServices(custom);
    res.json({ success: true, service: newService });
  } catch (err) {
    res.status(500).json({ error: "Failed to save service" });
  }
});

app.put("/api/services/:id", (req, res) => {
  try {
    let custom = getCustomServices();
    const { id } = req.params;
    const existingIndex = custom.findIndex((s) => s.id === id);

    if (existingIndex > -1) {
      custom[existingIndex] = { ...custom[existingIndex], ...req.body };
    } else {
      custom.push({ id, ...req.body });
    }

    saveCustomServices(custom);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update service" });
  }
});

app.delete("/api/services/:id", (req, res) => {
  try {
    let custom = getCustomServices();
    const { id } = req.params;
    custom = custom.filter((s) => s.id !== id);
    saveCustomServices(custom);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete service" });
  }
});

// 3. CONTAINER ACTIONS (Start / Stop / Restart)
app.post("/api/containers/:id/:action", async (req, res) => {
  const { id, action } = req.params;
  const container = docker.getContainer(id);

  try {
    if (action === "start") await container.start();
    else if (action === "stop") await container.stop();
    else if (action === "restart") await container.restart();
    else return res.status(400).json({ error: "Invalid action" });

    res.json({ success: true, message: `Container ${action}ed successfully` });
  } catch (err) {
    res
      .status(500)
      .json({ error: `Failed to ${action} container`, details: err.message });
  }
});

// 4. CONTAINER LOGS
app.get("/api/containers/:id/logs", async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    const logsBuffer = await container.logs({
      stdout: true,
      stderr: true,
      tail: 150,
      timestamps: true,
    });

    const cleanedLogs = logsBuffer
      .toString("utf-8")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

    res.type("text/plain").send(cleanedLogs);
  } catch (err) {
    res.status(500).send("Failed to fetch container logs.");
  }
});

// 5. TELEMETRY
app.get("/api/telemetry", async (req, res) => {
  try {
    const cpu = await si.currentLoad();
    const mem = await si.mem();
    const fsSize = await si.fsSize();
    const net = await si.networkStats();

    const now = new Date();
    const timestamp = now.toTimeString().split(" ")[0];

    const rxSec = net[0] ? Math.round(net[0].rx_sec / 1024) : 0;
    const txSec = net[0] ? Math.round(net[0].tx_sec / 1024) : 0;

    const activeMem = (mem.active / 1024 / 1024 / 1024).toFixed(1);
    const totalMem = (mem.total / 1024 / 1024 / 1024).toFixed(1);
    const freeMem = (mem.free / 1024 / 1024 / 1024).toFixed(1);
    const buffCache = (totalMem - activeMem - freeMem).toFixed(1);

    res.json({
      timestamp,
      cpuLoad: Math.round(cpu.currentLoad),
      ram: [
        { name: "Active", value: parseFloat(activeMem) },
        {
          name: "Free",
          value: parseFloat(freeMem) > 0 ? parseFloat(freeMem) : 0,
        },
        {
          name: "Buffers/Cache",
          value: parseFloat(buffCache) > 0 ? parseFloat(buffCache) : 0,
        },
      ],
      totalMemGB: totalMem,
      net: { down: rxSec, up: txSec },
      diskUsedGB: fsSize[0]
        ? (fsSize[0].used / 1024 / 1024 / 1024).toFixed(1)
        : 0,
      diskTotalGB: fsSize[0]
        ? (fsSize[0].size / 1024 / 1024 / 1024).toFixed(1)
        : 0,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch telemetry" });
  }
});

// 6. SERVE FRONTEND STATIC FILES
const distPath = path.resolve(__dirname, "../dist");
app.use(express.static(distPath));

app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API route not found" });
  }
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Homelab Dashboard running on http://localhost:${PORT}`);
});
