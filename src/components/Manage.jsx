import React, { useState } from "react"
import { Container, Pencil, Plus, Trash2, X } from "lucide-react"
import { ICONS, CategoryTag, StatusDot, glass } from "./UIHelpers"

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
      // Preserve existing ID or tag with 'custom-' for new entries
      id: initial?.id ?? `custom-${Date.now()}`,
      name: name.trim(),
      port: port ? Number(port) : null,
      category,
      icon,
      online: initial?.online ?? true,
      isCustom: true,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-md rounded-2xl p-6 ${glass}`}>
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
          <Field label="Icon">
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((key) => {
                const Icon = ICONS[key] || Container
                const selected = icon === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIcon(key)}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                      selected
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : "border-white/10 bg-secondary/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
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

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{services.length} registered services</p>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add New Service
        </button>
      </div>

      <div className={`overflow-hidden rounded-2xl ${glass}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Service</th>
              <th className="px-5 py-3 font-medium">Local URL / Port</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => {
              const Icon = ICONS[s.icon] || Container
              const computedUrl = s.port
                ? `${window.location.protocol}//${window.location.hostname}:${s.port}`
                : s.url || "No exposed port"

              return (
                <tr key={s.id} className="border-b border-white/5 last:border-0 hover:bg-secondary/30">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/70 ring-1 ring-white/5">
                        <Icon className="h-4 w-4" />
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
                    <div className="flex items-center justify-end gap-1.5">
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
              );
            })}
            {services.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No services registered or discovered.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && <ServiceModal initial={editing} onClose={() => setModalOpen(false)} onSave={handleSave} />}
    </div>
  )
}