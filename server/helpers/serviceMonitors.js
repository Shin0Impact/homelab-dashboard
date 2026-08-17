import { docker } from "./dockerUtils.js";

const FETCH_TIMEOUT_MS = 2500;

const FALLBACK_HOSTS = [
  "127.0.0.1",
  "localhost",
  "172.17.0.1",
  "host.docker.internal",
];

async function fetchServiceEndpoint(
  containerName,
  defaultPort,
  path,
  options = {},
) {
  const candidateUrls = [
    `http://${containerName}:${defaultPort}${path}`,
    ...FALLBACK_HOSTS.map((host) => `http://${host}:${defaultPort}${path}`),
  ];

  for (const url of candidateUrls) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      if (res.ok) {
        const data = await res.json();
        return { data, resolvedUrl: url };
      }
    } catch {
      clearTimeout(id);
    }
  }
  return null;
}

// Fixed to search ALL containers (all: true) so stopped/exited containers are detected correctly
async function checkDockerContainerStatus(possibleNames) {
  try {
    const containers = await docker.listContainers({ all: true });
    const match = containers.find((c) =>
      c.Names.some((n) =>
        possibleNames.some(
          (name) => n.replace("/", "").toLowerCase() === name.toLowerCase(),
        ),
      ),
    );
    if (match) {
      const isRunning = match.State === "running";
      return {
        exists: true,
        online: isRunning,
        status: match.Status || (isRunning ? "Running" : "Exited"),
        name: match.Names[0].replace("/", ""),
      };
    }
  } catch {
    // Docker socket fallback unavailable
  }
  return null;
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return "";
  const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export async function getServicesTelemetry() {
  const [frigateRes, qbitRes, haRes, immichRes, lidarrRes, ytdlRes] =
    await Promise.all([
      fetchServiceEndpoint("frigate", 5000, "/api/events?limit=1"),
      fetchServiceEndpoint("qbittorrent", 8080, "/api/v2/transfer/info").then(
        async (res) =>
          res ||
          fetchServiceEndpoint("qbittorrent", 8080, "/api/v2/sync/maindata"),
      ),
      fetchServiceEndpoint("homeassistant", 8123, "/api/states"),
      fetchServiceEndpoint(
        "immich-server",
        2283,
        "/api/server-info/stats",
      ).then(
        async (res) =>
          res ||
          fetchServiceEndpoint("immich-server", 2283, "/api/server/statistics"),
      ),
      fetchServiceEndpoint("lidarr", 8686, "/api/v1/queue"),
      fetchServiceEndpoint(
        "lidarr-youtube-downloader",
        8080,
        "/api/history",
      ).then(
        async (res) =>
          res || fetchServiceEndpoint("yt-downloader", 8080, "/api/downloads"),
      ),
    ]);

  const telemetry = {};

  // 1. Lidarr YT Downloader (Always Priority)
  if (ytdlRes?.data) {
    const historyData = ytdlRes.data;
    const historyList = Array.isArray(historyData)
      ? historyData
      : historyData.data || historyData.items || [];

    telemetry.ytdl = {
      label: "Lidarr YT Downloader",
      detail: `${historyList.length} Tracks Processed`,
      status: "online",
      priority: true,
    };
  } else {
    const fallback = await checkDockerContainerStatus([
      "lidarr-youtube-downloader",
      "lidarr_youtube_downloader",
      "lidarr-yt-downloader",
      "yt-downloader",
      "angrido/lidarr-downloader",
    ]);

    telemetry.ytdl = {
      label: "Lidarr YT Downloader",
      detail: fallback ? `Container ${fallback.status}` : "Container Stopped",
      status: fallback?.online ? "online" : "offline",
      priority: true,
    };
  }

  // 2. Frigate (Restored person / event timestamp)
  if (frigateRes?.data) {
    const events = frigateRes.data;
    if (Array.isArray(events) && events.length > 0) {
      const latest = events[0];
      const label = latest.label || "motion";
      const camera = latest.camera || "cam";
      const timeAgo = formatTimeAgo(latest.start_time);
      const detailStr = timeAgo
        ? `${label} (${camera}) • ${timeAgo}`
        : `${label} (${camera})`;

      telemetry.frigate = {
        label: "Frigate",
        detail: detailStr,
        status: "online",
      };
    } else {
      telemetry.frigate = {
        label: "Frigate",
        detail: "No Motion Events",
        status: "online",
      };
    }
  } else {
    const fallback = await checkDockerContainerStatus(["frigate"]);
    telemetry.frigate = {
      label: "Frigate",
      detail: fallback?.online ? "Container Active" : "Offline",
      status: fallback?.online ? "online" : "offline",
    };
  }

  // 3. Lidarr
  if (lidarrRes?.data) {
    const queueData = lidarrRes.data;
    const queueList = Array.isArray(queueData)
      ? queueData
      : queueData.records || [];
    const count = queueList.length;

    telemetry.lidarr = {
      label: "Lidarr",
      detail: count > 0 ? `${count} Queued Items` : "Container Active",
      status: "online",
    };
  } else {
    const fallback = await checkDockerContainerStatus(["lidarr"]);
    telemetry.lidarr = {
      label: "Lidarr",
      detail: fallback?.online ? "Container Active" : "Offline",
      status: fallback?.online ? "online" : "offline",
    };
  }

  // 4. qBittorrent
  if (qbitRes?.data) {
    const data = qbitRes.data;
    const serverState = data.server_state || data;
    const dlSpeed = ((serverState.dl_info_speed || 0) / (1024 * 1024)).toFixed(
      1,
    );

    telemetry.qbittorrent = {
      label: "qBittorrent",
      detail:
        (serverState.dl_info_speed || 0) > 0 ? `↓ ${dlSpeed} MB/s` : "Idle",
      status: "online",
    };
  } else {
    const fallback = await checkDockerContainerStatus(["qbittorrent", "qbit"]);
    telemetry.qbittorrent = {
      label: "qBittorrent",
      detail: fallback?.online ? "Container Active" : "Offline",
      status: fallback?.online ? "online" : "offline",
    };
  }

  // 5. Home Assistant
  if (haRes?.data && Array.isArray(haRes.data)) {
    const active = haRes.data.filter(
      (e) => e.state !== "unavailable" && e.state !== "unknown",
    ).length;
    telemetry.homeassistant = {
      label: "Home Assistant",
      detail: `${active} Active Entities`,
      status: "online",
    };
  } else {
    const fallback = await checkDockerContainerStatus(["homeassistant", "ha"]);
    telemetry.homeassistant = {
      label: "Home Assistant",
      detail: fallback?.online ? "Container Active" : "Offline",
      status: fallback?.online ? "online" : "offline",
    };
  }

  // 6. Immich
  if (immichRes?.data) {
    const stats = immichRes.data;
    const usage = formatBytes(stats.usage || stats.usageBytes || 0);
    telemetry.immich = {
      label: "Immich",
      detail: `${stats.photos || 0} Photos (${usage})`,
      status: "online",
    };
  } else {
    const fallback = await checkDockerContainerStatus([
      "immich-server",
      "immich",
    ]);
    telemetry.immich = {
      label: "Immich",
      detail: fallback?.online ? "Container Active" : "Offline",
      status: fallback?.online ? "online" : "offline",
    };
  }

  return telemetry;
}
