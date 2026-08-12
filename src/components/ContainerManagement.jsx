import React, { useState } from "react"
import { Search, Play, Square, RotateCw, Server } from "lucide-react"
import { glass } from "./UIHelpers"

export function ContainerManagement({ services = [], onRefresh }) {
  const [search, setSearch] = useState("")
  const [loadingId, setLoadingId] = useState(null)

  const handleAction = async (id, action) => {
    setLoadingId(id)
    try {
      await fetch(`/api/containers/${id}/${action}`, { method: "POST" })
      if (onRefresh) await onRefresh()
    } catch (err) {
      console.error(`Failed to ${action} container:`, err)
    } finally {
      setLoadingId(null)
    }
  }

  const filteredServices = services.filter((s) => {
    const query = search.toLowerCase()
    return (
      s.name?.toLowerCase().includes(query) ||
      s.containerName?.toLowerCase().includes(query) ||
      s.image?.toLowerCase().includes(query) ||
      s.id?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8">
      {/* Header & Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search containers by name, ID, or image..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-input/40 pl-9 pr-4 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {filteredServices.length} of {services.length} containers
        </div>
      </div>

      {/* Container List */}
      <div className="grid grid-cols-1 gap-3">
        {filteredServices.map((c) => {
          const isOnline = c.status === "online" || c.online || c.state === "running"
          const isLoading = loadingId === c.id

          return (
            <div
              key={c.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl gap-4 ${glass}`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-primary ring-1 ring-white/10">
                  <Server className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground truncate">{c.name}</span>
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        isOnline
                          ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                          : "bg-rose-500"
                      }`}
                    />
                    <span className="text-xs text-muted-foreground capitalize">
                      {c.state || c.status || (isOnline ? "running" : "stopped")}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground/80 truncate font-mono mt-0.5">
                    ID: {c.id?.substring(0, 12)} | Image: {c.image || "custom"}
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                {!isOnline ? (
                  <button
                    disabled={isLoading}
                    onClick={() => handleAction(c.id, "start")}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50 transition-colors"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" /> Start
                  </button>
                ) : (
                  <button
                    disabled={isLoading}
                    onClick={() => handleAction(c.id, "stop")}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 disabled:opacity-50 transition-colors"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" /> Stop
                  </button>
                )}
                <button
                  disabled={isLoading}
                  onClick={() => handleAction(c.id, "restart")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70 disabled:opacity-50 transition-colors"
                >
                  <RotateCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} /> Restart
                </button>
              </div>
            </div>
          )
        })}

        {filteredServices.length === 0 && (
          <div className={`p-8 text-center text-sm text-muted-foreground rounded-xl ${glass}`}>
            No containers match your search query.
          </div>
        )}
      </div>
    </div>
  )
}