import React, { useState } from "react"
import { Search, Play, Square, RotateCw, Server } from "lucide-react"

export function ContainerManagement({ services, onRefresh }) {
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
    <div className="p-6 space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search containers by name, ID, or image..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {filteredServices.length} of {services.length} containers
        </div>
      </div>

      {/* Container Cards List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredServices.map((c) => {
          const isOnline = c.status === "online" || c.online
          const isLoading = loadingId === c.id

          return (
            <div
              key={c.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border bg-card gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-md bg-muted text-foreground">
                  <Server className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{c.name}</span>
                    <span
                      className={`inline-block w-2 w-2 rounded-full ${
                        isOnline ? "bg-emerald-500" : "bg-destructive"
                      }`}
                    />
                    <span className="text-xs text-muted-foreground capitalize">
                      {c.state || c.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate font-mono mt-0.5">
                    ID: {c.id?.substring(0, 12)} | Image: {c.image}
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2">
                {!isOnline ? (
                  <button
                    disabled={isLoading}
                    onClick={() => handleAction(c.id, "start")}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5" /> Start
                  </button>
                ) : (
                  <button
                    disabled={isLoading}
                    onClick={() => handleAction(c.id, "stop")}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                  >
                    <Square className="h-3.5 w-3.5" /> Stop
                  </button>
                )}
                <button
                  disabled={isLoading}
                  onClick={() => handleAction(c.id, "restart")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                >
                  <RotateCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} /> Restart
                </button>
              </div>
            </div>
          )
        })}

        {filteredServices.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
            No containers match your search query.
          </div>
        )}
      </div>
    </div>
  )
}