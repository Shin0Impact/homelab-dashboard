const FETCH_TIMEOUT_MS = 2500;

async function safeFetchJson(url, options = {}) {
  if (!url) return null;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(id);
    return null;
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export async function getServicesTelemetry() {
  const [
    frigateData,
    qbitData,
    haStates,
    immichData,
    lidarrQueue,
    ytdlHistory,
  ] = await Promise.all([
    // Frigate
    safeFetchJson(
      process.env.FRIGATE_URL || "http://frigate:5000/api/events?limit=1",
    ),

    // qBittorrent
    safeFetchJson(
      process.env.QBITTORRENT_URL ||
        "http://qbittorrent:8080/api/v2/transfer/info",
    ),

    // Home Assistant
    safeFetchJson(
      process.env.HA_URL || "http://homeassistant:8123/api/states",
      {
        headers: process.env.HA_TOKEN
          ? { Authorization: `Bearer ${process.env.HA_TOKEN}` }
          : {},
      },
    ),

    // Immich
    safeFetchJson(
      process.env.IMMICH_URL ||
        "http://immich-server:2283/api/server-info/stats",
      {
        headers: process.env.IMMICH_API_KEY
          ? { "x-api-key": process.env.IMMICH_API_KEY }
          : {},
      },
    ),

    // Lidarr
    safeFetchJson(process.env.LIDARR_URL || "http://lidarr:8686/api/v1/queue", {
      headers: process.env.LIDARR_API_KEY
        ? { "X-Api-Key": process.env.LIDARR_API_KEY }
        : {},
    }),

    // YTDL / TubeSync
    safeFetchJson(process.env.YTDL_URL || "http://youtube-dl:8081/api/history"),
  ]);

  const telemetry = {};

  // 1. Frigate Telemetry
  if (Array.isArray(frigateData) && frigateData.length > 0) {
    const event = frigateData[0];
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
  }

  // 2. qBittorrent Telemetry
  if (qbitData) {
    const dlSpeed = (qbitData.dl_info_speed / (1024 * 1024)).toFixed(1);
    const ulSpeed = (qbitData.up_info_speed / (1024 * 1024)).toFixed(1);

    let detail = "Idle";
    if (qbitData.dl_info_speed > 0 || qbitData.up_info_speed > 0) {
      detail = `↓ ${dlSpeed} MB/s  ↑ ${ulSpeed} MB/s`;
    }

    telemetry.qbittorrent = {
      label: "qBittorrent",
      detail,
      status: "online",
    };
  }

  // 3. Home Assistant Telemetry
  if (Array.isArray(haStates)) {
    const activeEntities = haStates.filter(
      (e) => e.state !== "unavailable" && e.state !== "unknown",
    ).length;
    telemetry.homeassistant = {
      label: "Home Assistant",
      detail: `${activeEntities} Active Entities`,
      status: "online",
    };
  }

  // 4. Immich Telemetry
  if (immichData) {
    const photos = immichData.photos || 0;
    const videos = immichData.videos || 0;
    const usage = formatBytes(immichData.usage || 0);

    telemetry.immich = {
      label: "Immich",
      detail: `${photos} Photos, ${videos} Videos (${usage})`,
      status: "online",
    };
  }

  // 5. Lidarr Telemetry
  if (lidarrQueue) {
    const queueList = Array.isArray(lidarrQueue)
      ? lidarrQueue
      : lidarrQueue.records || [];
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
  if (ytdlHistory) {
    const historyList = Array.isArray(ytdlHistory)
      ? ytdlHistory
      : ytdlHistory.data || [];
    telemetry.ytdl = {
      label: "YTDL",
      detail: `${historyList.length} Downloaded Items`,
      status: "online",
    };
  }

  return telemetry;
}
