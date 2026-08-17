const FETCH_TIMEOUT_MS = 2500;

async function safeFetchJson(url, options = {}) {
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

export async function getServicesTelemetry() {
  const [frigateData, qbitData, haRes, immichData, lidarrData, ytdlRes] =
    await Promise.all([
      safeFetchJson("http://127.0.0.1:5000/api/events?limit=1"),
      safeFetchJson("http://127.0.0.1:8080/api/v2/transfer/info"),
      safeFetchJson("http://127.0.0.1:8123/api/", {
        headers: process.env.HA_TOKEN
          ? { Authorization: `Bearer ${process.env.HA_TOKEN}` }
          : {},
      }),
      safeFetchJson("http://127.0.0.1:2283/api/server-info/stats", {
        headers: process.env.IMMICH_API_KEY
          ? { "x-api-key": process.env.IMMICH_API_KEY }
          : {},
      }),
      safeFetchJson("http://127.0.0.1:8686/api/v1/queue", {
        headers: process.env.LIDARR_API_KEY
          ? { "X-Api-Key": process.env.LIDARR_API_KEY }
          : {},
      }),
      safeFetchJson("http://127.0.0.1:8081/api/history"),
    ]);

  return {
    frigate: frigateData
      ? {
          online: true,
          lastDetection: frigateData[0]
            ? new Date(frigateData[0].start_time * 1000).toLocaleTimeString(
                [],
                { hour: "2-digit", minute: "2-digit" },
              )
            : "None",
          label: frigateData[0]?.label || "None",
        }
      : { online: false },

    qbittorrent: qbitData
      ? {
          online: true,
          dlSpeedMB: (qbitData.dl_info_speed / (1024 * 1024)).toFixed(1),
          activeDownloads: qbitData.dl_info_speed > 0 ? "Active" : "Idle",
        }
      : { online: false },

    homeassistant: { online: !!haRes },

    immich: immichData
      ? {
          online: true,
          photos: immichData.photos || 0,
          videos: immichData.videos || 0,
        }
      : { online: false },

    lidarr: lidarrData
      ? {
          online: true,
          queuedCount: lidarrData.totalRecords || lidarrData.length || 0,
        }
      : { online: false },

    ytdl: { online: !!ytdlRes },
  };
}
