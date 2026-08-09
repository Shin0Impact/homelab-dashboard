import React, { useState, useEffect, useCallback } from "react"
import { Dashboard } from "./components/Dashboard"
import { Login } from "./components/Login"
import { Manage } from "./components/Manage"
import { Metrics } from "./components/Metrics"
import { Sidebar, Topbar } from "./components/Navigation"
import { Settings } from "./components/Settings"

export default function App() {
  // 1. Persist login state so it doesn't reset on error or refresh
  const [authed, setAuthed] = useState(() => {
    return localStorage.getItem("homelab_authed") === "true"
  })
  
  const [page, setPage] = useState("dashboard")
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(false)

  // 2. Robust container fetch with response validation
  const fetchContainers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/containers")
      
      if (!res.ok) {
        console.error(`API returned error status: ${res.status}`)
        return
      }

      const data = await res.json()
      if (Array.isArray(data)) {
        setServices(data)
      } else {
        console.warn("API response was not an array:", data)
      }
    } catch (err) {
      console.error("Error connecting to backend API:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Poll real Docker socket status every 5 seconds when authed
  useEffect(() => {
    if (!authed) return

    fetchContainers()
    const interval = setInterval(fetchContainers, 5000)
    return () => clearInterval(interval)
  }, [authed, fetchContainers])

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
          {page === "metrics" && <Metrics />}
          {page === "settings" && <Settings />}
        </div>
      </main>
    </div>
  )
}