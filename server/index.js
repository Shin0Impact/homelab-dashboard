import express from "express";
import cors from "cors";
import Docker from "dockerode";
import si from "systeminformation";

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to the local Docker socket on the host
//const docker = new Docker({ socketPath: "/var/run/docker.sock" });
// Auto-detect Windows Named Pipe vs Linux Socket
const isWindows = process.platform === "win32";
const docker = new Docker(
  isWindows
    ? { socketPath: "//./pipe/docker_engine" }
    : { socketPath: "/var/run/docker.sock" },
);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Homelab API Server is running" });
});

// 1. DOCKER AUTO-DISCOVERY & STATUS
app.get("/api/containers", async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });

    // Map raw Docker metrics to a clean structure matching your React dashboard
    const formatted = containers.map((c) => {
      const cleanName = c.Names[0].replace("/", "");
      const state = c.State; // "running", "exited", etc.

      // Look for custom docker labels if you set them in docker-compose.yml
      const category = c.Labels["homelab.category"] || "Infra";
      const icon = c.Labels["homelab.icon"] || "container";
      const port = c.Ports.find((p) => p.PublicPort)?.PublicPort;

      return {
        id: c.Id,
        name: cleanName,
        status: state,
        online: state === "running",
        url: port ? `http://localhost:${port}` : "#",
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

// 3. LIVE SYSTEM TELEMETRY (CPU, RAM, Disk)
app.get("/api/telemetry", async (req, res) => {
  try {
    const cpu = await si.currentLoad();
    const mem = await si.mem();
    const fs = await si.fsSize();

    res.json({
      cpuLoad: Math.round(cpu.currentLoad),
      memoryUsedGB: (mem.active / 1024 / 1024 / 1024).toFixed(1),
      memoryTotalGB: (mem.total / 1024 / 1024 / 1024).toFixed(1),
      diskUsedGB: fs[0] ? (fs[0].used / 1024 / 1024 / 1024).toFixed(1) : 0,
      diskTotalGB: fs[0] ? (fs[0].size / 1024 / 1024 / 1024).toFixed(1) : 0,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch telemetry" });
  }
});

app.listen(PORT, () => {
  console.log(`Homelab API server running on http://localhost:${PORT}`);
});
