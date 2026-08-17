import fetch from "node-fetch";

const FETCH_TIMEOUT_MS = 2500;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export async function getServicesTelemetry() {
  const [frigate, qbittorrent, homeassistant, immich, lidarr, ytdl] =
    await Promise.allSettled([
      // 1. Frigate (Port 5000)
      (async () => {
        const res = await fetchWithTimeout(
          "http://127.0.0.1:5000/api/events?limit=1",
        );
        if (!res.ok) throw new Error("Failed");
        const events = await res.json();
        const lastEvent = events[0];
        return {
          online: true,
          lastDetection: lastEvent
            ? new Date(lastEvent.start_time * 1000).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "None",
          label: lastEvent ? lastEvent.label : "None",
        };
      })(),

      // 2. qBittorrent (Port 8080)
      (async () => {
        const res = await fetchWithTimeout(
          "http://127.0.0.1:8080/api/v2/transfer/info",
        );
        if (!res.ok) throw new Error("Failed");
        const info = await res.json();
        const dlSpeed = (info.dl_info_speed / (1024 * 1024)).toFixed(1);
        return {
          online: true,
          dlSpeedMB: dlSpeed,
          activeDownloads: info.dl_info_speed > 0 ? "Active" : "Idle",
        };
      })(),

      // 3. Home Assistant (Port 8123)
      (async () => {
        const res = await fetchWithTimeout("http://127.0.0.1:8123/api/", {
          headers: process.env.HA_TOKEN
            ? { Authorization: `Bearer ${process.env.HA_TOKEN}` }
            : {},
        });
        return { online: res.ok };
      })(),

      // 4. Immich (Port 2283)
      (async () => {
        const res = await fetchWithTimeout(
          "http://127.0.0.1:2283/api/server-info/stats",
          {
            headers: process.env.IMMICH_API_KEY
              ? { "x-api-key": process.env.IMMICH_API_KEY }
              : {},
          },
        );
        if (!res.ok) throw new Error("Failed");
        const stats = await res.json();
        return {
          online: true,
          photos: stats.photos || 0,
          videos: stats.videos || 0,
        };
      })(),

      // 5. Lidarr (Port 8686)
      (async () => {
        const res = await fetchWithTimeout(
          "http://127.0.0.1:8686/api/v1/queue",
          {
            headers: process.env.LIDARR_API_KEY
              ? { "X-Api-Key": process.env.LIDARR_API_KEY }
              : {},
          },
        );
        if (!res.ok) throw new Error("Failed");
        const queue = await res.json();
        return {
          online: true,
          queuedCount: queue.totalRecords || queue.length || 0,
        };
      })(),

      // 6. YT Downloader / YTDL-Sub
      (async () => {
        const res = await fetchWithTimeout("http://127.0.0.1:8081/api/history");
        return { online: res.ok };
      })(),
    ]);

  return {
    frigate: frigate.status === "fulfilled" ? frigate.value : { online: false },
    qbittorrent:
      qbittorrent.status === "fulfilled"
        ? qbittorrent.value
        : { online: false },
    homeassistant:
      homeassistant.status === "fulfilled"
        ? homeassistant.value
        : { online: false },
    immich: immich.status === "fulfilled" ? immich.value : { online: false },
    lidarr: lidarr.status === "fulfilled" ? lidarr.value : { online: false },
    ytdl: ytdl.status === "fulfilled" ? ytdl.value : { online: false },
  };
}
