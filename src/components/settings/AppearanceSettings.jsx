import React from "react"
import { useSelector, useDispatch } from "react-redux"
import { setCompact, setTheme, setRefresh } from "../../store/settingsSlice"
import { Moon, Sun, Sparkles } from "lucide-react"

const glass =
  "border border-white/5 bg-card/60 backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]"

const THEME_OPTIONS = [
  { id: "default", label: "Default Dark", icon: Moon },
  { id: "amoled", label: "AMOLED Dark", icon: Sparkles },
  { id: "light", label: "Light Mode", icon: Sun },
]

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

export function AppearanceSettings() {
  const dispatch = useDispatch()
  const { compact, theme = "default", refresh } = useSelector((state) => state.settings)

  return (
    <div className={`rounded-2xl p-6 ${glass}`}>
      <h2 className="text-base font-semibold">Appearance</h2>
      <p className="mt-1 text-sm text-muted-foreground">Customize dashboard UI behavior.</p>

      <div className="mt-5 space-y-5">
        <div>
          <p className="text-sm font-medium">Theme Mode</p>
          <p className="mb-2.5 text-xs text-muted-foreground">Select active color scheme.</p>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((t) => {
              const Icon = t.icon
              const isActive = theme === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => dispatch(setTheme(t.id))}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-medium transition-all ${
                    isActive
                      ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/25"
                      : "border-white/10 bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Compact Mode</p>
            <p className="text-xs text-muted-foreground">Tighter cards and spacing.</p>
          </div>
          <Toggle on={compact} onChange={(val) => dispatch(setCompact(val))} />
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
            onChange={(e) => dispatch(setRefresh(Number(e.target.value)))}
            className="mt-3 w-full cursor-pointer accent-[var(--primary)]"
          />
        </div>
      </div>
    </div>
  )
}