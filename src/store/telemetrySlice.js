import { createSlice } from "@reduxjs/toolkit";

const loadCachedTelemetry = () => {
  try {
    const cached = localStorage.getItem("homelab_telemetry_cache");
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        cpuHistory: parsed.cpuHistory || [],
        netHistory: parsed.netHistory || [],
        ramData: parsed.ramData || [
          { name: "Used RAM", value: 0, fill: "#a855f7" },
          { name: "Free RAM", value: 0, fill: "#22c55e" },
        ],
        totalRam: parsed.totalRam || "0",
        processes: parsed.processes || [],
        servicesTelemetry: parsed.servicesTelemetry || {
          ytdl: {
            label: "Lidarr YT Downloader",
            detail: "0 in Queue",
            status: "online",
            priority: true,
          },
        },
        errorMsg: null,
      };
    }
  } catch (e) {
    console.warn("Failed to load cached telemetry:", e);
  }
  return {
    cpuHistory: [],
    netHistory: [],
    ramData: [
      { name: "Used RAM", value: 0, fill: "#a855f7" },
      { name: "Free RAM", value: 0, fill: "#22c55e" },
    ],
    totalRam: "0",
    processes: [],
    servicesTelemetry: {
      ytdl: {
        label: "Lidarr YT Downloader",
        detail: "0 in Queue",
        status: "online",
        priority: true,
      },
    },
    errorMsg: null,
  };
};

const initialState = loadCachedTelemetry();

const telemetrySlice = createSlice({
  name: "telemetry",
  initialState,
  reducers: {
    updateTelemetryData: (state, action) => {
      const data = action.payload;
      if (!data || data.error) return;

      state.errorMsg = null;
      const timeStr =
        data.timestamp ||
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

      if (data.cpuLoad !== undefined) {
        state.cpuHistory = [
          ...state.cpuHistory,
          { t: timeStr, cpu: data.cpuLoad },
        ].slice(-20);
      }

      if (data.net) {
        state.netHistory = [
          ...state.netHistory,
          { t: timeStr, down: data.net.down || 0, up: data.net.up || 0 },
        ].slice(-20);
      }

      if (data.ram) {
        state.ramData = [...data.ram];
        if (data.totalMemGB) state.totalRam = data.totalMemGB;
      }

      if (Array.isArray(data.processes)) {
        state.processes = data.processes;
      }

      if (data.servicesTelemetry) {
        state.servicesTelemetry = data.servicesTelemetry;
      }

      // Persist latest state including servicesTelemetry to localStorage
      localStorage.setItem(
        "homelab_telemetry_cache",
        JSON.stringify({
          cpuHistory: state.cpuHistory,
          netHistory: state.netHistory,
          ramData: state.ramData,
          totalRam: state.totalRam,
          processes: state.processes,
          servicesTelemetry: state.servicesTelemetry,
        }),
      );
    },
    setServicesTelemetry: (state, action) => {
      state.servicesTelemetry = action.payload;
      const cached = JSON.parse(
        localStorage.getItem("homelab_telemetry_cache") || "{}",
      );
      localStorage.setItem(
        "homelab_telemetry_cache",
        JSON.stringify({
          ...cached,
          servicesTelemetry: state.servicesTelemetry,
        }),
      );
    },
    setTelemetryError: (state, action) => {
      state.errorMsg = action.payload;
    },
  },
});

export const { updateTelemetryData, setServicesTelemetry, setTelemetryError } =
  telemetrySlice.actions;
export default telemetrySlice.reducer;
