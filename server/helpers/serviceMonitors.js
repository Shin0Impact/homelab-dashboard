const FETCH_TIMEOUT_MS = 3000;

// Host candidates to reach services across host, container bridge, LAN, or Tailscale
const FALLBACK_HOSTS = [
  "127.0.0.1",
  "localhost",
  "172.17.0.1",
  "host.docker.internal",
  process.env.TAILSCALE_IP,
  process.env.SERVER_LAN_IP,
].filter(Boolean);

/**
 * Attempts fetching an API endpoint across multiple container and host URL combinations.
 */
async function fetchServiceEndpoint(
  containerName,
  defaultPort,
  path,
  options = {},
) {
  const candidateUrls = [
    process.env[`${containerName.toUpperCase().replace(/-/g, "_")}_URL`],
    `http://${containerName}:${defaultPort}${path}`,
    ...FALLBACK_HOSTS.map((host) => `http://${host}:${defaultPort}${path}`),
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
      // 1. Frigate
      fetchServiceEndpoint("frigate", 5000, "/api/events?limit=1"),

      // 2. qBittorrent (Transfer info or Maindata fallback)
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

      // 3. Home Assistant
      fetchServiceEndpoint("homeassistant", 8123, "/api/states", {
        headers: process.env.HA_TOKEN
          ? { Authorization: `Bearer ${process.env.HA_TOKEN}` }
          : {},
      }),

      // 4. Immich (Tries server-info/stats then server/statistics fallback)
      fetchServiceEndpoint("immich-server", 2283, "/api/server-info/stats", {
        headers: process.env.IMMICH_API_KEY
          ? { "x-api-key": process.env.IMMICH_API_KEY }
          : {},
      }).then(async (res) => {
        if (res) return res;
        return fetchServiceEndpoint(
          "immich-server",
          2283,
          "/api/server/statistics",
          {
            headers: process.env.IMMICH_API_KEY
              ? { "x-api-key": process.env.IMMICH_API_KEY }
              : {},
          },
        );
      }),

      // 5. Lidarr Queue
      fetchServiceEndpoint("lidarr", 8686, "/api/v1/queue", {
        headers: process.env.LIDARR_API_KEY
          ? { "X-Api-Key": process.env.LIDARR_API_KEY }
          : {},
      }),

      // 6. YTDL / TubeSync
      fetchServiceEndpoint("youtube-dl", 8081, "/api/history").then(
        async (res) => {
          if (res) return res;
          return fetchServiceEndpoint("ytdl", 8081, "/api/downloads");
        },
      ),
    ]);

  const telemetry = {};

  // Parse Frigate
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
  }

  // Parse qBittorrent
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
  }

  // Parse Home Assistant
  if (haRes?.data) {
    const states = haRes.data;
    if (Array.isArray(states)) {
      const active = states.filter(
        (e) => e.state !== "unavailable" && e.state !== "unknown",
      ).length;
      telemetry.homeassistant = {
        label: "Home Assistant",
        detail: `${active} Active Entities`,
        status: "online",
      };
    } else {
      telemetry.homeassistant = {
        label: "Home Assistant",
        detail: "System Connected",
        status: "online",
      };
    }
  }

  // Parse Immich
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
  }

  // Parse Lidarr
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

  // Parse YTDL
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
  }

  return telemetry;
}
