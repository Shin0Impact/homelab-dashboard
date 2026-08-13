import React, { useEffect, useState } from "react"
import { Cpu, MemoryStick, Network, Play, RefreshCw, Square, Terminal } from "lucide-react"
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
  cpu: "#00d8d6",     // Cyan
  network: "#10b981",  // Emerald
  upload: "#f59e0b",   // Amber
  memory: "#a855f7",   // Purple
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
      <div className="w-full min-h-[200px]">
        {children}
      </div>
    </div>
  )
}

export function Metrics() {
  const [cpuHistory, setCpuHistory] = useState([])
  const [netHistory, setNetHistory] = useState([])
  const [ramData, setRamData] = useState([
    { name: "Used RAM", value: 4.2 },
    { name: "Free RAM", value: 11.8 },
  ])
  const [totalRam, setTotalRam] = useState("16")
  const [errorMsg, setErrorMsg] = useState(null)

  const [processes, setProcesses] = useState([])

  const fetchMetrics = async () => {
    try {
      let res = await fetch("/api/telemetry")
      
      if (!res.ok || !res.headers.get("content-type")?.includes("application/json")) {
        res = await fetch("/api/metrics")
      }

      const contentType = res.headers.get("content-type")
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid API response format (HTML returned)")
      }

      const data = await res.json()
      if (!data || data.error) return

      setErrorMsg(null)
      const timeStr = data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

      if (data.cpuLoad !== undefined) {
        setCpuHistory((prev) => [...prev, { t: timeStr, cpu: data.cpuLoad }].slice(-20))
      }

      if (data.net) {
        setNetHistory((prev) => [...prev, { t: timeStr, down: data.net?.down || 0, up: data.net?.up || 0 }].slice(-20))
      }

      if (data.ram) {
        setRamData(data.ram)
        if (data.totalMemGB) setTotalRam(data.totalMemGB)
      }

      if (data.processes) {
        setProcesses(data.processes)
      }
    } catch (err) {
      console.warn("Live telemetry issue:", err.message)
      setErrorMsg("Telemetry endpoint unreachable. Showing local buffer.")
    }
  }

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleToggleProcess = async (id) => {
    const proc = processes.find((p) => p.id === id)
    if (!proc) return
    const action = proc.status === "running" ? "stop" : "start"

    try {
      await fetch(`/api/containers/${id}/${action}`, { method: "POST" })
    } catch {
      // Fallback
    }

    setProcesses((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const isRunning = p.status === "running"
          return {
            ...p,
            status: isRunning ? "stopped" : "running",
            cpu: isRunning ? 0 : 1.5,
          }
        }
        return p
      })
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
              <PieChart>
                <Pie
                  data={ramData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {ramData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.fill || PIE_COLORS[index % PIE_COLORS.length]} 
                      stroke="rgba(0,0,0,0.4)" 
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => [`${val} GB`, "Memory"]}
                  contentStyle={tooltipStyle}
                />
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

      {/* --- TASK MANAGER --- */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Task Manager</h2>
            <p className="text-xs text-muted-foreground">Active container processes & resource load</p>
          </div>
          <button
            onClick={fetchMetrics}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/40 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Desktop Task Table */}
        <div className={`hidden overflow-hidden rounded-2xl md:block ${glass}`}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Process / Container</th>
                <th className="px-5 py-3 font-medium">PID</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {processes.map((p) => (
                <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-secondary/30">
                  <td className="px-5 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-muted-foreground" />
                      {p.name}
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{p.pid}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        p.status === "running"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleToggleProcess(p.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        p.status === "running"
                          ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      }`}
                    >
                      {p.status === "running" ? (
                        <>
                          <Square className="h-3 w-3" /> Stop
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3" /> Start
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Task Cards Stack */}
        <div className="space-y-3 md:hidden">
          {processes.map((p) => (
            <div key={p.id} className={`rounded-xl p-4 ${glass}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">{p.name}</span>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">PID: {p.pid}</span>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5">
                <span
                  className={`text-xs font-medium ${
                    p.status === "running" ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  ● {p.status}
                </span>

                <button
                  onClick={() => handleToggleProcess(p.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                    p.status === "running"
                      ? "bg-red-500/15 text-red-400"
                      : "bg-emerald-500/15 text-emerald-400"
                  }`}
                >
                  {p.status === "running" ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  {p.status === "running" ? "Stop" : "Start"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}