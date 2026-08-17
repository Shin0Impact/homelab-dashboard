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

async function checkDockerContainerRunning(possibleNames) {
  try {
    const containers = await docker.listContainers({ all: false });
    const match = containers.find((c) =>
      c.Names.some((n) =>
        possibleNames.some(
          (name) => n.replace("/", "").toLowerCase() === name.toLowerCase(),
        ),
      ),
    );
    if (match) {
      return {
        online: true,
        status: match.Status || "Running",
        name: match.Names[0].replace("/", ""),
      };
    }
  } catch {
    // Docker socket fallback unavailable
  }
  return null;
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

      // Explicit check for Lidarr YouTube Downloader API or web endpoints
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

  // Priority 1: Lidarr YouTube Downloader
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
    // Check Docker socket directly for common container name variants
    const fallback = await checkDockerContainerRunning([
      "lidarr-youtube-downloader",
      "lidarr_youtube_downloader",
      "lidarr-yt-downloader",
      "yt-downloader",
      "youtube-dl",
    ]);

    if (fallback) {
      telemetry.ytdl = {
        label: "Lidarr YT Downloader",
        detail: `Active • ${fallback.status}`,
        status: "online",
        priority: true,
      };
    }
  }

  // 2. Lidarr
  if (lidarrRes?.data) {
    const queueData = lidarrRes.data;
    const queueList = Array.isArray(queueData)
      ? queueData
      : queueData.records || [];
    const count = queueList.length;

    telemetry.lidarr = {
      label: "Lidarr",
      detail: count > 0 ? `${count} Queued Items` : "Queue Empty",
      status: "online",
    };
  } else {
    const fallback = await checkDockerContainerRunning(["lidarr"]);
    if (fallback) {
      telemetry.lidarr = {
        label: "Lidarr",
        detail: "Container Active",
        status: "online",
      };
    }
  }

  // 3. Frigate
  if (frigateRes?.data) {
    const events = frigateRes.data;
    const detailStr =
      Array.isArray(events) && events.length > 0
        ? `${events[0].label || "Motion"} (${events[0].camera || "Cam"})`
        : "No Motion Events";

    telemetry.frigate = {
      label: "Frigate",
      detail: detailStr,
      status: "online",
    };
  } else {
    const fallback = await checkDockerContainerRunning(["frigate"]);
    if (fallback) {
      telemetry.frigate = {
        label: "Frigate",
        detail: "Container Active",
        status: "online",
      };
    }
  }

  // 4. qBittorrent
  if (qbitRes?.data) {
    const data = qbitRes.data;
    const serverState = data.server_state || data;
    const dlSpeed = ((serverState.dl_info_speed || 0) / (1024 * 1024)).toFixed(
      1,
    );
    const ulSpeed = ((serverState.up_info_speed || 0) / (1024 * 1024)).toFixed(
      1,
    );

    telemetry.qbittorrent = {
      label: "qBittorrent",
      detail:
        (serverState.dl_info_speed || 0) > 0 ? `↓ ${dlSpeed} MB/s` : "Idle",
      status: "online",
    };
  } else {
    const fallback = await checkDockerContainerRunning(["qbittorrent", "qbit"]);
    if (fallback) {
      telemetry.qbittorrent = {
        label: "qBittorrent",
        detail: "Container Active",
        status: "online",
      };
    }
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
    const fallback = await checkDockerContainerRunning(["homeassistant", "ha"]);
    if (fallback) {
      telemetry.homeassistant = {
        label: "Home Assistant",
        detail: "Container Active",
        status: "online",
      };
    }
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
    const fallback = await checkDockerContainerRunning([
      "immich-server",
      "immich",
    ]);
    if (fallback) {
      telemetry.immich = {
        label: "Immich",
        detail: "Container Active",
        status: "online",
      };
    }
  }

  return telemetry;
}
