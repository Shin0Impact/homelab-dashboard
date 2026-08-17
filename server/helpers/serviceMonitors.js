import { docker } from "./dockerUtils.js";

const FETCH_TIMEOUT_MS = 2500;

const FALLBACK_HOSTS = [
  "127.0.0.1",
  "localhost",
  "172.17.0.1",
  "host.docker.internal",
];

/**
 * Attempts contacting a service over network API endpoints.
 */
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

/**
 * Checks if a service container exists and is running via Docker Socket as a fallback.
 */
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
    // Docker socket unavailable or not mounted
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
        async (res) => {
          if (res) return res;
          return fetchServiceEndpoint(
            "qbittorrent",
            8080,
            "/api/v2/sync/maindata",
          );
        },
      ),

      fetchServiceEndpoint("homeassistant", 8123, "/api/states"),

      fetchServiceEndpoint(
        "immich-server",
        2283,
        "/api/server-info/stats",
      ).then(async (res) => {
        if (res) return res;
        return fetchServiceEndpoint(
          "immich-server",
          2283,
          "/api/server/statistics",
        );
      }),

      fetchServiceEndpoint("lidarr", 8686, "/api/v1/queue"),

      fetchServiceEndpoint("youtube-dl", 8081, "/api/history").then(
        async (res) => {
          if (res) return res;
          return fetchServiceEndpoint("ytdl", 8081, "/api/downloads");
        },
      ),
    ]);

  const telemetry = {};

  // 1. Frigate
  if (frigateRes?.data) {
    const events = frigateRes.data;
    if (Array.isArray(events) && events.length > 0) {
      const event = events[0];
      const timeStr = event.start_time
        ? new Date(event.start_time * 1000).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
      const camera = event.camera ? ` (${event.camera})` : "";
      telemetry.frigate = {
        label: "Frigate",
        detail: `${event.label || "Motion"}${camera} • ${timeStr}`,
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
    const fallback = await checkDockerContainerRunning(["frigate"]);
    if (fallback) {
      telemetry.frigate = {
        label: "Frigate",
        detail: "Container Active",
        status: "online",
      };
    }
  }

  // 2. qBittorrent
  if (qbitRes?.data) {
    const data = qbitRes.data;
    const serverState = data.server_state || data;
    const dlSpeed = ((serverState.dl_info_speed || 0) / (1024 * 1024)).toFixed(
      1,
    );
    const ulSpeed = ((serverState.up_info_speed || 0) / (1024 * 1024)).toFixed(
      1,
    );

    let detail = "Idle";
    if (
      (serverState.dl_info_speed || 0) > 0 ||
      (serverState.up_info_speed || 0) > 0
    ) {
      detail = `↓ ${dlSpeed} MB/s  ↑ ${ulSpeed} MB/s`;
    }

    telemetry.qbittorrent = {
      label: "qBittorrent",
      detail,
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

  // 3. Home Assistant
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
    const fallback = await checkDockerContainerRunning([
      "homeassistant",
      "home-assistant",
      "ha",
    ]);
    if (fallback) {
      telemetry.homeassistant = {
        label: "Home Assistant",
        detail: "Container Active",
        status: "online",
      };
    }
  }

  // 4. Immich
  if (immichRes?.data) {
    const stats = immichRes.data;
    const photos = stats.photos || stats.photosCount || 0;
    const videos = stats.videos || stats.videosCount || 0;
    const usage = formatBytes(stats.usage || stats.usageBytes || 0);

    telemetry.immich = {
      label: "Immich",
      detail: `${photos} Photos, ${videos} Videos (${usage})`,
      status: "online",
    };
  } else {
    const fallback = await checkDockerContainerRunning([
      "immich-server",
      "immich_server",
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

  // 5. Lidarr
  if (lidarrRes?.data) {
    const queueData = lidarrRes.data;
    const queueList = Array.isArray(queueData)
      ? queueData
      : queueData.records || [];
    const count = queueList.length;
    const activeDownloads = queueList.filter(
      (item) => item.status === "downloading",
    ).length;

    telemetry.lidarr = {
      label: "Lidarr",
      detail:
        count > 0
          ? `${count} Queued (${activeDownloads} Active)`
          : "Queue Empty",
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

  // 6. YTDL / TubeSync
  if (ytdlRes?.data) {
    const historyData = ytdlRes.data;
    const historyList = Array.isArray(historyData)
      ? historyData
      : historyData.data || historyData.items || [];
    telemetry.ytdl = {
      label: "YTDL",
      detail: `${historyList.length} Downloads Completed`,
      status: "online",
    };
  } else {
    const fallback = await checkDockerContainerRunning([
      "youtube-dl",
      "ytdl",
      "tubesync",
      "lidarr-youtube-downloader",
    ]);
    if (fallback) {
      telemetry.ytdl = {
        label: "YTDL",
        detail: "Container Active",
        status: "online",
      };
    }
  }

  return telemetry;
}
