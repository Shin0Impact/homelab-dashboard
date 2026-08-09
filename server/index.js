import express from "express";
import cors from "cors";
import Docker from "dockerode";
import si from "systeminformation";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3333;

// Auto-detect Windows Named Pipe vs Linux Socket
const isWindows = process.platform === "win32";
const docker = new Docker(
  isWindows
    ? { socketPath: "//./pipe/docker_engine" }
    : { socketPath: "/var/run/docker.sock" },
);

app.use(cors());
app.use(express.json());

// Helper: Infer categories & icons based on container/image name
function inferCategoryAndIcon(name, image) {
  const text = `${name} ${image}`.toLowerCase();
  if (
    text.includes("chroma") ||
    text.includes("ollama") ||
    text.includes("ai")
  ) {
    return { category: "AI", icon: "brain" };
  }
  if (
    text.includes("navidrome") ||
    text.includes("lidarr") ||
    text.includes("deemix") ||
    text.includes("plex") ||
    text.includes("jellyfin")
  ) {
    return { category: "Media", icon: "music" };
  }
  if (
    text.includes("searxng") ||
    text.includes("ntfy") ||
    text.includes("homeassistant")
  ) {
    return { category: "Automation", icon: "home" };
  }
  return { category: "Infra", icon: "container" };
}

// 1. DOCKER AUTO-DISCOVERY & STATUS
app.get("/api/containers", async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });

    const formatted = containers.map((c) => {
      const cleanName = c.Names[0].replace("/", "");
      const state = c.State;

      const inferred = inferCategoryAndIcon(cleanName, c.Image);
      const category = c.Labels["homelab.category"] || inferred.category;
      const icon = c.Labels["homelab.icon"] || inferred.icon;

      // Extract public port binding
      const publicPort = c.Ports.find((p) => p.PublicPort)?.PublicPort;

      return {
        id: c.Id,
        name: cleanName,
        status: state,
        online: state === "running",
        port: publicPort || null, // Pass back just the raw port
        category,
        icon,
        image: c.Image,
      };
    });

    res.json(formatted);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to query Docker socket", details: err.message });
  }
});

// 2. CONTAINER ACTIONS (Start / Stop / Restart)
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

// 3. CONTAINER LOGS
app.get("/api/containers/:id/logs", async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    const logsBuffer = await container.logs({
      stdout: true,
      stderr: true,
      tail: 150,
      timestamps: true,
    });

    // Clean binary header prefixes from Docker multiplexed stream
    const cleanedLogs = logsBuffer
      .toString("utf-8")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

    res.type("text/plain").send(cleanedLogs);
  } catch (err) {
    res.status(500).send("Failed to fetch container logs.");
  }
});

// 4. LIVE SYSTEM TELEMETRY (CPU, RAM, Disk, Network)
app.get("/api/telemetry", async (req, res) => {
  try {
    const cpu = await si.currentLoad();
    const mem = await si.mem();
    const fs = await si.fsSize();
    const net = await si.networkStats();

    // Get current time string (HH:MM:SS)
    const now = new Date();
    const timestamp = now.toTimeString().split(" ")[0];

    const rxSec = net[0] ? Math.round(net[0].rx_sec / 1024) : 0; // KB/s
    const txSec = net[0] ? Math.round(net[0].tx_sec / 1024) : 0; // KB/s

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
      net: {
        down: rxSec,
        up: txSec,
      },
      diskUsedGB: fs[0] ? (fs[0].used / 1024 / 1024 / 1024).toFixed(1) : 0,
      diskTotalGB: fs[0] ? (fs[0].size / 1024 / 1024 / 1024).toFixed(1) : 0,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch telemetry" });
  }
});

// 5. SERVE FRONTEND STATIC FILES
const distPath = path.resolve(__dirname, "../dist");

app.use(express.static(distPath));

// Fallback catch-all route ONLY for non-API routes
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API route not found" });
  }
  res.sendFile(path.join(distPath, "index.html"));
});

// START SERVER
app.listen(PORT, () => {
  console.log(`Homelab Dashboard running on http://localhost:${PORT}`);
});
