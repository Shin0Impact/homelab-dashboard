import React, { useState } from "react"
import { Container, Eye, EyeOff, Pencil, Plus, Search, Trash2, X } from "lucide-react"
import { ICONS, CategoryTag, ServiceIcon, StatusDot, glass } from "./UIHelpers"

const ICON_OPTIONS = ["container", "image", "cctv", "shield", "workflow", "bot", "music", "search", "download", "video"]
const CATEGORY_OPTIONS = ["AI", "Media", "Infra", "Network", "Automation"]

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

  function handleSave() {
    if (!name.trim()) return

    onSave({
      id: initial?.id ?? `custom-${Date.now()}`,
      name: name.trim(),
      port: port ? Number(port) : null,
      category,
      icon,
      online: initial?.online ?? true,
      hidden: initial?.hidden ?? false,
      isCustom: true,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-md rounded-2xl p-5 sm:p-6 ${glass}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{initial ? "Edit Service" : "Add New Service"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary/60 hover:text-foreground">
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
              {CATEGORY_OPTIONS.map((c) => (
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

export function Manage({ services = [], onAdd, onUpdate, onDelete }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")

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

  function handleToggleHide(s) {
    if (onUpdate) {
      onUpdate({ ...s, hidden: !s.hidden })
    }
  }

  // Filter services dynamically by name, port, or category
  const filteredServices = services.filter((s) => {
    const q = searchTerm.toLowerCase()
    return (
      s.name?.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q) ||
      s.port?.toString().includes(q) ||
      s.url?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8">
      {/* Search & Header Control Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search services by name, port, category..."
            className="w-full rounded-xl border border-white/10 bg-input/40 pl-9 pr-4 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <p className="text-sm text-muted-foreground">
            {filteredServices.length} of {services.length} services
          </p>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add New Service</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
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
              <th className="px-5 py-3 font-medium">Visibility</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredServices.map((s) => {
              const computedUrl = s.port
                ? `${window.location.protocol}//${window.location.hostname}:${s.port}`
                : s.url || "No exposed port"

              return (
                <tr key={s.id} className={`border-b border-white/5 last:border-0 hover:bg-secondary/30 ${s.hidden ? "opacity-60" : ""}`}>
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
                      <StatusDot online={s.online} />
                      <span className="text-xs text-muted-foreground">{s.online ? "Online" : "Offline"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium ${s.hidden ? "text-amber-400/80" : "text-muted-foreground"}`}>
                      {s.hidden ? "Hidden" : "Visible"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleToggleHide(s)}
                        title={s.hidden ? "Show in Dashboard" : "Hide from Dashboard"}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                          s.hidden
                            ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                        }`}
                      >
                        {s.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                  {services.length === 0 ? "No services registered or discovered." : "No services match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Card View */}
      <div className="space-y-3 md:hidden">
        {filteredServices.map((s) => {
          const computedUrl = s.port
            ? `${window.location.protocol}//${window.location.hostname}:${s.port}`
            : s.url || "No exposed port"

          return (
            <div key={s.id} className={`rounded-xl p-4 ${glass} ${s.hidden ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/70 ring-1 ring-white/5">
                    <ServiceIcon service={s} className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-sm">{s.name}</p>
                    <p className="font-mono text-xs text-muted-foreground truncate max-w-[180px] sm:max-w-xs">{computedUrl}</p>
                  </div>
                </div>
                <CategoryTag category={s.category} />
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                <div className="flex items-center gap-2">
                  <StatusDot online={s.online} />
                  <span className="text-xs text-muted-foreground">{s.online ? "Online" : "Offline"}</span>
                  {s.hidden && <span className="ml-1 text-[11px] font-medium text-amber-400/80">• Hidden</span>}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleHide(s)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                      s.hidden
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-secondary/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => openEdit(s)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/40 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete && onDelete(s.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"
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
            {services.length === 0 ? "No services registered or discovered." : "No services match your search."}
          </div>
        )}
      </div>

      {modalOpen && <ServiceModal initial={editing} onClose={() => setModalOpen(false)} onSave={handleSave} />}
    </div>
  )
}