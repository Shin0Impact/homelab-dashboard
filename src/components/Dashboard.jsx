import React, { useMemo, useState } from "react"
import { Activity, Boxes, Container, ExternalLink, HardDrive, Play, RefreshCw, Search, Square, Wifi, Loader2 } from "lucide-react"
import { ICONS, CategoryTag, StatusDot, glass } from "./UIHelpers"

const FILTERS = ["All", "AI", "Media", "Infra", "Network", "Automation"]

function MetricCard({ icon: Icon, label, value, hint, accent }) {
  return (
    <div className={`rounded-2xl p-5 ${glass}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

export function Dashboard({ services = [], onRefresh }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("All")
  const [loadingAction, setLoadingAction] = useState(null)

  const filtered = useMemo(() => {
    return services.filter((s) => {
      const matchesQuery = s.name.toLowerCase().includes(query.toLowerCase())
      const matchesFilter = filter === "All" || s.category === filter
      return matchesQuery && matchesFilter
    })
  }, [services, query, filter])

  const online = services.filter((s) => s.online).length

  // Trigger start / stop / restart container action
  const handleAction = async (id, action) => {
    setLoadingAction(`${id}-${action}`)
    try {
      const res = await fetch(`/api/containers/${id}/${action}`, {
        method: "POST",
      })
      const data = await res.json()
      if (data.success && onRefresh) {
        await onRefresh()
      }
    } catch (err) {
      console.error(`Failed to ${action} container:`, err)
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="space-y-8 p-8">
      {/* Metric summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          icon={Boxes}
          label="Total Containers"
          value={String(services.length)}
          hint="Discovered via Docker Socket"
          accent="bg-chart-1/15 text-chart-1"
        />
        <MetricCard
          icon={Activity}
          label="Services Online"
          value={`${online}`}
          hint={`${services.length - online} offline`}
          accent="bg-chart-2/15 text-chart-2"
        />
        <MetricCard
          icon={HardDrive}
          label="Storage"
          value="2.4 TB"
          hint="of 4 TB pool used"
          accent="bg-chart-4/15 text-chart-4"
        />
        <MetricCard
          icon={Wifi}
          label="Tailscale"
          value="Connected"
          hint="4 devices in tailnet"
          accent="bg-chart-3/15 text-chart-3"
        />
      </div>

      {/* Search & filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 sm:max-w-xs ${glass}`}>
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? "border-primary/30 bg-primary/15 text-primary"
                  : "border-white/5 bg-card/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Service cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((s) => {
          const Icon = ICONS[s.icon] || Container
          const isActionBusy = loadingAction?.startsWith(s.id)

          return (
            <div key={s.id} className={`group flex flex-col justify-between rounded-2xl p-5 transition-colors hover:bg-card/80 ${glass}`}>
              <div>
                <div className="flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/70 text-foreground ring-1 ring-white/5">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div className="flex items-center gap-1.5">
                    <StatusDot online={s.online} />
                    <span className="text-xs text-muted-foreground capitalize">{s.status}</span>
                  </div>
                </div>
                <p className="mt-4 font-medium truncate" title={s.name}>{s.name}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <CategoryTag category={s.category} />
                  <span className="text-[10px] text-muted-foreground truncate max-w-[120px]" title={s.image}>
                    {s.image?.split('/')[s.image?.split('/').length - 1]}
                  </span>
                </div>
              </div>

              {/* Actions & Launch Button */}
              <div className="mt-6 flex items-center gap-2">
                {s.online ? (
                  <>
                    <button
                      onClick={() => handleAction(s.id, "stop")}
                      disabled={isActionBusy}
                      title="Stop container"
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/60 text-muted-foreground hover:bg-red-500/20 hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      {loadingAction === `${s.id}-stop` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4 fill-current" />}
                    </button>
                    <button
                      onClick={() => handleAction(s.id, "restart")}
                      disabled={isActionBusy}
                      title="Restart container"
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/60 text-muted-foreground hover:bg-amber-500/20 hover:text-amber-400 transition-colors disabled:opacity-50"
                    >
                      {loadingAction === `${s.id}-restart` ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleAction(s.id, "start")}
                    disabled={isActionBusy}
                    title="Start container"
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/60 text-muted-foreground hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors disabled:opacity-50"
                  >
                    {loadingAction === `${s.id}-start` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                  </button>
                )}

                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
                    s.online && s.url !== "#"
                      ? "bg-secondary/60 text-foreground hover:bg-primary/15 hover:text-primary"
                      : "pointer-events-none bg-secondary/20 text-muted-foreground/40"
                  }`}
                >
                  Launch
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-white/10 py-16 text-center text-sm text-muted-foreground">
            No services match your filters.
          </div>
        )}
      </div>
    </div>
  )
}