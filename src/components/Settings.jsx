import React, { useState, useEffect } from "react"
import { Plus, X, Download, Upload, RotateCcw, Check } from "lucide-react"

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

export function Settings() {
  // Initialize state from LocalStorage so toggles persist immediately
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem("homelab_categories")
    return saved ? JSON.parse(saved) : ["AI", "Media", "Infra", "Network", "Automation"]
  })
  const [newCat, setNewCat] = useState("")

  const [compact, setCompact] = useState(() => {
    return localStorage.getItem("homelab_compact") === "true"
  })
  const [amoled, setAmoled] = useState(() => {
    return localStorage.getItem("homelab_amoled") === "true"
  })
  const [animations, setAnimations] = useState(() => {
    return localStorage.getItem("homelab_animations") !== "false"
  })
  const [openInNewTab, setOpenInNewTab] = useState(() => {
    return localStorage.getItem("homelab_newtab") !== "false"
  })
  const [normalizeCpu, setNormalizeCpu] = useState(() => {
    return localStorage.getItem("homelab_normalize_cpu") !== "false"
  })
  const [refresh, setRefresh] = useState(() => {
    const saved = localStorage.getItem("homelab_refresh")
    return saved ? Number(saved) : 5
  })

  const [savedStatus, setSavedStatus] = useState(false)

  // Save changes automatically on toggle/update
  useEffect(() => {
    localStorage.setItem("homelab_categories", JSON.stringify(categories))
    localStorage.setItem("homelab_compact", compact)
    localStorage.setItem("homelab_amoled", amoled)
    localStorage.setItem("homelab_animations", animations)
    localStorage.setItem("homelab_newtab", openInNewTab)
    localStorage.setItem("homelab_normalize_cpu", normalizeCpu)
    localStorage.setItem("homelab_refresh", refresh)
  }, [categories, compact, amoled, animations, openInNewTab, normalizeCpu, refresh])

  function addCat() {
    const v = newCat.trim()
    if (v && !categories.includes(v)) {
      setCategories([...categories, v])
      setNewCat("")
    }
  }

  const triggerNotify = () => {
    setSavedStatus(true)
    setTimeout(() => setSavedStatus(false), 2000)
  }

  // Backup export (Downloads your config to JSON)
  const handleExport = () => {
    const data = {
      categories,
      compact,
      amoled,
      animations,
      openInNewTab,
      normalizeCpu,
      refresh,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `homelab-settings-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }

  // Backup import
  const handleImport = (e) => {
    const fileReader = new FileReader()
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8")
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result)
          if (parsed.categories) setCategories(parsed.categories)
          if (parsed.compact !== undefined) setCompact(parsed.compact)
          if (parsed.amoled !== undefined) setAmoled(parsed.amoled)
          if (parsed.animations !== undefined) setAnimations(parsed.animations)
          if (parsed.openInNewTab !== undefined) setOpenInNewTab(parsed.openInNewTab)
          if (parsed.normalizeCpu !== undefined) setNormalizeCpu(parsed.normalizeCpu)
          if (parsed.refresh) setRefresh(parsed.refresh)
          triggerNotify()
        } catch (err) {
          alert("Invalid Settings JSON!")
        }
      };
    }
  }

  return (
    <div className="max-w-4xl space-y-6 p-8">
      {/* Toast alert on import/save */}
      {savedStatus && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-400">
          <Check className="h-3.5 w-3.5" /> Settings updated successfully!
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category management */}
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
                <button
                  onClick={() => setCategories(categories.filter((x) => x !== c))}
                  className="text-muted-foreground hover:text-destructive"
                >
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

        {/* Appearance & Interface */}
        <div className={`rounded-2xl p-6 ${glass}`}>
          <h2 className="text-base font-semibold">Appearance</h2>
          <p className="mt-1 text-sm text-muted-foreground">Customize how the dashboard behaves.</p>

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

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Animations</p>
                <p className="text-xs text-muted-foreground">Status pulses and transitions.</p>
              </div>
              <Toggle on={animations} onChange={setAnimations} />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Open Web Links in New Tab</p>
                <p className="text-xs text-muted-foreground">Launch web UIs target="_blank".</p>
              </div>
              <Toggle on={openInNewTab} onChange={setOpenInNewTab} />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Telemetry Interval</p>
                <span className="font-mono text-sm text-primary">{refresh}s</span>
              </div>
              <input
                type="range"
                min={2}
                max={60}
                step={1}
                value={refresh}
                onChange={(e) => setRefresh(Number(e.target.value))}
                className="mt-3 w-full accent-[var(--primary)]"
              />
            </div>
          </div>
        </div>

        {/* Docker & System Calculations */}
        <div className={`rounded-2xl p-6 ${glass}`}>
          <h2 className="text-base font-semibold">Metrics Calculation</h2>
          <p className="mt-1 text-sm text-muted-foreground">Adjust telemetry behavior.</p>

          <div className="mt-5 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Cap CPU Usage at 100%</p>
                <p className="text-xs text-muted-foreground">
                  Normalizes multi-core CPU stats to 100% max limit instead of per-core (800%).
                </p>
              </div>
              <Toggle on={normalizeCpu} onChange={setNormalizeCpu} />
            </div>
          </div>
        </div>

        {/* Data & Backup */}
        <div className={`rounded-2xl p-6 ${glass}`}>
          <h2 className="text-base font-semibold">Backup & Configuration</h2>
          <p className="mt-1 text-sm text-muted-foreground">Export or restore settings state.</p>

          <div className="mt-5 space-y-3">
            <button
              onClick={handleExport}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-secondary/50 px-3 py-2 text-xs font-medium hover:bg-secondary"
            >
              <Download className="h-3.5 w-3.5 text-primary" /> Export Configuration JSON
            </button>

            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 bg-secondary/50 px-3 py-2 text-xs font-medium hover:bg-secondary">
              <Upload className="h-3.5 w-3.5 text-purple-400" /> Import Configuration JSON
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>

            <button
              onClick={() => {
                if (confirm("Reset settings to defaults?")) {
                  localStorage.clear()
                  window.location.reload()
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/20"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}