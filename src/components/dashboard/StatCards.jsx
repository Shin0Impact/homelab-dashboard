import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setServicesTelemetry } from "../../store/telemetrySlice";
import {
  Activity,
  Boxes,
  HardDrive,
  Wifi,
  Camera,
  Download,
  Home,
  Image,
  Music,
  Video,
} from "lucide-react";
import { glass } from "../UIHelpers";

const SERVICE_ICONS = {
  ytdl: { icon: Video, color: "text-red-500" },
  lidarr: { icon: Music, color: "text-emerald-400" },
  frigate: { icon: Camera, color: "text-cyan-400" },
  qbittorrent: { icon: Download, color: "text-blue-400" },
  homeassistant: { icon: Home, color: "text-amber-400" },
  immich: { icon: Image, color: "text-purple-400" },
};

const DEFAULT_SERVICES = {
  ytdl: {
    label: "Lidarr YT Downloader",
    detail: "Fetching Queue...",
    status: "online",
    priority: true,
  },
  frigate: {
    label: "Frigate",
    detail: "Monitoring...",
    status: "online",
  },
};

export function StatCards({
  isCompact,
  totalContainers,
  onlineCount,
  offlineCount,
  storage,
  tailscale,
}) {
  const dispatch = useDispatch();
  const [isHoveredStorage, setIsHoveredStorage] = useState(false);

  const storeTelemetry = useSelector((state) => state.telemetry.servicesTelemetry);

  const servicesTelemetry = {
    ...DEFAULT_SERVICES,
    ...storeTelemetry,
  };

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const token = localStorage.getItem("homelab_token");
        const res = await fetch("/api/services-telemetry", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          dispatch(setServicesTelemetry(data));
        }
      } catch {
        // Silently retain cached telemetry
      }
    };

    fetchServices();
    const interval = setInterval(fetchServices, 5000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const activeServices = Object.entries(servicesTelemetry)
    .filter(([_, data]) => data && (data.status === "online" || data.priority))
    .sort(([keyA, dataA], [keyB, dataB]) => {
      if (dataA.priority || keyA === "ytdl") return -1;
      if (dataB.priority || keyB === "ytdl") return 1;
      return 0;
    });

  return (
    <div className="space-y-3">
      <div className={`grid grid-cols-2 lg:grid-cols-4 ${isCompact ? "gap-2" : "gap-3"}`}>
        {/* Total Containers */}
        <div className={`flex flex-col justify-between rounded-xl transition-all ${isCompact ? "h-28 p-2.5" : "h-32 p-4"} ${glass}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Containers</span>
            <div className={`flex items-center justify-center rounded-lg bg-teal-500/15 text-teal-400 ${isCompact ? "h-6 w-6" : "h-8 w-8"}`}>
              <Boxes className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            </div>
          </div>
          <div>
            <p className={`font-bold ${isCompact ? "text-xl" : "text-2xl"}`}>{totalContainers}</p>
            <p className="truncate text-[11px] text-muted-foreground">Discovered via Socket</p>
          </div>
        </div>

        {/* Services Online */}
        <div className={`flex flex-col justify-between rounded-xl transition-all ${isCompact ? "h-28 p-2.5" : "h-32 p-4"} ${glass}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Services Online</span>
            <div className={`flex items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 ${isCompact ? "h-6 w-6" : "h-8 w-8"}`}>
              <Activity className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            </div>
          </div>
          <div>
            <p className={`font-bold ${isCompact ? "text-xl" : "text-2xl"}`}>{onlineCount}</p>
            <p className="truncate text-[11px] text-muted-foreground">{offlineCount} offline</p>
          </div>
        </div>

        {/* Storage: Works on Hover (Desktop) AND Tap (Mobile) */}
        <div
          className={`group flex flex-col justify-between rounded-xl transition-all duration-200 cursor-pointer ${isCompact ? "h-28 p-2.5" : "h-32 p-4"} ${glass} hover:border-amber-500/30`}
          onMouseEnter={() => setIsHoveredStorage(true)}
          onMouseLeave={() => setIsHoveredStorage(false)}
          onClick={() => setIsHoveredStorage((prev) => !prev)}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Storage</span>
            <div className={`flex items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 ${isCompact ? "h-6 w-6" : "h-8 w-8"}`}>
              <HardDrive className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            </div>
          </div>

          {!isHoveredStorage || !storage.drives || storage.drives.length === 0 ? (
            <div>
              <p className={`font-bold ${isCompact ? "text-xl" : "text-2xl"}`}>
                {storage.loading ? "Checking..." : storage.usedFormatted}
              </p>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="truncate">of {storage.totalFormatted} pool</span>
                {storage.drives && storage.drives.length > 0 && (
                  <span className="text-[10px] font-medium text-amber-400/80 group-hover:text-amber-300">
                    (Tap/Hover)
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="my-auto max-h-[4.5rem] space-y-1.5 overflow-y-auto pr-0.5 [scrollbar-width:none]">
              {storage.drives.map((d, i) => (
                <div key={i} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="max-w-[100px] truncate font-mono font-medium text-foreground" title={d.mount}>
                      {d.mount}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {d.usedFormatted} / {d.totalFormatted}
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-secondary/80">
                    <div
                      className={`h-full transition-all duration-300 ${d.percentage > 85 ? "bg-red-500" : d.percentage > 70 ? "bg-amber-500" : "bg-teal-400"}`}
                      style={{ width: `${Math.min(100, Math.max(0, d.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tailscale */}
        <div className={`flex flex-col justify-between rounded-xl transition-all ${isCompact ? "h-28 p-2.5" : "h-32 p-4"} ${glass}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Tailscale</span>
            <div className={`flex items-center justify-center rounded-lg ${tailscale.connected ? "bg-purple-500/15 text-purple-400" : "bg-red-500/15 text-red-400"} ${isCompact ? "h-6 w-6" : "h-8 w-8"}`}>
              <Wifi className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            </div>
          </div>
          <div>
            <p className={`font-bold ${isCompact ? "text-lg" : "text-xl"}`}>
              {tailscale.loading ? "Checking..." : tailscale.connected ? "Connected" : "Disconnected"}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {tailscale.connected ? `${tailscale.devicesCount} devices in tailnet` : "Mesh VPN offline"}
            </p>
          </div>
        </div>
      </div>

      {/* Telemetry Bar */}
      {activeServices.length > 0 && (
        <div className="flex flex-wrap gap-2.5 pt-1">
          {activeServices.map(([key, data]) => {
            const serviceConfig = SERVICE_ICONS[key] || { icon: Activity, color: "text-teal-400" };
            const IconComponent = serviceConfig.icon;
            const extraBorder = serviceConfig.border ? serviceConfig.border : "";

            return (
              <div key={key} className={`flex min-w-[240px] flex-1 items-center gap-3 rounded-xl p-3 ${glass} ${extraBorder}`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/50 ${serviceConfig.color}`}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {data.label}
                  </p>
                  <p className="text-xs font-semibold leading-tight text-foreground break-words" title={data.detail}>
                    {data.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}