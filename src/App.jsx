import React, { useState, useEffect } from "react"
import { Sidebar } from "./components/Sidebar"
import { Topbar } from "./components/Topbar"
import { Dashboard } from "./components/Dashboard"
import { Manage } from "./components/Manage"
import { Categories } from "./components/Categories"
import { Settings } from "./components/Settings"

const DEFAULT_CATEGORIES = ["AI", "Media", "Infra", "Network", "Automation"]

export default function App() {
  const [page, setPage] = useState("dashboard")
  const [services, setServices] = useState([])
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem("homelab_categories")
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES
  })

  const fetchContainers = async () => {
    try {
      const res = await fetch("/api/containers")
      if (res.ok) {
        const data = await res.json()
        setServices(data)
      }
    } catch (err) {
      console.error("Failed to fetch containers:", err)
    }
  }

  useEffect(() => {
    fetchContainers()
  }, [])

  const handleAddService = async (newService) => {
    try {
      const res = await fetch("/api/containers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newService),
      })
      if (res.ok) {
        await fetchContainers()
      }
    } catch (err) {
      console.error("Failed to add service:", err)
    }
  }

  const handleUpdateService = async (updatedService) => {
    try {
      const res = await fetch(`/api/containers/${updatedService.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedService),
      })
      if (res.ok) {
        await fetchContainers()
      }
    } catch (err) {
      console.error("Failed to update service:", err)
    }
  }

  const handleDeleteService = async (id) => {
    try {
      const res = await fetch(`/api/containers/${id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        await fetchContainers()
      }
    } catch (err) {
      console.error("Failed to delete service:", err)
    }
  }

  const handleAddCategory = (cat) => {
    if (!categories.includes(cat)) {
      const updated = [...categories, cat]
      setCategories(updated)
      localStorage.setItem("homelab_categories", JSON.stringify(updated))
      window.dispatchEvent(new Event("homelab_categories_updated"))
    }
  }

  const handleDeleteCategory = (cat) => {
    const updated = categories.filter((c) => c !== cat)
    setCategories(updated)
    localStorage.setItem("homelab_categories", JSON.stringify(updated))
    window.dispatchEvent(new Event("homelab_categories_updated"))
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar activePage={page} onNavigate={setPage} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar activePage={page} />

        <main className="flex-1 overflow-y-auto">
          {page === "dashboard" && (
            <Dashboard services={services} onRefresh={fetchContainers} />
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
          {page === "categories" && (
            <Categories
              categories={categories}
              onAdd={handleAddCategory}
              onDelete={handleDeleteCategory}
            />
          )}
          {page === "settings" && <Settings />}
        </main>
      </div>
    </div>
  )
}