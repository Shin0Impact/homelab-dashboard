import React from "react"
import {
  Activity,
  Bell,
  Boxes,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Server,
  Settings as SettingsIcon,
  User,
  Wifi,
} from "lucide-react"
import { StatusDot, glass } from "./UIHelpers"

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "manage", label: "Manage Services", icon: Boxes },
  { key: "metrics", label: "System Telemetry", icon: Activity },
  { key: "settings", label: "Settings", icon: SettingsIcon },
]

export function Sidebar({ current, onNavigate, onLogout }) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/5 bg-sidebar/80 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
          <Server className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Homelab OS</p>
          <p className="text-xs text-muted-foreground">Self-hosted control</p>
        </div>
      </div>

      <div className={`mx-4 mb-4 flex items-center gap-3 rounded-xl px-3 py-2.5 ${glass}`}>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground">
          <User className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">admin</p>
          <p className="truncate text-xs text-muted-foreground">root@homelab</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const Icon = item.icon
          const active = current === item.key
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/15 text-primary ring-1 ring-primary/20"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {active && <ChevronRight className="h-4 w-4" />}
            </button>
          )
        })}
      </nav>

      <div className="space-y-3 p-4">
        <div className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 ${glass}`}>
          <Wifi className="h-4 w-4 text-chart-2" />
          <div className="flex-1">
            <p className="text-xs font-medium">Private Network</p>
            <p className="text-[11px] text-muted-foreground">Tailscale mesh · active</p>
          </div>
          <StatusDot online />
        </div>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}

export function Topbar({ title, subtitle }) {
  return (
    <header className="flex items-center justify-between border-b border-white/5 px-8 py-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-balance">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <button className={`flex h-9 w-9 items-center justify-center rounded-lg ${glass} hover:bg-secondary/60`}>
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
        <button className={`flex h-9 w-9 items-center justify-center rounded-lg ${glass} hover:bg-secondary/60`}>
          <Bell className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  )
}