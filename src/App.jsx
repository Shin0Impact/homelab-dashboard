import React, { useState, useEffect, useCallback } from "react"
import { Dashboard } from "./components/Dashboard"
import { Login } from "./components/Login"
import { Manage } from "./components/Manage"
import { Metrics } from "./components/Metrics"
import { Sidebar, Topbar } from "./components/Navigation"
import { Settings } from "./components/Settings"

export default function App() {
  const [authed, setAuthed] = useState(false)
  const [page, setPage] = useState("dashboard")
  const [services, setServices] = useState([])

  // Helper function to fetch container state
  const fetchContainers = useCallback(async () => {
    try {
      const res = await fetch("/api/containers");
      const data = await res.json()
      if (Array.isArray(data)) setServices(data)
    } catch (err) {
      console.error("Error connecting to backend API:", err)
    }
  }, [])

  // Poll real Docker socket status every 5 seconds
  useEffect(() => {
    if (!authed) return

    fetchContainers()
    const interval = setInterval(fetchContainers, 5000)
    return () => clearInterval(interval)
  }, [authed, fetchContainers])

  if (!authed) return <Login onSignIn={() => setAuthed(true)} />

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <Sidebar current={page} onNavigate={setPage} onLogout={() => setAuthed(false)} />
      <main className="flex min-w-0 flex-1 flex-col">
        <Topbar title="Dashboard" subtitle="Live CasaOS Container Monitor" />
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