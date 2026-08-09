import React, { useState } from "react"
import { Plus, X } from "lucide-react"

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
  const [categories, setCategories] = useState(["AI", "Media", "Infra", "Network", "Automation"])
  const [newCat, setNewCat] = useState("")
  const [compact, setCompact] = useState(false)
  const [refresh, setRefresh] = useState(30)
  const [amoled, setAmoled] = useState(false)
  const [animations, setAnimations] = useState(true)

  function addCat() {
    const v = newCat.trim()
    if (v && !categories.includes(v)) {
      setCategories([...categories, v])
      setNewCat("")
    }
  }

  return (
    <div className="grid max-w-4xl grid-cols-1 gap-6 p-8 lg:grid-cols-2">
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

      {/* Appearance */}
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

          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Refresh Interval</p>
              <span className="font-mono text-sm text-primary">{refresh}s</span>
            </div>
            <input
              type="range"
              min={5}
              max={120}
              step={5}
              value={refresh}
              onChange={(e) => setRefresh(Number(e.target.value))}
              className="mt-3 w-full accent-[var(--primary)]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}