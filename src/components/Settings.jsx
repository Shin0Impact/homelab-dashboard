import React, { useState, useEffect } from "react"
import {
  Plus,
  X,
  Download,
  Upload,
  RotateCcw,
  UserPlus,
  Trash2,
  Shield,
  User as UserIcon,
} from "lucide-react"

const glass =
  "border border-white/5 bg-card/60 backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]"

function Toggle({ on, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        on ? "bg-primary" : "bg-secondary"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
          on ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  )
}

const DEFAULT_CATEGORIES = ["AI", "Media", "Infra", "Network", "Automation"]

export function Settings() {
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem("homelab_categories")
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES
  })
  const [newCat, setNewCat] = useState("")

  const [compact, setCompact] = useState(() => localStorage.getItem("homelab_compact") === "true")
  const [amoled, setAmoled] = useState(() => localStorage.getItem("homelab_amoled") === "true")
  const [refresh, setRefresh] = useState(() => Number(localStorage.getItem("homelab_refresh")) || 10)

  const [users, setUsers] = useState([])
  const [newUser, setNewUser] = useState("")
  const [newPass, setNewPass] = useState("")
  const [newRole, setNewRole] = useState("Viewer")
  const [userError, setUserError] = useState("")

  const token = localStorage.getItem("homelab_token")

  useEffect(() => {
    localStorage.setItem("homelab_categories", JSON.stringify(categories))
    localStorage.setItem("homelab_compact", compact)
    localStorage.setItem("homelab_amoled", amoled)
    localStorage.setItem("homelab_refresh", refresh)

    if (amoled) {
      document.documentElement.classList.add("amoled")
    } else {
      document.documentElement.classList.remove("amoled")
    }

    window.dispatchEvent(new Event("homelab_settings_updated"))
    window.dispatchEvent(new Event("homelab_categories_updated"))
  }, [categories, compact, amoled, refresh])

  const fetchUsers = async () => {
    if (!token) return
    try {
      const res = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (err) {
      console.error("Failed to fetch users", err)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleAddUser = async (e) => {
    e.preventDefault()
    setUserError("")
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: newUser, password: newPass, role: newRole }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to create user")

      setNewUser("")
      setNewPass("")
      setNewRole("Viewer")
      fetchUsers()
    } catch (err) {
      setUserError(err.message)
    }
  }

  const handleDeleteUser = async (id) => {
    if (!confirm("Are you sure you want to delete this user?")) return
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        fetchUsers()
      } else {
        const data = await res.json()
        alert(data.message || "Failed to delete user")
      }
    } catch (err) {
      console.error("Failed to delete user", err)
    }
  }

  function addCat() {
    const v = newCat.trim()
    if (v && !categories.includes(v)) {
      setCategories([...categories, v])
      setNewCat("")
    }
  }

  function removeCat(category) {
    setCategories(categories.filter((c) => c !== category))
  }

  const handleExport = () => {
    const data = { categories, compact, amoled, refresh }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `homelab-settings.json`
    a.click()
  }

  const handleImport = (e) => {
    const fileReader = new FileReader()
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8")
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result)
          if (Array.isArray(parsed.categories)) setCategories(parsed.categories)
          if (parsed.compact !== undefined) setCompact(parsed.compact)
          if (parsed.amoled !== undefined) setAmoled(parsed.amoled)
          if (parsed.refresh) setRefresh(parsed.refresh)
        } catch {
          alert("Invalid backup file.")
        }
      }
    }
  }

  return (
    <div className="grid max-w-4xl grid-cols-1 gap-6 p-8 lg:grid-cols-2">
      {/* Categories */}
      <div className={`rounded-2xl p-6 ${glass}`}>
        <h2 className="text-base font-semibold">Categories</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tags used to organize your services.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((c) => (
            <span
              key={c}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-secondary/50 px-3 py-1 text-xs font-medium"
            >
              {c}
              <button onClick={() => removeCat(c)} className="text-muted-foreground hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) addCat()
            }}
            placeholder="New category"
            className="flex-1 rounded-lg border border-white/10 bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
          />
          <button
            onClick={addCat}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      {/* Appearance */}
      <div className={`rounded-2xl p-6 ${glass}`}>
        <h2 className="text-base font-semibold">Appearance</h2>
        <p className="mt-1 text-sm text-muted-foreground">Customize dashboard UI behavior.</p>

        <div className="mt-5 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Compact Mode</p>
              <p className="text-xs text-muted-foreground">Tighter cards and spacing.</p>
            </div>
            <Toggle on={compact} onChange={setCompact} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">AMOLED Dark</p>
              <p className="text-xs text-muted-foreground">Pure-black background variant.</p>
            </div>
            <Toggle on={amoled} onChange={setAmoled} />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Refresh Interval</p>
              <span className="font-mono text-sm text-primary">{refresh}s</span>
            </div>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={refresh}
              onChange={(e) => setRefresh(Number(e.target.value))}
              className="mt-3 w-full cursor-pointer accent-[var(--primary)]"
            />
          </div>
        </div>
      </div>

      {/* Users & Security */}
      <div className={`rounded-2xl p-6 ${glass} lg:col-span-2`}>
        <h2 className="text-base font-semibold">Users & Security</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage user accounts and access roles.</p>

        {userError && <p className="mt-2 text-xs text-destructive">{userError}</p>}

        <form onSubmit={handleAddUser} className="mt-4 flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Username"
            required
            value={newUser}
            onChange={(e) => setNewUser(e.target.value)}
            className="flex-1 min-w-[130px] rounded-lg border border-white/10 bg-input/40 px-3 py-2 text-sm outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            required
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            className="flex-1 min-w-[130px] rounded-lg border border-white/10 bg-input/40 px-3 py-2 text-sm outline-none"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="rounded-lg border border-white/10 bg-secondary px-3 py-2 text-sm outline-none"
          >
            <option value="Viewer">Viewer</option>
            <option value="Admin">Admin</option>
          </select>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4" /> Add
          </button>
        </form>

        <div className="mt-4 divide-y divide-white/5 border-t border-white/5 pt-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                  <UserIcon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-sm font-medium">{u.username}</p>
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Shield className="h-3 w-3 text-primary" /> {u.role}
                  </p>
                </div>
              </div>
              {u.username !== "admin" && (
                <button
                  onClick={() => handleDeleteUser(u.id)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Backup & Data */}
      <div className={`rounded-2xl p-6 ${glass} lg:col-span-2`}>
        <h2 className="text-base font-semibold">Backup & Data</h2>
        <p className="mt-1 text-sm text-muted-foreground">Export or restore dashboard preferences.</p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-secondary/50 px-4 py-2 text-xs font-medium hover:bg-secondary"
          >
            <Download className="h-3.5 w-3.5" /> Export Settings
          </button>

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-secondary/50 px-4 py-2 text-xs font-medium hover:bg-secondary">
            <Upload className="h-3.5 w-3.5" /> Import Settings
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>

          <button
            onClick={() => {
              if (confirm("Reset settings to default values?")) {
                localStorage.clear()
                window.location.reload()
              }
            }}
            className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive hover:bg-destructive/20"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset Defaults
          </button>
        </div>
      </div>
    </div>
  )
}