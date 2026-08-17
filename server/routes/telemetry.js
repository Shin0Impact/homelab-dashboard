import express from "express";
import os from "os";
import { docker } from "../helpers/dockerUtils.js";
import { execAsync, getStorageStats, getCpuUsage } from "../helpers/sysInfo.js";
import { getServicesTelemetry } from "../helpers/serviceMonitors.js";

const router = express.Router();

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

router.get("/services-telemetry", async (req, res) => {
  try {
    const servicesStats = await getServicesTelemetry();
    res.json(servicesStats);
  } catch (err) {
    res.json({
      frigate: { online: false, detail: "Offline" },
      qbittorrent: { online: false, detail: "Offline" },
      homeassistant: { online: false, detail: "Offline" },
      immich: { online: false, detail: "Offline" },
      lidarr: { online: false, detail: "Offline" },
      ytdl: { online: false, detail: "Offline" },
    });
  }
});

router.get("/tailscale", async (req, res) => {
  try {
    const { stdout } = await execAsync("tailscale status --json");
    const status = JSON.parse(stdout);

    const isConnected = status.BackendState === "Running";
    const activePeers = status.Peer ? Object.keys(status.Peer).length : 0;

    res.json({
      connected: isConnected,
      devicesCount: isConnected ? activePeers + 1 : 0,
      tailnet: status.CurrentTailnet?.Name || "tailnet",
    });
  } catch (err) {
    res.json({ connected: false, devicesCount: 0, tailnet: "disconnected" });
  }
});

router.get("/storage", async (req, res) => {
  const stats = await getStorageStats();
  res.json(stats);
});

router.get("/telemetry", async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  try {
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

    processList.sort((a, b) => b.cpu - a.cpu || b.memValue - a.memValue);

    res.json({
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      cpuLoad: currentCpuPercent,
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

export default router;
