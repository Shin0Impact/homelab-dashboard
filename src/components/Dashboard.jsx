import React, { useState } from "react"
import { Activity, Boxes, HardDrive, RefreshCw, Search, ExternalLink, Wifi } from "lucide-react"
import { CategoryTag, ServiceIcon, StatusDot, glass } from "./UIHelpers"

export function Dashboard({ services = [], categories = [], onRefresh }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("All")

  const totalContainers = services.length
  const onlineCount = services.filter((s) => s.online).length
  const offlineCount = totalContainers - onlineCount

  // Extract available categories
  const filterOptions = ["All", ...new Set([...categories, ...services.map((s) => s.category).filter(Boolean)])]

  const filteredServices = services.filter((s) => {
    if (s.hidden) return false
    const matchesQuery = s.name.toLowerCase().includes(query.toLowerCase())
    const matchesFilter = filter === "All" || s.category === filter
    return matchesQuery && matchesFilter
  })

  return (
    <div className="w-full space-y-5 p-4 sm:p-6 md:p-8">
      {/* 1. Stat Cards: 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Containers */}
        <div className={`rounded-xl p-4 ${glass}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Containers</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold">{totalContainers}</p>
          <p className="text-[11px] text-muted-foreground">Discovered via Socket</p>
        </div>

        {/* Services Online */}
        <div className={`rounded-xl p-4 ${glass}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Services Online</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold">{onlineCount}</p>
          <p className="text-[11px] text-muted-foreground">{offlineCount} offline</p>
        </div>

        {/* Storage */}
        <div className={`rounded-xl p-4 ${glass}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Storage</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
              <HardDrive className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold">2.4 TB</p>
          <p className="text-[11px] text-muted-foreground">of 4 TB pool used</p>
        </div>

        {/* Tailscale */}
        <div className={`rounded-xl p-4 ${glass}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Tailscale</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
              <Wifi className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-bold">Connected</p>
          <p className="text-[11px] text-muted-foreground">4 devices in tailnet</p>
        </div>
      </div>

      {/* 2. Search Bar & Horizontal Category Scroll */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 sm:w-72 ${glass}`}>
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Horizontally Scrollable Categories (Hidden Scrollbar) */}
        <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:pb-0 [scrollbar-width:none]">
          {filterOptions.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
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
      <div className="grid grid-cols-1 gap-3.5 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredServices.map((s) => {
          const computedUrl = s.port
            ? `${window.location.protocol}//${window.location.hostname}:${s.port}`
            : s.url

          return (
            <div key={s.id} className={`flex flex-col justify-between rounded-2xl p-4 transition-all hover:bg-secondary/20 ${glass}`}>
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/80 ring-1 ring-white/5">
                    <ServiceIcon service={s} className="h-6 w-6" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-secondary/50 px-2.5 py-1">
                    <StatusDot online={s.online} />
                    <span className="text-[11px] font-medium">{s.online ? "Running" : "Exited"}</span>
                  </div>
                </div>

                <div className="mt-3">
                  <h3 className="truncate text-base font-semibold">{s.name}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <CategoryTag category={s.category} />
                    <span className="truncate font-mono text-[11px] text-muted-foreground">
                      {s.image || (s.port ? `:${s.port}` : "")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                <button
                  onClick={onRefresh}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/40 text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>

                {computedUrl ? (
                  <a
                    href={computedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-xl bg-primary/15 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/25"
                  >
                    Launch
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <button disabled className="rounded-xl bg-secondary/30 px-4 py-2 text-xs font-medium text-muted-foreground/50">
                    No Port
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {filteredServices.length === 0 && (
          <div className={`col-span-full py-12 text-center text-sm text-muted-foreground ${glass} rounded-2xl`}>
            No matching services found.
          </div>
        )}
      </div>
    </div>
  )
}