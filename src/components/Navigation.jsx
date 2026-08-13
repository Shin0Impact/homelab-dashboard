import React, { useState, useEffect } from "react"
import {
  LayoutDashboard,
  Sliders,
  Layers,
  Activity,
  Settings as SettingsIcon,
  Server,
  User,
  Wifi,
  Laptop,
  Globe,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react"

// Navigation items config
const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "manage", label: "Manage", icon: Sliders },
  { key: "stacks", label: "Stacks", icon: Layers },
  { key: "metrics", label: "Metrics", icon: Activity },
  { key: "settings", label: "Settings", icon: SettingsIcon },
]

// Common glassmorphism utility classes
const glass =
  "border border-white/5 bg-card/60 backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]"

// Status Dot Component
export function StatusDot({ online = true }) {
  return (
    <span className="relative flex h-2 w-2">
      {online && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-chart-2 opacity-75" />
      )}
      <span
        className={`relative inline-flex h-2 w-2 rounded-full ${
          online ? "bg-chart-2" : "bg-muted-foreground/40"
        }`}
      />
    </span>
  )
}

// Topbar Component
export function Topbar({ title, subtitle }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-white/5 bg-background/80 px-6 backdrop-blur-md">
      <div>
        <h1 className="text-base font-semibold leading-none">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <StatusDot online />
        <span>System Online</span>
      </div>
    </header>
  )
}

// Sidebar Component
export function Sidebar({ user, current, onNavigate, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  // Dynamic network connection state
  const [networkState, setNetworkState] = useState({
    label: "Local System",
    statusText: "localhost",
    isTailscale: false,
    isLocal: true,
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname

      const isTailscaleIP = /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./.test(hostname)
      const isTailscaleDomain = hostname.endsWith(".ts.net")
      const isTs = isTailscaleIP || isTailscaleDomain

      const isLocal =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1" ||
        hostname.endsWith(".local")

      let label = "Private Network"
      let statusText = "LAN connection · active"

      if (isTs) {
        label = "Tailscale Mesh"
        statusText = "Encrypted mesh · active"
      } else if (isLocal) {
        label = "Local System"
        statusText = "Direct host · active"
      }

      setNetworkState({
        label,
        statusText,
        isTailscale: isTs,
        isLocal,
      })
    }
  }, [])

  const handleSelect = (key) => {
    onNavigate(key)
    setMobileOpen(false)
  }

  const displayName = user?.name || user?.username || "admin"
  const displayEmail = user?.email || `${user?.username || "root"}@homelab`

  const ConnectionIcon = networkState.isTailscale
    ? Wifi
    : networkState.isLocal
    ? Laptop
    : Globe

  return (
    <>
      {/* Mobile Top App Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-background/80 px-4 py-3 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <Server className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Homelab OS</p>
            <p className="text-[10px] text-muted-foreground">Self-hosted control</p>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex w-3/4 max-w-xs flex-col border-r border-white/10 bg-background/95 p-4 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                <span className="font-bold text-sm">Homelab OS</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1 text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className={`my-3 flex items-center gap-3 rounded-xl p-2.5 ${glass}`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-foreground">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{displayName}</p>
                <p className="truncate text-[10px] text-muted-foreground">{displayEmail}</p>
              </div>
            </div>

            <nav className="mt-2 flex-1 space-y-1">
              {NAV.map((item) => {
                const Icon = item.icon
                const active = current === item.key
                return (
                  <button
                    key={item.key}
                    onClick={() => handleSelect(item.key)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary/15 text-primary ring-1 ring-primary/20"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1 text-left">{item.label}</span>
                  </button>
                )
              })}
            </nav>

            <div className="space-y-3 pt-4">
              <div className={`flex items-center gap-2.5 rounded-lg p-2.5 ${glass}`}>
                <ConnectionIcon className="h-4 w-4 text-chart-2" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{networkState.label}</p>
                  <p className="text-[10px] text-muted-foreground">{networkState.statusText}</p>
                </div>
                <StatusDot online />
              </div>
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/5 bg-sidebar/80 backdrop-blur-xl md:flex">
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
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{displayEmail}</p>
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
            <ConnectionIcon className="h-4 w-4 text-chart-2" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{networkState.label}</p>
              <p className="text-[11px] text-muted-foreground truncate">{networkState.statusText}</p>
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
    </>
  )
}