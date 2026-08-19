import React, { useMemo, useState, useRef } from "react"
import { useSelector, useDispatch } from "react-redux"
import { setTelemetryError, updateTelemetryData } from "../store/telemetrySlice"
import {
  ArrowDown,
  ArrowUp,
  Cpu,
  MemoryStick,
  Network,
  Play,
  RefreshCw,
  RotateCw,
  Square,
  Terminal,
  X,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const CHART_COLORS = {
  cpu: "#00d8d6",
  network: "#10b981",
  upload: "#f59e0b",
  memory: "#a855f7",
}

const PIE_COLORS = ["#a855f7", "#22c55e", "#3b82f6", "#f59e0b", "#ec4899"]

const glass =
  "border border-white/5 bg-card/60 backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]"

const tooltipStyle = {
  backgroundColor: "#121217",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "0.75rem",
  fontSize: "12px",
  color: "#f3f4f6",
}

function ChartCard({ title, subtitle, icon: Icon, children }) {
  return (
    <div className={`rounded-2xl p-4 sm:p-5 ${glass}`}>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="w-full min-h-[200px]">{children}</div>
    </div>
  )
}

export function Metrics() {
  const dispatch = useDispatch()
  
  const { cpuHistory, netHistory, ramData, totalRam, processes, errorMsg } =
    useSelector((state) => state.telemetry)

  const [sortConfig, setSortConfig] = useState({ key: "cpu", direction: "desc" })
  const [activeMobileProc, setActiveMobileProc] = useState(null)
  const timerRef = useRef(null)

  const getAuthHeaders = () => {
    const token = localStorage.getItem("homelab_token")
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/telemetry", {
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error("Telemetry request failed")
      const data = await res.json()
      dispatch(updateTelemetryData(data))
    } catch (err) {
      dispatch(setTelemetryError("Telemetry endpoint unreachable."))
    }
  }

  const handleContainerAction = async (id, action) => {
    try {
      await fetch(`/api/containers/${id}/${action}`, {
        method: "POST",
        headers: getAuthHeaders(),
      })
      setActiveMobileProc(null)
      fetchMetrics()
    } catch (e) {
      console.error(e)
    }
  }

  // Mobile Long Press Logic
  const handleTouchStart = (proc) => {
    timerRef.current = setTimeout(() => {
      setActiveMobileProc(proc)
    }, 500)
  }

  const handleTouchEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }))
  }

  const sortedProcesses = useMemo(() => {
    return [...processes].sort((a, b) => {
      let aVal = a[sortConfig.key]
      let bVal = b[sortConfig.key]

      if (sortConfig.key === "mem") {
        aVal = a.memValue
        bVal = b.memValue
      }

      if (aVal === bVal) {
        if (sortConfig.key !== "cpu") return b.cpu - a.cpu
        return b.memValue - a.memValue
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1
      return 0
    })
  }, [processes, sortConfig])

  const ramKey = ramData.map((d) => d.value).join("-")

  const renderSortIndicator = (key) => {
    if (sortConfig.key !== key) return null
    return sortConfig.direction === "desc" ? (
      <ArrowDown className="inline h-3 w-3 ml-1 text-primary" />
    ) : (
      <ArrowUp className="inline h-3 w-3 ml-1 text-primary" />
    )
  }

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 md:p-8">
      {errorMsg && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-400">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* --- TELEMETRY CHARTS --- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="CPU Usage" subtitle="Live stream · %" icon={Cpu}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={cpuHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="cpuFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.cpu} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={CHART_COLORS.cpu} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="t" stroke="#8e8e93" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} stroke="#8e8e93" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: CHART_COLORS.cpu, strokeOpacity: 0.3 }} />
              <Area type="monotone" dataKey="cpu" stroke={CHART_COLORS.cpu} strokeWidth={2} fill="url(#cpuFill)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Memory Allocation" subtitle={`${totalRam} GB total · Memory breakdown`} icon={MemoryStick}>
          <div className="flex h-[220px] w-full items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart key={ramKey}>
                <Pie
                  data={ramData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {ramData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.fill || PIE_COLORS[index % PIE_COLORS.length]}
                      stroke="rgba(0,0,0,0.4)"
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => [`${val} GB`, "Memory"]} contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Network Throughput" subtitle="Download / Upload · KB/s" icon={Network}>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={netHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="t" stroke="#8e8e93" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#8e8e93" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="down" stroke={CHART_COLORS.network} strokeWidth={2} dot={false} name="Download (KB/s)" isAnimationActive={false} />
            <Line type="monotone" dataKey="up" stroke={CHART_COLORS.upload} strokeWidth={2} dot={false} name="Upload (KB/s)" isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-3 flex items-center gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS.network }} /> Download
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS.upload }} /> Upload
          </span>
        </div>
      </ChartCard>

      {/* --- TASK MANAGER TABLE --- */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Task Manager</h2>
            <p className="text-xs text-muted-foreground">
              Active processes & resource load <span className="sm:hidden">(Press & hold for controls)</span>
            </p>
          </div>
          <button
            onClick={fetchMetrics}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/40 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className={`overflow-hidden rounded-2xl ${glass}`}>
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/5 uppercase tracking-wide text-muted-foreground select-none">
                <th
                  onClick={() => handleSort("name")}
                  className="px-3 sm:px-5 py-3 font-medium cursor-pointer hover:text-foreground"
                >
                  Process {renderSortIndicator("name")}
                </th>
                <th className="hidden sm:table-cell px-5 py-3 font-medium">PID</th>
                <th
                  onClick={() => handleSort("cpu")}
                  className="px-3 sm:px-5 py-3 font-medium cursor-pointer hover:text-foreground"
                >
                  CPU {renderSortIndicator("cpu")}
                </th>
                <th
                  onClick={() => handleSort("mem")}
                  className="px-3 sm:px-5 py-3 font-medium cursor-pointer hover:text-foreground"
                >
                  RAM {renderSortIndicator("mem")}
                </th>
                <th className="px-3 sm:px-5 py-3 font-medium">Status</th>
                <th className="hidden sm:table-cell px-5 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedProcesses.map((p) => (
                <tr
                  key={p.id}
                  onTouchStart={() => handleTouchStart(p)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchEnd}
                  className="border-b border-white/5 last:border-0 hover:bg-secondary/30 select-none"
                >
                  <td className="px-3 sm:px-5 py-3 font-medium">
                    <div className="flex items-center gap-2 max-w-[120px] sm:max-w-none truncate">
                      <Terminal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{p.name}</span>
                    </div>
                  </td>

                  <td className="hidden sm:table-cell px-5 py-3 font-mono text-xs text-muted-foreground">
                    {p.pid}
                  </td>

                  <td className="px-3 sm:px-5 py-3 font-mono text-xs text-cyan-400 font-semibold">
                    {p.cpu ?? 0}%
                  </td>

                  <td className="px-3 sm:px-5 py-3 font-mono text-xs text-purple-400">
                    {p.mem ?? "0 MB"}
                  </td>

                  <td className="px-3 sm:px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-medium ${
                        p.status === "running"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>

                  {/* Desktop Actions */}
                  <td className="hidden sm:table-cell px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {p.status === "running" ? (
                        <button
                          onClick={() => handleContainerAction(p.id, "stop")}
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-400 hover:bg-rose-500/20"
                        >
                          <Square className="h-3 w-3 fill-current" /> Stop
                        </button>
                      ) : (
                        <button
                          onClick={() => handleContainerAction(p.id, "start")}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20"
                        >
                          <Play className="h-3 w-3 fill-current" /> Start
                        </button>
                      )}
                      <button
                        onClick={() => handleContainerAction(p.id, "restart")}
                        title="Restart Container"
                        className="inline-flex items-center gap-1 rounded-lg bg-secondary/60 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        <RotateCw className="h-3 w-3" /> Restart
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Long Press Action Menu Modal */}
      {activeMobileProc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setActiveMobileProc(null)}
          />
          <div className={`relative w-full max-w-xs rounded-2xl p-5 ${glass} space-y-4`}>
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h3 className="font-semibold text-sm">{activeMobileProc.name}</h3>
              <button
                onClick={() => setActiveMobileProc(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {activeMobileProc.status === "running" ? (
                <button
                  onClick={() => handleContainerAction(activeMobileProc.id, "stop")}
                  className="flex items-center justify-center gap-2 rounded-xl bg-rose-500/15 py-2.5 text-xs font-medium text-rose-400"
                >
                  <Square className="h-3.5 w-3.5 fill-current" /> Stop Process
                </button>
              ) : (
                <button
                  onClick={() => handleContainerAction(activeMobileProc.id, "start")}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/15 py-2.5 text-xs font-medium text-emerald-400"
                >
                  <Play className="h-3.5 w-3.5 fill-current" /> Start Process
                </button>
              )}
              <button
                onClick={() => handleContainerAction(activeMobileProc.id, "restart")}
                className="flex items-center justify-center gap-2 rounded-xl bg-secondary py-2.5 text-xs font-medium text-foreground"
              >
                <RotateCw className="h-3.5 w-3.5" /> Restart Process
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}