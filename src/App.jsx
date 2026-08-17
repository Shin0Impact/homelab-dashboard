import React, { useState, useEffect, useCallback, useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"
import { updateTelemetryData, setTelemetryError } from "./store/telemetrySlice"
import { Dashboard } from "./components/Dashboard"
import { Login } from "./components/Login"
import { Manage } from "./components/Manage"
import { Stacks } from "./components/Stacks"
import { Metrics } from "./components/Metrics"
import { Sidebar, Topbar } from "./components/Navigation"
import { Settings } from "./components/Settings"

const PAGE_META = {
  dashboard: { title: "Dashboard", subtitle: "Live Container Monitor" },
  manage: { title: "Manage Services", subtitle: "Configure & Register Endpoints" },
  stacks: { title: "Docker Stacks", subtitle: "Manage Portainer-Style Stacks & Compose Files" },
  metrics: { title: "System Telemetry", subtitle: "Host Resource Utilization" },
  settings: { title: "Settings", subtitle: "Preferences & System Configuration" },
}

export default function App() {
  const dispatch = useDispatch()

  const [authed, setAuthed] = useState(() => {
    return localStorage.getItem("homelab_authed") === "true"
  })

  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("homelab_user")
    return stored ? JSON.parse(stored) : null
  })

  const [page, setPage] = useState("dashboard")
  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])

  // Telemetry-only refresh rate calculation (Default: 15 FPS)
  const refreshSetting = useSelector((state) => state.settings?.refresh) || 
    Number(localStorage.getItem("homelab_refresh")) || 15

  const telemetryRefreshMs = useMemo(() => {
    let ms = 1000 / 15 // Default 15 FPS (~66.67 ms)

    if (refreshSetting <= 60 && refreshSetting >= 0.2) {
      ms = 1000 / refreshSetting
    } else if (refreshSetting >= 16 && refreshSetting <= 5000) {
      ms = refreshSetting
    }

    return Math.min(Math.max(Math.round(ms), 16), 5000)
  }, [refreshSetting])

  // Store favorite service IDs in localStorage so polling doesn't overwrite them
  const [favoriteIds, setFavoriteIds] = useState(() => {
    const saved = localStorage.getItem("homelab_favorite_ids")
    return saved ? JSON.parse(saved) : []
  })

  const theme = useSelector((state) => state.settings?.theme || "default")

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("amoled", "light")

    if (theme === "amoled") {
      root.classList.add("amoled")
    } else if (theme === "light") {
      root.classList.add("light")
    }
  }, [theme])

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("homelab_token")
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  // Telemetry Polling (High-frequency rate strictly for real-time metrics)
  useEffect(() => {
    if (!authed) return

    const fetchTelemetry = async () => {
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

    fetchTelemetry()
    const interval = setInterval(fetchTelemetry, telemetryRefreshMs)
    return () => clearInterval(interval)
  }, [authed, dispatch, getAuthHeaders, telemetryRefreshMs])

  // Helper to apply favorite status from localStorage onto raw API data
  const applyFavorites = useCallback(
    (rawServices) => {
      return rawServices.map((s) => {
        const isFav = favoriteIds.includes(s.id) || Boolean(s.is_favorite || s.favorite)
        return {
          ...s,
          is_favorite: isFav,
          favorite: isFav,
        }
      })
    },
    [favoriteIds]
  )

  const fetchContainers = useCallback(async () => {
    try {
      const res = await fetch("/api/containers", {
        headers: getAuthHeaders(),
      })
      const data = await res.json()

      let rawList = []
      if (Array.isArray(data)) {
        rawList = data
      } else {
        rawList = data.services || []
        setCategories(data.categories || [])
      }

      setServices(applyFavorites(rawList))
    } catch (err) {
      console.error("Failed to load services:", err)
    }
  }, [getAuthHeaders, applyFavorites])

  // Container Polling (Fixed lightweight 5-second interval to prevent lag)
  useEffect(() => {
    if (!authed) return
    fetchContainers()
    const interval = setInterval(fetchContainers, 5000)
    return () => clearInterval(interval)
  }, [authed, fetchContainers])

  const handleAddService = async (newService) => {
    try {
      await fetch("/api/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(newService),
      })
      fetchContainers()
    } catch (err) {
      console.error("Failed to add service:", err)
    }
  }

  const handleUpdateService = async (updatedService) => {
    const isFav = Boolean(updatedService.is_favorite || updatedService.favorite)
    let updatedFavs = [...favoriteIds]

    if (isFav && !updatedFavs.includes(updatedService.id)) {
      updatedFavs.push(updatedService.id)
    } else if (!isFav && updatedFavs.includes(updatedService.id)) {
      updatedFavs = updatedFavs.filter((id) => id !== updatedService.id)
    }

    setFavoriteIds(updatedFavs)
    localStorage.setItem("homelab_favorite_ids", JSON.stringify(updatedFavs))

    setServices((prev) =>
      prev.map((s) => (s.id === updatedService.id ? { ...updatedService, is_favorite: isFav, favorite: isFav } : s))
    )

    try {
      const res = await fetch(`/api/services/${updatedService.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(updatedService),
      })

      if (!res.ok) {
        await fetch(`/api/containers/${updatedService.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify(updatedService),
        })
      }
    } catch (err) {
      console.error("Failed to persist service update to backend:", err)
    }
  }

  const handleDeleteService = async (id) => {
    try {
      await fetch(`/api/services/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      fetchContainers()
    } catch (err) {
      console.error("Failed to delete service:", err)
    }
  }

  const handleLogin = (data) => {
    const token = typeof data === "object" ? data.token : data
    if (token) localStorage.setItem("homelab_token", token)

    if (data?.user) {
      localStorage.setItem("homelab_user", JSON.stringify(data.user))
      setUser(data.user)
    }

    localStorage.setItem("homelab_authed", "true")
    setAuthed(true)
  }

  const handleLogout = () => {
    localStorage.removeItem("homelab_authed")
    localStorage.removeItem("homelab_token")
    localStorage.removeItem("homelab_user")
    setUser(null)
    setAuthed(false)
  }

  if (!authed) {
    return <Login onSignIn={handleLogin} />
  }

  const meta = PAGE_META[page] || PAGE_META.dashboard

  return (
    <div className="flex min-h-svh w-full flex-col bg-background text-foreground md:flex-row">
      <Sidebar user={user} current={page} onNavigate={setPage} onLogout={handleLogout} />

      <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <div className="hidden md:block">
          <Topbar title={meta.title} subtitle={meta.subtitle} />
        </div>

        <div className="flex-1 overflow-y-auto">
          {page === "dashboard" && (
            <Dashboard
              services={services}
              categories={categories}
              onRefresh={fetchContainers}
            />
          )}
          {page === "manage" && (
            <Manage
              services={services}
              categories={categories}
              onAdd={handleAddService}
              onUpdate={handleUpdateService}
              onDelete={handleDeleteService}
              onRefresh={fetchContainers}
            />
          )}
          {page === "stacks" && (
            <Stacks
              services={services}
              onRefresh={fetchContainers}
            />
          )}
          {page === "metrics" && <Metrics refreshMs={telemetryRefreshMs} />}
          {page === "settings" && <Settings />}
        </div>
      </main>
    </div>
  )
}