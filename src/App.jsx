import React, { useState, useEffect, useCallback } from "react"
import { Dashboard } from "./components/Dashboard"
import { Login } from "./components/Login"
import { Manage } from "./components/Manage"
import { Metrics } from "./components/Metrics"
import { Sidebar, Topbar } from "./components/Navigation"
import { Settings } from "./components/Settings"

export default function App() {
  const [authed, setAuthed] = useState(() => {
    return localStorage.getItem("homelab_authed") === "true"
  })

  const [page, setPage] = useState("dashboard")
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchContainers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/containers")
      if (!res.ok) return

      const data = await res.json()
      if (Array.isArray(data)) {
        setServices(data)
      }
    } catch (err) {
      console.error("Error connecting to backend API:", err)
    } finally {
      setLoading(false)
    }
  }, [])

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newService),
      })
      fetchContainers()
    } catch (err) {
      console.error("Failed to add service:", err)
    }
  }

  const handleUpdateService = async (updatedService) => {
    try {
      await fetch(`/api/services/${updatedService.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
      })
      fetchContainers()
    } catch (err) {
      console.error("Failed to delete service:", err)
    }
  }

  const handleLogin = () => {
    localStorage.setItem("homelab_authed", "true")
    setAuthed(true)
  }

  const handleLogout = () => {
    localStorage.removeItem("homelab_authed")
    setAuthed(false)
  }

  if (!authed) {
    return <Login onSignIn={handleLogin} />
  }

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <Sidebar current={page} onNavigate={setPage} onLogout={handleLogout} />
      <main className="flex min-w-0 flex-1 flex-col">
        <Topbar title="Dashboard" subtitle="Live Container Monitor" />
        <div className="flex-1 overflow-y-auto">
          {page === "dashboard" && (
            <Dashboard services={services} onRefresh={fetchContainers} />
          )}
          {page === "manage" && (
            <Manage
              services={services}
              onAdd={handleAddService}
              onUpdate={handleUpdateService}
              onDelete={handleDeleteService}
            />
          )}
          {page === "metrics" && <Metrics />}
          {page === "settings" && <Settings />}
        </div>
      </main>
    </div>
  )
}