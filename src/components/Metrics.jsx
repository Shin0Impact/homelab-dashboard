import React, { useEffect, useState } from "react"
import { Cpu, MemoryStick, Network } from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const CHART_COLORS = {
  cpu: "#00d8d6",     // Cyan
  network: "#10b981",  // Emerald Green
  upload: "#f59e0b",   // Amber
  memory: "#a855f7",   // Purple
}

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
    <div className={`rounded-2xl p-5 ${glass}`}>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

export function Metrics() {
  const [cpuHistory, setCpuHistory] = useState([])
  const [netHistory, setNetHistory] = useState([])
  const [ramData, setRamData] = useState([])
  const [totalRam, setTotalRam] = useState("16")

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch("http://localhost:3333/api/telemetry")
        const data = await res.json()

        if (!data || data.error) return

        const timeStr = data.timestamp || new Date().toLocaleTimeString()

        // 1. Append CPU sample (keep max 20 data points)
        setCpuHistory((prev) => {
          const next = [...prev, { t: timeStr, cpu: data.cpuLoad }]
          return next.slice(-20)
        })

        // 2. Append Network sample (keep max 20 data points)
        setNetHistory((prev) => {
          const next = [...prev, { t: timeStr, down: data.net?.down || 0, up: data.net?.up || 0 }]
          return next.slice(-20)
        })

        // 3. Update RAM allocation bars
        if (data.ram) {
          setRamData(data.ram)
          setTotalRam(data.totalMemGB)
        }
      } catch (err) {
        console.error("Failed to fetch live metrics:", err)
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6 p-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* CPU Chart */}
        <ChartCard title="CPU Usage" subtitle="Live stream · %" icon={Cpu}>
          <ResponsiveContainer width="100%" height={240}>
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

        {/* Memory Allocation Chart */}
        <ChartCard title="Memory Allocation" subtitle={`${totalRam} GB total · GB per pool`} icon={MemoryStick}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ramData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" stroke="#8e8e93" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#8e8e93" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="value" fill={CHART_COLORS.memory} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Network Chart */}
      <ChartCard title="Network Throughput" subtitle="Download / Upload · KB/s" icon={Network}>
        <ResponsiveContainer width="100%" height={260}>
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
    </div>
  )
}