import React, { useState, useEffect } from "react"
import {
  Activity,
  Boxes,
  HardDrive,
  RefreshCw,
  Search,
  ExternalLink,
  Wifi,
  Play,
  Square,
  Loader2,
} from "lucide-react"
import {
  CategoryTag,
  ServiceIcon,
  StatusDot,
  glass,
  useCompactMode,
  useDynamicPolling,
} from "./UIHelpers"

export function Dashboard({ services = [], categories = [], onRefresh }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("All")
  const [loadingMap, setLoadingMap] = useState({})
  
  // Dynamic Tailscale State
  const [tailscale, setTailscale] = useState({
    connected: false,
    devicesCount: 0,
    loading: true,
  })

  // Dynamic Storage State
  const [storage, setStorage] = useState({
    usedFormatted: "-- GB",
    totalFormatted: "-- GB",
    loading: true,
  })

  // Subscribe to settings customization
  const isCompact = useCompactMode()

  // Fetch Tailscale Telemetry
  const fetchTailscaleStatus = async () => {
    try {
      const res = await fetch("/api/tailscale")
      if (res.ok) {
        const data = await res.json()
        setTailscale({ ...data, loading: false })
      }
    } catch {
      setTailscale({ connected: false, devicesCount: 0, loading: false })
    }
  }

  // Fetch Storage Telemetry
  const fetchStorageStatus = async () => {
    try {
      const res = await fetch("/api/storage")
      if (res.ok) {
        const data = await res.json()
        setStorage({ ...data, loading: false })
      }
    } catch {
      setStorage({ usedFormatted: "N/A", totalFormatted: "N/A", loading: false })
    }
  }

  useEffect(() => {
    fetchTailscaleStatus()
    fetchStorageStatus()
  }, [])

  // Polling auto-refresh using dynamic slider setting
  useDynamicPolling(() => {
    if (onRefresh) onRefresh()
    fetchTailscaleStatus()
    fetchStorageStatus()
  })

  // Helper to determine if service is online regardless of backend property naming
  const checkIsOnline = (s) => s.online || s.status === "online" || s.state === "running"

  const totalContainers = services.length
  const onlineCount = services.filter(checkIsOnline).length
  const offlineCount = totalContainers - onlineCount

  // Extract available categories
  const filterOptions = [
    "All",
    ...new Set([...categories, ...services.map((s) => s.category).filter(Boolean)]),
  ]

  const filteredServices = services.filter((s) => {
    if (s.hidden) return false
    const matchesQuery = s.name?.toLowerCase().includes(query.toLowerCase())
    const matchesFilter = filter === "All" || s.category === filter
    return matchesQuery && matchesFilter
  })

  // Start / Stop Toggle Handler
  const handleToggleContainer = async (service) => {
    const isOnline = checkIsOnline(service)
    const action = isOnline ? "stop" : "start"

    setLoadingMap((prev) => ({ ...prev, [service.id]: true }))

    try {
      const res = await fetch(`/api/containers/${service.id}/${action}`, {
        method: "POST",
      })
      if (res.ok && onRefresh) {
        await onRefresh()
      }
    } catch (err) {
      console.error(`Failed to ${action} container:`, err)
    } finally {
      setLoadingMap((prev) => ({ ...prev, [service.id]: false }))
    }
  }

  // Helper to resolve URL using current browser host
  const getLaunchUrl = (s) => {
    const detectedPort =
      s.port ||
      (Array.isArray(s.ports) && s.ports.find((p) => p.PublicPort)?.PublicPort)

    if (detectedPort) {
      return `${window.location.protocol}//${window.location.hostname}:${detectedPort}`
    }

    if (s.url && s.url !== "#") {
      try {
        const parsed = new URL(s.url)
        if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
          parsed.hostname = window.location.hostname
          parsed.protocol = window.location.protocol
        }
        return parsed.toString()
      } catch {
        return s.url
      }
    }

    return null
  }

  return (
    <div className={`w-full transition-all ${isCompact ? "space-y-3 p-3 sm:p-4" : "space-y-5 p-4 sm:p-6 md:p-8"}`}>
      {/* 1. Stat Cards */}
      <div className={`grid grid-cols-2 lg:grid-cols-4 ${isCompact ? "gap-2" : "gap-3"}`}>
        {/* Total Containers */}
        <div className={`rounded-xl transition-all ${isCompact ? "p-2.5" : "p-4"} ${glass}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Total Containers
            </span>
            <div className={`flex items-center justify-center rounded-lg bg-primary/15 text-primary ${isCompact ? "h-6 w-6" : "h-8 w-8"}`}>
              <Boxes className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            </div>
          </div>
          <p className={`font-bold ${isCompact ? "mt-1 text-xl" : "mt-2 text-2xl"}`}>{totalContainers}</p>
          <p className="text-[11px] text-muted-foreground">
            Discovered via Socket
          </p>
        </div>

        {/* Services Online */}
        <div className={`rounded-xl transition-all ${isCompact ? "p-2.5" : "p-4"} ${glass}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Services Online
            </span>
            <div className={`flex items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 ${isCompact ? "h-6 w-6" : "h-8 w-8"}`}>
              <Activity className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            </div>
          </div>
          <p className={`font-bold ${isCompact ? "mt-1 text-xl" : "mt-2 text-2xl"}`}>{onlineCount}</p>
          <p className="text-[11px] text-muted-foreground">
            {offlineCount} offline
          </p>
        </div>

        {/* Storage (Dynamic) */}
        <div className={`rounded-xl transition-all ${isCompact ? "p-2.5" : "p-4"} ${glass}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Storage
            </span>
            <div className={`flex items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 ${isCompact ? "h-6 w-6" : "h-8 w-8"}`}>
              <HardDrive className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            </div>
          </div>
          <p className={`font-bold ${isCompact ? "mt-1 text-xl" : "mt-2 text-2xl"}`}>
            {storage.loading ? "Checking..." : storage.usedFormatted}
          </p>
          <p className="text-[11px] text-muted-foreground">
            of {storage.totalFormatted} pool used
          </p>
        </div>

        {/* Tailscale Stat Card (Dynamic) */}
        <div className={`rounded-xl transition-all ${isCompact ? "p-2.5" : "p-4"} ${glass}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Tailscale
            </span>
            <div className={`flex items-center justify-center rounded-lg ${
              tailscale.connected 
                ? "bg-purple-500/15 text-purple-400" 
                : "bg-red-500/15 text-red-400"
            } ${isCompact ? "h-6 w-6" : "h-8 w-8"}`}>
              <Wifi className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            </div>
          </div>
          <p className={`font-bold ${isCompact ? "mt-1 text-lg" : "mt-2 text-xl"}`}>
            {tailscale.loading 
              ? "Checking..." 
              : tailscale.connected 
              ? "Connected" 
              : "Disconnected"}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {tailscale.connected 
              ? `${tailscale.devicesCount} devices in tailnet` 
              : "Mesh VPN offline"}
          </p>
        </div>
      </div>

      {/* 2. Search Bar & Horizontal Category Scroll */}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between ${isCompact ? "gap-2" : "gap-3"}`}>
        <div
          className={`flex items-center gap-2 rounded-xl px-3.5 sm:w-72 ${isCompact ? "py-1.5" : "py-2.5"} ${glass}`}
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Horizontally Scrollable Categories */}
        <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:pb-0 [scrollbar-width:none]">
          {filterOptions.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full border transition-colors ${
                isCompact ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
              } font-medium ${
                filter === f
                  ? "border-primary/40 bg-primary/20 text-primary"
                  : "border-white/5 bg-secondary/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Responsive Container Grid */}
      <div className={`grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${isCompact ? "gap-2.5" : "gap-3.5"}`}>
        {filteredServices.map((s) => {
          const isOnline = checkIsOnline(s)
          const computedUrl = getLaunchUrl(s)
          const isLoading = !!loadingMap[s.id]

          return (
            <div
              key={s.id}
              className={`flex flex-col justify-between rounded-2xl transition-all hover:bg-secondary/20 ${
                isCompact ? "p-3" : "p-4"
              } ${glass}`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className={`flex items-center justify-center rounded-xl bg-secondary/80 ring-1 ring-white/5 ${
                    isCompact ? "h-9 w-9" : "h-11 w-11"
                  }`}>
                    <ServiceIcon service={s} className={isCompact ? "h-5 w-5" : "h-6 w-6"} />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-secondary/50 px-2.5 py-0.5">
                    <StatusDot online={isOnline} />
                    <span className="text-[11px] font-medium">
                      {isOnline ? "Running" : "Exited"}
                    </span>
                  </div>
                </div>

                <div className={isCompact ? "mt-2" : "mt-3"}>
                  <h3 className={`truncate font-semibold ${isCompact ? "text-sm" : "text-base"}`}>{s.name}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <CategoryTag category={s.category} />
                    <span className="truncate font-mono text-[11px] text-muted-foreground">
                      {s.image || (s.port ? `:${s.port}` : "")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className={`flex items-center justify-between gap-2 border-t border-white/5 ${
                isCompact ? "mt-3 pt-2" : "mt-4 pt-3"
              }`}>
                <div className="flex items-center gap-1.5">
                  {/* Start / Stop Action Button */}
                  <button
                    onClick={() => handleToggleContainer(s)}
                    disabled={isLoading}
                    title={isOnline ? "Stop Container" : "Start Container"}
                    className={`flex items-center justify-center rounded-lg border transition-colors ${
                      isCompact ? "h-8 w-8" : "h-9 w-9"
                    } ${
                      isOnline
                        ? "border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    } ${isLoading ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isOnline ? (
                      <Square className="h-3.5 w-3.5 fill-current" />
                    ) : (
                      <Play className="h-3.5 w-3.5 fill-current" />
                    )}
                  </button>

                  {/* Refresh Button */}
                  {onRefresh && (
                    <button
                      onClick={onRefresh}
                      className={`flex items-center justify-center rounded-lg bg-secondary/40 text-muted-foreground hover:text-foreground ${
                        isCompact ? "h-8 w-8" : "h-9 w-9"
                      }`}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Dynamic Launch Link */}
                {computedUrl ? (
                  <a
                    href={computedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex items-center gap-2 rounded-xl bg-primary/15 font-semibold text-primary transition-colors hover:bg-primary/25 ${
                      isCompact ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-xs"
                    }`}
                  >
                    Launch
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <button
                    disabled
                    className={`rounded-xl bg-secondary/30 font-medium text-muted-foreground/50 cursor-not-allowed ${
                      isCompact ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-xs"
                    }`}
                  >
                    No Port
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {filteredServices.length === 0 && (
          <div
            className={`col-span-full py-12 text-center text-sm text-muted-foreground ${glass} rounded-2xl`}
          >
            No matching services found.
          </div>
        )}
      </div>
    </div>
  )
}