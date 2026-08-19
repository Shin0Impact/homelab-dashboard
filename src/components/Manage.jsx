import React, { useState, useEffect } from "react"
import {
  Container,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  Star,
  Square,
  Play,
  RotateCw,
  Loader2,
} from "lucide-react"
import { ICONS, CategoryTag, ServiceIcon, StatusDot, glass } from "./UIHelpers"

const ICON_OPTIONS = [
  "container",
  "image",
  "cctv",
  "shield",
  "workflow",
  "bot",
  "music",
  "search",
  "download",
  "video",
]
const DEFAULT_CATEGORIES = ["AI", "Media", "Infra", "Network", "Automation"]

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function ServiceModal({ initial, onClose, onSave }) {
  const [name, setName] = useState(initial?.name ?? "")
  const [port, setPort] = useState(initial?.port ?? "")
  const [category, setCategory] = useState(initial?.category ?? "Infra")
  const [icon, setIcon] = useState(initial?.icon ?? "container")

  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem("homelab_categories")
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES
  })

  useEffect(() => {
    const handleCategoryUpdate = () => {
      const saved = localStorage.getItem("homelab_categories")
      if (saved) setCategories(JSON.parse(saved))
    }
    window.addEventListener("homelab_categories_updated", handleCategoryUpdate)
    return () => window.removeEventListener("homelab_categories_updated", handleCategoryUpdate)
  }, [])

  function handleSave() {
    if (!name.trim()) return

    const isFav = Boolean(initial?.is_favorite || initial?.favorite)

    onSave({
      id: initial?.id ?? `custom-${Date.now()}`,
      name: name.trim(),
      port: port ? Number(port) : null,
      category,
      icon,
      online: initial?.online ?? true,
      is_favorite: isFav,
      favorite: isFav,
      isCustom: true,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-md rounded-2xl p-5 sm:p-6 ${glass}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{initial ? "Edit Service" : "Add New Service"}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <Field label="Service Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Portainer"
              className="w-full rounded-lg border border-white/10 bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
          </Field>
          <Field label="Exposed Port">
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="e.g. 9000"
              className="w-full rounded-lg border border-white/10 bg-input/40 px-3 py-2 font-mono text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
          </Field>
          <Field label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            >
              {categories.map((c) => (
                <option key={c} value={c} className="bg-popover">
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fallback Icon">
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((key) => {
                const Icon = ICONS[key] || Container
                const selected = icon === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIcon(key)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors sm:h-10 sm:w-10 ${
                      selected
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : "border-white/10 bg-secondary/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                )
              })}
            </div>
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {initial ? "Save Changes" : "Add Service"}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Manage({
  services: initialServices = [],
  categories = [],
  onAdd,
  onUpdate,
  onDelete,
  onRefresh,
}) {
  const [localServices, setLocalServices] = useState(initialServices)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [actionLoadingMap, setActionLoadingMap] = useState({})

  useEffect(() => {
    setLocalServices(initialServices)
  }, [initialServices])

  const checkIsOnline = (s) => s.online || s.status === "online" || s.state === "running"
  const checkIsFavorite = (s) => Boolean(s.is_favorite || s.favorite)

  function openAdd() {
    setEditing(null)
    setModalOpen(true)
  }
  function openEdit(s) {
    setEditing(s)
    setModalOpen(true)
  }
  function handleSave(s) {
    if (editing && onUpdate) onUpdate(s)
    else if (onAdd) onAdd(s)
    setModalOpen(false)
  }

  function handleToggleFavorite(s) {
    const isFav = !checkIsFavorite(s)
    const updatedService = {
      ...s,
      is_favorite: isFav,
      favorite: isFav,
    }

    setLocalServices((prev) =>
      prev.map((item) => (item.id === s.id ? updatedService : item))
    )

    if (onUpdate) {
      onUpdate(updatedService)
    }
  }

  const handleContainerAction = async (service, action) => {
    setActionLoadingMap((prev) => ({ ...prev, [`${service.id}-${action}`]: true }))
    try {
      const res = await fetch(`/api/containers/${service.id}/${action}`, { method: "POST" })
      if (res.ok && onRefresh) {
        await onRefresh()
      }
    } catch (err) {
      console.error(`Failed to ${action} container:`, err)
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [`${service.id}-${action}`]: false }))
    }
  }

  const filterOptions = [
    "All",
    ...new Set([...categories, ...localServices.map((s) => s.category).filter(Boolean)]),
  ]

  const filteredServices = localServices.filter((s) => {
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      s.name?.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q) ||
      s.port?.toString().includes(q) ||
      s.url?.toLowerCase().includes(q)

    const matchesCat = selectedCategory === "All" || s.category === selectedCategory
    return matchesSearch && matchesCat
  })

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8">
      {/* Integrated Single-Row Controls Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Manage Services</h2>
          <span className="rounded-full bg-secondary/80 px-2.5 py-0.5 text-xs font-medium text-muted-foreground border border-white/5">
            {filteredServices.length} / {localServices.length}
          </span>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3 sm:max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search services..."
              className="w-full rounded-xl border border-white/10 bg-input/40 pl-9 pr-4 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <button
            onClick={openAdd}
            className="flex items-center gap-2 shrink-0 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add New Service</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {filterOptions.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              selectedCategory === cat
                ? "border-teal-500/40 bg-teal-500/20 text-teal-400"
                : "border-white/5 bg-secondary/30 text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className={`hidden overflow-hidden rounded-2xl md:block ${glass}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Service</th>
              <th className="px-5 py-3 font-medium">Local URL / Port</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Control</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredServices.map((s) => {
              const isOnline = checkIsOnline(s)
              const isFav = checkIsFavorite(s)
              const computedUrl = s.port
                ? `${window.location.protocol}//${window.location.hostname}:${s.port}`
                : s.url || "No exposed port"

              const isStartLoading = !!actionLoadingMap[`${s.id}-start`]
              const isStopLoading = !!actionLoadingMap[`${s.id}-stop`]
              const isRestartLoading = !!actionLoadingMap[`${s.id}-restart`]

              return (
                <tr key={s.id} className="border-b border-white/5 last:border-0 hover:bg-secondary/30">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/70 ring-1 ring-white/5">
                        <ServiceIcon service={s} className="h-4 w-4" />
                      </span>
                      <span className="font-medium">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{computedUrl}</td>
                  <td className="px-5 py-3">
                    <CategoryTag category={s.category} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <StatusDot online={isOnline} />
                      <span className="text-xs text-muted-foreground">{isOnline ? "Running" : "Exited"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      {isOnline ? (
                        <button
                          onClick={() => handleContainerAction(s, "stop")}
                          disabled={isStopLoading}
                          title="Stop Container"
                          className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 disabled:opacity-50"
                        >
                          {isStopLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Square className="h-3.5 w-3.5 fill-current" />
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleContainerAction(s, "start")}
                          disabled={isStartLoading}
                          title="Start Container"
                          className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                        >
                          {isStartLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Play className="h-3.5 w-3.5 fill-current" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleContainerAction(s, "restart")}
                        disabled={isRestartLoading}
                        title="Restart Container"
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary/60 text-muted-foreground hover:text-foreground disabled:opacity-50"
                      >
                        {isRestartLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCw className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleToggleFavorite(s)}
                        title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                          isFav
                            ? "text-amber-400 hover:bg-amber-500/10"
                            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                        }`}
                      >
                        <Star className={`h-4 w-4 ${isFav ? "fill-amber-400 text-amber-400" : ""}`} />
                      </button>
                      <button
                        onClick={() => openEdit(s)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete && onDelete(s.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filteredServices.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  {localServices.length === 0
                    ? "No services registered or discovered."
                    : "No services match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="space-y-3 md:hidden">
        {filteredServices.map((s) => {
          const isOnline = checkIsOnline(s)
          const isFav = checkIsFavorite(s)
          const computedUrl = s.port
            ? `${window.location.protocol}//${window.location.hostname}:${s.port}`
            : s.url || "No exposed port"

          return (
            <div key={s.id} className={`rounded-xl p-4 ${glass}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/70 ring-1 ring-white/5">
                    <ServiceIcon service={s} className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-sm">{s.name}</p>
                    <p className="font-mono text-xs text-muted-foreground truncate max-w-[180px] sm:max-w-xs">
                      {computedUrl}
                    </p>
                  </div>
                </div>
                <CategoryTag category={s.category} />
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                <div className="flex items-center gap-2">
                  <StatusDot online={isOnline} />
                  <span className="text-xs text-muted-foreground">{isOnline ? "Running" : "Exited"}</span>
                </div>

                <div className="flex items-center gap-1">
                  {isOnline ? (
                    <button
                      onClick={() => handleContainerAction(s, "stop")}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400"
                    >
                      <Square className="h-4 w-4 fill-current" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleContainerAction(s, "start")}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400"
                    >
                      <Play className="h-4 w-4 fill-current" />
                    </button>
                  )}
                  <button
                    onClick={() => handleContainerAction(s, "restart")}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/40 text-muted-foreground"
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleToggleFavorite(s)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                      isFav ? "text-amber-400 bg-amber-500/10" : "bg-secondary/40 text-muted-foreground"
                    }`}
                  >
                    <Star className={`h-4 w-4 ${isFav ? "fill-amber-400 text-amber-400" : ""}`} />
                  </button>
                  <button
                    onClick={() => openEdit(s)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/40 text-muted-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete && onDelete(s.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {filteredServices.length === 0 && (
          <div className={`py-8 text-center text-sm text-muted-foreground ${glass} rounded-xl`}>
            {localServices.length === 0
              ? "No services registered or discovered."
              : "No services match your search."}
          </div>
        )}
      </div>

      {modalOpen && <ServiceModal initial={editing} onClose={() => setModalOpen(false)} onSave={handleSave} />}
    </div>
  )
}