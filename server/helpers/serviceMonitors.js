const FETCH_TIMEOUT_MS = 3000;

/**
 * Attempts fetching an API endpoint across multiple host candidate URLs.
 * Works whether running directly on the host or inside a Docker bridge network.
 */
async function fetchWithFallback(urls, options = {}) {
  for (const url of urls) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      clearTimeout(id);
    }
  }
  return null;
}

export async function getServicesTelemetry() {
  const [frigateData, qbitData, haRes, immichData, lidarrData, ytdlData] =
    await Promise.all([
      // Frigate API
      fetchWithFallback([
        "http://frigate:5000/api/events?limit=1",
        "http://172.17.0.1:5000/api/events?limit=1",
        "http://host.docker.internal:5000/api/events?limit=1",
        "http://127.0.0.1:5000/api/events?limit=1",
      ]),

      // qBittorrent Transfer Info
      fetchWithFallback([
        "http://qbittorrent:8080/api/v2/transfer/info",
        "http://172.17.0.1:8080/api/v2/transfer/info",
        "http://host.docker.internal:8080/api/v2/transfer/info",
        "http://127.0.0.1:8080/api/v2/transfer/info",
      ]),

      // Home Assistant
      fetchWithFallback(
        [
          "http://homeassistant:8123/api/",
          "http://172.17.0.1:8123/api/",
          "http://host.docker.internal:8123/api/",
          "http://127.0.0.1:8123/api/",
        ],
        {
          headers: process.env.HA_TOKEN
            ? { Authorization: `Bearer ${process.env.HA_TOKEN}` }
            : {},
        },
      ),

      // Immich Server Stats
      fetchWithFallback(
        [
          "http://immich-server:2283/api/server-info/stats",
          "http://172.17.0.1:2283/api/server-info/stats",
          "http://host.docker.internal:2283/api/server-info/stats",
          "http://127.0.0.1:2283/api/server-info/stats",
        ],
        {
          headers: process.env.IMMICH_API_KEY
            ? { "x-api-key": process.env.IMMICH_API_KEY }
            : {},
        },
      ),

      // Lidarr Queue
      fetchWithFallback(
        [
          "http://lidarr:8686/api/v1/queue",
          "http://172.17.0.1:8686/api/v1/queue",
          "http://host.docker.internal:8686/api/v1/queue",
          "http://127.0.0.1:8686/api/v1/queue",
        ],
        {
          headers: process.env.LIDARR_API_KEY
            ? { "X-Api-Key": process.env.LIDARR_API_KEY }
            : {},
        },
      ),

      // YouTube Downloader / TubeSync / YTDL
      fetchWithFallback([
        "http://youtube-dl:8081/api/history",
        "http://ytdl:8081/api/history",
        "http://172.17.0.1:8081/api/history",
        "http://host.docker.internal:8081/api/history",
        "http://127.0.0.1:8081/api/history",
      ]),
    ]);

  // Format Frigate motion info
  let frigateDetail = "No Motion";
  if (frigateData && Array.isArray(frigateData) && frigateData.length > 0) {
    const event = frigateData[0];
    const timeStr = event.start_time
      ? new Date(event.start_time * 1000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    frigateDetail = `${event.label || "Motion"} ${timeStr}`.trim();
  }

  // Format qBittorrent speed
  let qbitDetail = "Idle";
  if (qbitData) {
    const speed = (qbitData.dl_info_speed / (1024 * 1024)).toFixed(1);
    qbitDetail = qbitData.dl_info_speed > 0 ? `${speed} MB/s` : "0 MB/s";
  }

  // Format Immich photos and videos count
  let immichDetail = "Online";
  if (immichData) {
    const photos = immichData.photos ?? 0;
    const videos = immichData.videos ?? 0;
    immichDetail = `${photos} Photos, ${videos} Videos`;
  }

  // Format Lidarr queue count
  let lidarrDetail = "Queue Empty";
  if (lidarrData) {
    const count = Array.isArray(lidarrData)
      ? lidarrData.length
      : lidarrData.totalRecords || 0;
    lidarrDetail = `${count} items in queue`;
  }

  // Format YTDL downloads
  let ytdlDetail = "Active";
  if (ytdlData) {
    const total = Array.isArray(ytdlData)
      ? ytdlData.length
      : ytdlData.total || 0;
    ytdlDetail = `${total} downloaded`;
  }

  return {
    frigate: {
      online: Array.isArray(frigateData),
      detail: Array.isArray(frigateData) ? frigateDetail : "Offline",
    },
    qbittorrent: {
      online: !!qbitData,
      detail: qbitData ? qbitDetail : "Offline",
    },
    homeassistant: {
      online: !!haRes,
      detail: haRes ? "System Ready" : "Offline",
    },
    immich: {
      online: !!immichData,
      detail: immichData ? immichDetail : "Offline",
    },
    lidarr: {
      online: !!lidarrData,
      detail: lidarrData ? lidarrDetail : "Offline",
    },
    ytdl: {
      online: !!ytdlData,
      detail: ytdlData ? ytdlDetail : "Offline",
    },
  };
}
