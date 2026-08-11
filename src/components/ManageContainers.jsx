import React, { useState } from "react"
import {
  Boxes,
  Play,
  Square,
  RotateCw,
  Terminal,
  Search,
  Cpu,
  HardDrive,
  Info,
  X,
  CheckCircle2,
  AlertCircle
} from "lucide-react"

// Glass styling helper to match your UI
const glass = "backdrop-blur-md bg-white/[0.03] border border-white/10 shadow-2xl"

export function ManageContainers({ containers = [], onAction }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterState, setFilterState] = useState("all") // all, running, stopped
  const [activeLogContainer, setActiveLogContainer] = useState(null)
  const [activeInfoContainer, setActiveInfoContainer] = useState(null)

  // Default sample data if none passed
  const containerList = containers.length > 0 ? containers : [
    { id: "c1", name: "homelab-dashboard", image: "homelab/dashboard:latest", state: "running", uptime: "3 days", cpu: "0.4%", memory: "42MB", ports: "3000:3000" },
    { id: "c2", name: "searxng", image: "searxng/searxng:latest", state: "running", uptime: "5 days", cpu: "1.2%", memory: "118MB", ports: "8080:8080" },
    { id: "c3", name: "splendid_joao-main_app-1", image: "node:18-alpine", state: "stopped", uptime: "Exited (0)", cpu: "0%", memory: "0MB", ports: "5000:5000" },
    { id: "c4", name: "n8n", image: "n8nio/n8n:latest", state: "running", uptime: "12 hours", cpu: "2.1%", memory: "210MB", ports: "5678:5678" },
    { id: "c5", name: "qbittorrent", image: "lscr.io/linuxserver/qbittorrent:latest", state: "running", uptime: "8 days", cpu: "3.8%", memory: "340MB", ports: "8081:8081" },
    { id: "c6", name: "beets", image: "lscr.io/linuxserver/beets:latest", state: "stopped", uptime: "Exited (137)", cpu: "0%", memory: "0MB", ports: "8337:8337" },
  ]

  const handleAction = (id, action) => {
    if (onAction) {
      onAction(id, action)
    } else {
      console.log(`Action '${action}' triggered for container ID: ${id}`)
    }
  }

  const filteredContainers = containerList.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.image.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.ports && c.ports.includes(searchTerm))

    if (filterState === "running") return matchesSearch && c.state === "running"
    if (filterState === "stopped") return matchesSearch && c.state !== "running"
    return matchesSearch
  })

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8">
      {/* Header & Subtitle */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Manage Containers</h1>
        <p className="text-sm text-muted-foreground">Monitor and control your Docker container runtime environment</p>
      </div>

      {/* Control Bar: Search & Status Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search containers by name, image, or port..."
            className="w-full rounded-xl border border-white/10 bg-input/40 pl-9 pr-4 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className={`flex rounded-xl p-1 ${glass}`}>
            {["all", "running", "stopped"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterState(type)}
                className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  filterState === type
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className={`hidden overflow-hidden rounded-2xl md:block ${glass}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Container</th>
              <th className="px-5 py-3 font-medium">State</th>
              <th className="px-5 py-3 font-medium">Ports</th>
              <th className="px-5 py-3 font-medium">CPU / RAM</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredContainers.map((c) => {
              const isRunning = c.state === "running"

              return (
                <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/80 text-primary ring-1 ring-white/10">
                        <Boxes className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{c.name}</p>
                        <p className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">{c.image}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${isRunning ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-zinc-500"}`} />
                      <span className="text-xs font-medium text-foreground capitalize">{c.state}</span>
                      <span className="text-[11px] text-muted-foreground">({c.uptime})</span>
                    </div>
                  </td>

                  <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                    {c.ports || "—"}
                  </td>

                  <td className="px-5 py-3.5">
                    {isRunning ? (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                        <span className="flex items-center gap-1"><Cpu className="h-3.5 w-3.5 text-primary" /> {c.cpu}</span>
                        <span className="flex items-center gap-1"><HardDrive className="h-3.5 w-3.5 text-primary" /> {c.memory}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>

                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      {isRunning ? (
                        <button
                          onClick={() => handleAction(c.id, "stop")}
                          title="Stop Container"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-500/15 hover:text-rose-400 transition-colors"
                        >
                          <Square className="h-4 w-4 fill-current" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(c.id, "start")}
                          title="Start Container"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-emerald-500/15 hover:text-emerald-400 transition-colors"
                        >
                          <Play className="h-4 w-4 fill-current" />
                        </button>
                      )}

                      <button
                        onClick={() => handleAction(c.id, "restart")}
                        title="Restart Container"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-amber-500/15 hover:text-amber-400 transition-colors"
                      >
                        <RotateCw className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => setActiveLogContainer(c)}
                        title="View Logs"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
                      >
                        <Terminal className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => setActiveInfoContainer(c)}
                        title="Container Info"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Card View */}
      <div className="space-y-3 md:hidden">
        {filteredContainers.map((c) => {
          const isRunning = c.state === "running"

          return (
            <div key={c.id} className={`rounded-xl p-4 ${glass}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/80 text-primary ring-1 ring-white/10">
                    <Boxes className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{c.name}</p>
                    <p className="font-mono text-xs text-muted-foreground truncate max-w-[180px]">{c.image}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isRunning ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/10 text-zinc-400"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isRunning ? "bg-emerald-400" : "bg-zinc-500"}`} />
                  {c.state}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                <div className="font-mono text-xs text-muted-foreground">
                  {c.ports ? `Port: ${c.ports}` : "No exposed port"}
                </div>

                <div className="flex items-center gap-1">
                  {isRunning ? (
                    <button
                      onClick={() => handleAction(c.id, "stop")}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400"
                    >
                      <Square className="h-4 w-4 fill-current" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(c.id, "start")}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400"
                    >
                      <Play className="h-4 w-4 fill-current" />
                    </button>
                  )}
                  <button
                    onClick={() => handleAction(c.id, "restart")}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/40 text-muted-foreground"
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setActiveLogContainer(c)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/40 text-muted-foreground"
                  >
                    <Terminal className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Logs Modal */}
      {activeLogContainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setActiveLogContainer(null)} />
          <div className={`relative w-full max-w-3xl rounded-2xl p-5 ${glass}`}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold">Container Logs — {activeLogContainer.name}</h2>
              </div>
              <button onClick={() => setActiveLogContainer(null)} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 h-80 overflow-y-auto rounded-xl bg-black/80 p-4 font-mono text-xs text-emerald-400 space-y-1">
              <p className="text-zinc-500">[system] Attaching to logs for {activeLogContainer.name}...</p>
              <p>[info] Starting service worker initialization</p>
              <p>[info] Environment: production</p>
              <p>[info] HTTP server listening on port {activeLogContainer.ports || "default"}</p>
              <p>[debug] Database connection pool initialized (5 active connections)</p>
              <p className="text-emerald-300">[ready] Container operational and accepting requests</p>
            </div>
          </div>
        </div>
      )}

      {/* Details/Info Modal */}
      {activeInfoContainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setActiveInfoContainer(null)} />
          <div className={`relative w-full max-w-md rounded-2xl p-6 ${glass}`}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-base font-semibold">Container Details</h2>
              <button onClick={() => setActiveInfoContainer(null)} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Name</span>
                <p className="font-mono text-foreground font-medium">{activeInfoContainer.name}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Image Tag</span>
                <p className="font-mono text-foreground">{activeInfoContainer.image}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-muted-foreground">State</span>
                  <p className="capitalize font-medium">{activeInfoContainer.state}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Uptime</span>
                  <p>{activeInfoContainer.uptime}</p>
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Port Bindings</span>
                <p className="font-mono text-xs">{activeInfoContainer.ports || "None"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}