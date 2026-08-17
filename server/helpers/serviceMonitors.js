const FETCH_TIMEOUT_MS = 2500;

// Host fallback candidates depending on the environment
const FALLBACK_HOSTS = [
  "127.0.0.1",
  "localhost",
  "172.17.0.1",
  "host.docker.internal",
  process.env.TAILSCALE_IP,
  process.env.SERVER_LAN_IP,
].filter(Boolean);

/**
 * Tries contacting a service across multiple dynamic host configurations.
 */
async function fetchServiceEndpoint(containerName, port, path, options = {}) {
  // Construct all possible URL permutations dynamically
  const candidateUrls = [
    // Custom ENV override if provided
    process.env[`${containerName.toUpperCase().replace(/-/g, "_")}_URL`],
    // Internal Docker network DNS
    `http://${containerName}:${port}${path}`,
    // Fallback host IPs (Localhost, Docker Gateway, Tailscale IP, LAN IP)
    ...FALLBACK_HOSTS.map((host) => `http://${host}:${port}${path}`),
  ].filter(Boolean);

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
      // Frigate
      fetchServiceEndpoint("frigate", 5000, "/api/events?limit=1"),

      // qBittorrent
      fetchServiceEndpoint("qbittorrent", 8080, "/api/v2/transfer/info"),

      // Home Assistant
      fetchServiceEndpoint("homeassistant", 8123, "/api/states", {
        headers: process.env.HA_TOKEN
          ? { Authorization: `Bearer ${process.env.HA_TOKEN}` }
          : {},
      }),

      // Immich
      fetchServiceEndpoint("immich-server", 2283, "/api/server-info/stats", {
        headers: process.env.IMMICH_API_KEY
          ? { "x-api-key": process.env.IMMICH_API_KEY }
          : {},
      }),

      // Lidarr
      fetchServiceEndpoint("lidarr", 8686, "/api/v1/queue", {
        headers: process.env.LIDARR_API_KEY
          ? { "X-Api-Key": process.env.LIDARR_API_KEY }
          : {},
      }),

      // YTDL / TubeSync
      fetchServiceEndpoint("youtube-dl", 8081, "/api/history"),
    ]);

  const telemetry = {};

  // 1. Frigate Telemetry
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
        detail: "No Recent Events",
        status: "online",
      };
    }
  }

  // 2. qBittorrent Telemetry
  if (qbitRes?.data) {
    const qbit = qbitRes.data;
    const dlSpeed = ((qbit.dl_info_speed || 0) / (1024 * 1024)).toFixed(1);
    const ulSpeed = ((qbit.up_info_speed || 0) / (1024 * 1024)).toFixed(1);

    let detail = "Idle";
    if (qbit.dl_info_speed > 0 || qbit.up_info_speed > 0) {
      detail = `↓ ${dlSpeed} MB/s  ↑ ${ulSpeed} MB/s`;
    }

    telemetry.qbittorrent = {
      label: "qBittorrent",
      detail,
      status: "online",
    };
  }

  // 3. Home Assistant Telemetry
  if (haRes?.data) {
    const states = haRes.data;
    if (Array.isArray(states)) {
      const activeEntities = states.filter(
        (e) => e.state !== "unavailable" && e.state !== "unknown",
      ).length;
      telemetry.homeassistant = {
        label: "Home Assistant",
        detail: `${activeEntities} Active Entities`,
        status: "online",
      };
    } else {
      telemetry.homeassistant = {
        label: "Home Assistant",
        detail: "Connected",
        status: "online",
      };
    }
  }

  // 4. Immich Telemetry
  if (immichRes?.data) {
    const stats = immichRes.data;
    const photos = stats.photos || 0;
    const videos = stats.videos || 0;
    const usage = formatBytes(stats.usage || 0);

    telemetry.immich = {
      label: "Immich",
      detail: `${photos} Photos, ${videos} Videos (${usage})`,
      status: "online",
    };
  }

  // 5. Lidarr Telemetry
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
  }

  // 6. YTDL Telemetry
  if (ytdlRes?.data) {
    const historyData = ytdlRes.data;
    const historyList = Array.isArray(historyData)
      ? historyData
      : historyData.data || [];
    telemetry.ytdl = {
      label: "YTDL",
      detail: `${historyList.length} Downloaded Items`,
      status: "online",
    };
  }

  return telemetry;
}
