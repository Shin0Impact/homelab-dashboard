import React, { useState, useEffect } from "react"
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

  // Poll real Docker socket status every 5 seconds
  useEffect(() => {
    if (!authed) return

    const fetchContainers = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/containers")
        const data = await res.json()
        if (Array.isArray(data)) setServices(data)
      } catch (err) {
        console.error("Error connecting to backend API:", err)
      }
    }

    fetchContainers()
    const interval = setInterval(fetchContainers, 5000)
    return () => clearInterval(interval)
  }, [authed])

  if (!authed) return <Login onSignIn={() => setAuthed(true)} />

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <Sidebar current={page} onNavigate={setPage} onLogout={() => setAuthed(false)} />
      <main className="flex min-w-0 flex-1 flex-col">
        <Topbar title="Dashboard" subtitle="Live CasaOS Container Monitor" />
        <div className="flex-1 overflow-y-auto">
          {page === "dashboard" && <Dashboard services={services} />}
          {page === "metrics" && <Metrics />}
          {page === "settings" && <Settings />}
        </div>
      </main>
    </div>
  )
}