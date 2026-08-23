import express from "express";
import os from "os";
import si from "systeminformation";
import { docker } from "../helpers/dockerUtils.js";
import { execAsync, getStorageStats } from "../helpers/sysInfo.js";
import { getServicesTelemetry } from "../helpers/serviceMonitors.js";
import { authenticateToken } from "./auth.js";

const router = express.Router();

// Telemetry reveals container names, resource usage, and network topology —
// all of these routes now require login (previously none of them did).
router.get("/services-telemetry", authenticateToken, async (req, res) => {
  try {
    const servicesStats = await getServicesTelemetry();
    res.json(servicesStats);
  } catch (err) {
    res.json({});
  }
});

router.get("/tailscale", authenticateToken, async (req, res) => {
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

router.get("/storage", authenticateToken, async (req, res) => {
  const stats = await getStorageStats();
  res.json(stats);
});

// Real network throughput via `systeminformation` — this used to be
// Math.random(), so the download/upload graph never reflected the actual
// host at all. si.networkStats() reports bytes/sec since its last call, so
// the numbers settle in after the first couple of polls.
async function getNetworkThroughputKBs() {
  try {
    const netStats = await si.networkStats();
    const totalRxSec = netStats.reduce((sum, n) => sum + (n.rx_sec || 0), 0);
    const totalTxSec = netStats.reduce((sum, n) => sum + (n.tx_sec || 0), 0);
    return {
      down: Math.round((totalRxSec / 1024) * 10) / 10,
      up: Math.round((totalTxSec / 1024) * 10) / 10,
    };
  } catch (err) {
    console.error("Network stats error:", err.message);
    return { down: 0, up: 0 };
  }
}

// CPU% via `systeminformation` instead of hand-rolled os.cpus() tick math.
// The old implementation sampled os.cpus() every 2s and derived %busy from
// the idle/total delta itself — mathematically the standard approach, but
// systeminformation already handles the platform-specific quirks that
// approach is prone to across different kernels/architectures (some ARM
// boards and virtualized hosts report CPU tick counters that don't behave
// the way the naive calculation assumes), and it's already a proven
// dependency in this codebase for the network stats above.
async function getCpuPercent() {
  try {
    const load = await si.currentLoad();
    return Math.round(load.currentLoad);
  } catch (err) {
    console.error("CPU load error:", err.message);
    return 0;
  }
}

router.get("/telemetry", authenticateToken, async (req, res) => {
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

    const [cpuLoad, net] = await Promise.all([
      getCpuPercent(),
      getNetworkThroughputKBs(),
    ]);

    res.json({
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      cpuLoad,
      ram: ramBreakdown,
      net,
      totalMemGB,
      usedMemGB,
      freeMemGB,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to collect telemetry", details: err.message });
  }
});

// Per-container CPU/memory breakdown for the Metrics page's process table.
// Split out from /telemetry on purpose: this calls Docker's stats API once
// per running container, which isn't cheap, and /telemetry itself is
// polled globally every second the whole time you're logged in — not just
// while looking at this table. Polling per-container stats at that rate
// for every container on the host is real, sustained CPU overhead, and on
// a lower-power box it can be enough to noticeably move the CPU-usage
// number that this very page reports. This route is only fetched by the
// Metrics page while it's actually open, and at a slower interval.
router.get("/telemetry/processes", authenticateToken, async (req, res) => {
  try {
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

    res.json({ processes: processList });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to collect process telemetry", details: err.message });
  }
});

export default router;
