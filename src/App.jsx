import React, { useState, useEffect, useCallback } from "react"
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
  const [authed, setAuthed] = useState(() => {
    return localStorage.getItem("homelab_authed") === "true"
  })

  const [page, setPage] = useState("dashboard")
  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])

  const fetchContainers = useCallback(async () => {
    try {
      const res = await fetch("/api/containers")
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