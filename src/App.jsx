import React, { useState, useEffect, useCallback } from "react"
import { useDispatch } from "react-redux"
import { updateTelemetryData, setTelemetryError } from "./store/telemetrySlice"
import { Dashboard } from "./components/Dashboard"
import { Login } from "./components/Login"
import { Manage } from "./components/Manage"
import { Stacks } from "./components/Stacks"
import { Metrics } from "./components/Metrics"
import { Sidebar, Topbar } from "./components/Navigation"
import { Settings } from "./components/Settings"
import { useSelector } from "react-redux"

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

  const [page, setPage] = useState("dashboard")
  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("homelab_token")
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  // Global Telemetry Polling Loop (Runs at App level so state never drops)
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
    const interval = setInterval(fetchTelemetry, 2000)
    return () => clearInterval(interval)
  }, [authed, dispatch, getAuthHeaders])

  const fetchContainers = useCallback(async () => {
    try {
      const res = await fetch("/api/containers", {
        headers: getAuthHeaders(),
      })
      const data = await res.json()

      if (Array.isArray(data)) {
        setServices(data)
      } else {
        setServices(data.services || [])
        setCategories(data.categories || [])
      }
    } catch (err) {
      console.error("Failed to load services:", err)
    }
  }, [getAuthHeaders])

  useEffect(() => {
    if (!authed) return
    fetchContainers()
    const interval = setInterval(fetchContainers, 5000)
    return () => clearInterval(interval)
  }, [authed, fetchContainers])

  // CRUD API Handlers
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
  const amoled = useSelector((state) => state.settings.amoled)

  useEffect(() => {
    if (amoled) {
      document.documentElement.classList.add("amoled")
    } else {
      document.documentElement.classList.remove("amoled")
    }
  }, [amoled])

  const handleUpdateService = async (updatedService) => {
    try {
      await fetch(`/api/services/${updatedService.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(updatedService),
      })
      fetchContainers()
    } catch (err) {
      console.error("Failed to update service:", err)
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

  const handleLogin = (token) => {
    if (token) localStorage.setItem("homelab_token", token)
    localStorage.setItem("homelab_authed", "true")
    setAuthed(true)
  }

  const handleLogout = () => {
    localStorage.removeItem("homelab_authed")
    localStorage.removeItem("homelab_token")
    setAuthed(false)
  }

  if (!authed) {
    return <Login onSignIn={handleLogin} />
  }

  const meta = PAGE_META[page] || PAGE_META.dashboard

  return (
    <div className="flex min-h-svh w-full flex-col bg-background text-foreground md:flex-row">
      <Sidebar current={page} onNavigate={setPage} onLogout={handleLogout} />

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
            />
          )}
          {page === "stacks" && (
            <Stacks
              services={services}
              onRefresh={fetchContainers}
            />
          )}
          {page === "metrics" && <Metrics />}
          {page === "settings" && <Settings />}
        </div>
      </main>
    </div>
  )
}