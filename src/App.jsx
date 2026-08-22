import React, { useState, useEffect, useCallback } from "react"
import { useDispatch, useSelector } from "react-redux"
import { updateTelemetryData, setTelemetryError } from "./store/telemetrySlice"
import { Dashboard } from "./components/Dashboard"
import { Login } from "./components/Login"
import { Setup } from "./components/Setup"
import { Manage } from "./components/Manage"
import { Stacks } from "./components/Stacks"
import { Metrics } from "./components/Metrics"
import { Sidebar, Topbar } from "./components/Navigation"
import { Settings } from "./components/Settings"
import { authFetch, onAuthExpired } from "./lib/api"

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

  const isAdmin = user?.role === "Admin"

  const [page, setPage] = useState("dashboard")
  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])

  // Whether an admin account exists yet: null = still checking, true/false
  // once we know. Checked once on load, only matters while logged out.
  const [setupRequired, setSetupRequired] = useState(null)

  const handleLogout = useCallback(() => {
    localStorage.removeItem("homelab_authed")
    localStorage.removeItem("homelab_token")
    localStorage.removeItem("homelab_user")
    setUser(null)
    setAuthed(false)
  }, [])

  // If any authFetch() call anywhere in the app gets a 401 (token expired,
  // revoked, or invalid), drop back to the login screen instead of leaving
  // every poller silently failing in the background.
  useEffect(() => {
    return onAuthExpired(() => {
      handleLogout()
    })
  }, [handleLogout])

  useEffect(() => {
    if (authed) return
    let cancelled = false
    fetch("/api/setup-status")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSetupRequired(Boolean(data.setupRequired))
      })
      .catch(() => {
        // If we can't tell, default to the login form rather than getting stuck.
        if (!cancelled) setSetupRequired(false)
      })
    return () => {
      cancelled = true
    }
  }, [authed])

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

  // Telemetry Polling Effect (Fixed 1 second interval / 1000ms)
  useEffect(() => {
    if (!authed) return

    const fetchTelemetry = async () => {
      try {
        const res = await authFetch("/api/telemetry")
        if (!res.ok) throw new Error("Telemetry request failed")
        const data = await res.json()
        dispatch(updateTelemetryData(data))
      } catch (err) {
        dispatch(setTelemetryError("Telemetry endpoint unreachable."))
      }
    }

    fetchTelemetry()
    const interval = setInterval(fetchTelemetry, 1000)
    return () => clearInterval(interval)
  }, [authed, dispatch])

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
      const res = await authFetch("/api/containers")
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
  }, [applyFavorites])

  // Container Polling Effect (Fixed 5 seconds interval)
  useEffect(() => {
    if (!authed) return
    fetchContainers()
    const interval = setInterval(fetchContainers, 5000)
    return () => clearInterval(interval)
  }, [authed, fetchContainers])

  const handleAddService = async (newService) => {
    try {
      await authFetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      await authFetch(`/api/services/${updatedService.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedService),
      })
    } catch (err) {
      console.error("Failed to persist service update to backend:", err)
    }
  }

  const handleDeleteService = async (id) => {
    try {
      await authFetch(`/api/services/${id}`, { method: "DELETE" })
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

  if (!authed) {
    if (setupRequired === null) {
      return (
        <div className="flex min-h-svh items-center justify-center bg-background">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      )
    }
    return setupRequired ? (
      <Setup onRegistered={handleLogin} />
    ) : (
      <Login onSignIn={handleLogin} />
    )
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
              isAdmin={isAdmin}
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
              isAdmin={isAdmin}
            />
          )}
          {page === "stacks" && (
            <Stacks
              services={services}
              onRefresh={fetchContainers}
              isAdmin={isAdmin}
            />
          )}
          {page === "metrics" && <Metrics isAdmin={isAdmin} />}
          {page === "settings" && <Settings isAdmin={isAdmin} />}
        </div>
      </main>
    </div>
  )
}
