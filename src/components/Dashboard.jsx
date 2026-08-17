import React, { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { glass, useCompactMode, useDynamicPolling } from "./UIHelpers"
import { StatCards } from "./dashboard/StatCards"
import { ServiceCard } from "./dashboard/ServiceCard"

export function Dashboard({ services = [], categories = [], onRefresh }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("All")
  const [loadingMap, setLoadingMap] = useState({})
  
  const [tailscale, setTailscale] = useState({ connected: false, devicesCount: 0, loading: true })
  const [storage, setStorage] = useState({ usedFormatted: "-- GB", totalFormatted: "-- GB", percentage: 0, drives: [], loading: true })

  const isCompact = useCompactMode()

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

  const fetchStorageStatus = async () => {
    try {
      const res = await fetch("/api/storage")
      if (res.ok) {
        const data = await res.json()
        setStorage({ ...data, loading: false })
      }
    } catch {
      setStorage({ usedFormatted: "N/A", totalFormatted: "N/A", percentage: 0, drives: [], loading: false })
    }
  }

  useEffect(() => {
    fetchTailscaleStatus()
    fetchStorageStatus()
  }, [])

  useDynamicPolling(() => {
    if (onRefresh) onRefresh()
    fetchTailscaleStatus()
    fetchStorageStatus()
  })

  const checkIsOnline = (s) => s.online || s.status === "online" || s.state === "running"
  const totalContainers = services.length
  const onlineCount = services.filter(checkIsOnline).length
  const offlineCount = totalContainers - onlineCount

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

  const handleToggleContainer = async (service) => {
    const isOnline = checkIsOnline(service)
    const action = isOnline ? "stop" : "start"
    setLoadingMap((prev) => ({ ...prev, [service.id]: true }))

    try {
      const res = await fetch(`/api/containers/${service.id}/${action}`, { method: "POST" })
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
      />

      {/* Filter & Search Bar */}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between ${isCompact ? "gap-2" : "gap-3"}`}>
        <div className={`flex items-center gap-2 rounded-xl px-3.5 sm:w-72 ${isCompact ? "py-1.5" : "py-2.5"} ${glass}`}>
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:pb-0 [scrollbar-width:none]">
          {filterOptions.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full border transition-colors ${
                isCompact ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
              } font-medium ${
                filter === f
                  ? "border-teal-500/40 bg-teal-500/20 text-teal-400"
                  : "border-white/5 bg-secondary/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
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
          />
        ))}

        {filteredServices.length === 0 && (
          <div className={`col-span-full rounded-2xl py-12 text-center text-sm text-muted-foreground ${glass}`}>
            No matching services found.
          </div>
        )}
      </div>
    </div>
  )
}