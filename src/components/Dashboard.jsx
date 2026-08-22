import React, { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { glass, useCompactMode, useDynamicPolling } from "./UIHelpers"
import { StatCards } from "./dashboard/StatCards"
import { ServiceCard } from "./dashboard/ServiceCard"
import { authFetch } from "../lib/api"

export function Dashboard({ services = [], onRefresh, isAdmin = false }) {
  const [query, setQuery] = useState("")
  const [loadingMap, setLoadingMap] = useState({})

  const [tailscale, setTailscale] = useState({ connected: false, devicesCount: 0, loading: true })
  const [storage, setStorage] = useState({ usedFormatted: "-- GB", totalFormatted: "-- GB", percentage: 0, drives: [], loading: true })
  const [servicesTelemetry, setServicesTelemetry] = useState(null) // Added

  const isCompact = useCompactMode()

  const fetchTailscaleStatus = async () => {
    try {
      const res = await authFetch("/api/tailscale")
      if (res.ok) {
        const data = await res.json()
        setTailscale({ ...data, loading: false })
      }
    } catch {
      setTailscale({ connected: false, devicesCount: 0, loading: false })
    }
  }

  const fetchStorageStatus = async () => {
    try {
      const res = await authFetch("/api/storage")
      if (res.ok) {
        const data = await res.json()
        setStorage({ ...data, loading: false })
      }
    } catch {
      setStorage({ usedFormatted: "N/A", totalFormatted: "N/A", percentage: 0, drives: [], loading: false })
    }
  }

  const fetchServicesTelemetry = async () => {
    try {
      const res = await authFetch("/api/services-telemetry")
      if (res.ok) {
        const data = await res.json()
        setServicesTelemetry(data)
      }
    } catch {
      setServicesTelemetry(null)
    }
  }

  useEffect(() => {
    fetchTailscaleStatus()
    fetchStorageStatus()
    fetchServicesTelemetry()
  }, [])

  useDynamicPolling(() => {
    if (onRefresh) onRefresh()
    fetchTailscaleStatus()
    fetchStorageStatus()
    fetchServicesTelemetry()
  })

  const checkIsOnline = (s) => s.online || s.status === "online" || s.state === "running"
  const totalContainers = services.length
  const onlineCount = services.filter(checkIsOnline).length
  const offlineCount = totalContainers - onlineCount

  // Only display favorite services on the Dashboard
  const favoriteServices = services.filter((s) => s.is_favorite || s.favorite)

  const filteredServices = favoriteServices.filter((s) =>
    s.name?.toLowerCase().includes(query.toLowerCase())
  )

  const handleToggleContainer = async (service) => {
    if (!isAdmin) return
    const isOnline = checkIsOnline(service)
    const action = isOnline ? "stop" : "start"
    setLoadingMap((prev) => ({ ...prev, [service.id]: true }))

    try {
      const res = await authFetch(`/api/containers/${service.id}/${action}`, {
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

  return (
    <div className={`w-full transition-all ${isCompact ? "space-y-3 p-3 sm:p-4" : "space-y-5 p-4 sm:p-6 md:p-8"}`}>
      <StatCards
        isCompact={isCompact}
        totalContainers={totalContainers}
        onlineCount={onlineCount}
        offlineCount={offlineCount}
        storage={storage}
        tailscale={tailscale}
        servicesTelemetry={servicesTelemetry}
      />

      {/* Search Bar */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 rounded-xl px-3.5 sm:w-72 ${isCompact ? "py-1.5" : "py-2.5"} ${glass}`}>
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search favorite services…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Favorite Services Grid */}
      <div className={`grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${isCompact ? "gap-2.5" : "gap-3.5"}`}>
        {filteredServices.map((s) => (
          <ServiceCard
            key={s.id}
            service={s}
            isCompact={isCompact}
            isOnline={checkIsOnline(s)}
            isLoading={!!loadingMap[s.id]}
            onToggle={handleToggleContainer}
            onRefresh={onRefresh}
            isAdmin={isAdmin}
          />
        ))}

        {filteredServices.length === 0 && (
          <div className={`col-span-full rounded-2xl py-12 text-center text-sm text-muted-foreground ${glass}`}>
            {favoriteServices.length === 0
              ? "No favorite services starred yet. Star services in the Manage tab to display them here."
              : "No matching favorite services found."}
          </div>
        )}
      </div>
    </div>
  )
}
