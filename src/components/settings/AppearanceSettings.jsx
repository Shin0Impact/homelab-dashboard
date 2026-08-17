import React from "react"
import { useSelector, useDispatch } from "react-redux"
import { setTheme } from "../../store/settingsSlice"
import { Moon, Sun, Sparkles } from "lucide-react"

const glass =
  "border border-white/5 bg-card/60 backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]"

const THEME_OPTIONS = [
  { id: "default", label: "Default Dark", icon: Moon },
  { id: "amoled", label: "AMOLED Dark", icon: Sparkles },
  { id: "light", label: "Light Mode", icon: Sun },
]

export function AppearanceSettings() {
  const dispatch = useDispatch()
  const { theme = "default" } = useSelector((state) => state.settings)

  return (
    <div className={`rounded-2xl p-6 ${glass}`}>
      <h2 className="text-base font-semibold">Appearance</h2>
      <p className="mt-1 text-sm text-muted-foreground">Customize dashboard theme.</p>

      <div className="mt-5 space-y-5">
        {/* Theme Selection */}
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
      </div>
    </div>
  )
}