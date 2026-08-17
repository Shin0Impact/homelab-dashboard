import React from "react"
import { useSelector, useDispatch } from "react-redux"
import { setTheme, setRefresh } from "../../store/settingsSlice"
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
  const { theme = "default", refresh = 15 } = useSelector((state) => state.settings)

  // Calculate equivalent milliseconds for display
  const currentFps = Number(refresh)
  const currentMs = Math.round(1000 / (currentFps || 15))

  return (
    <div className={`rounded-2xl p-6 ${glass}`}>
      <h2 className="text-base font-semibold">Appearance</h2>
      <p className="mt-1 text-sm text-muted-foreground">Customize dashboard UI behavior.</p>

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

        {/* Polling Rate Slider (0.2 FPS to 60 FPS / 5000ms to 16ms) */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Refresh Rate</p>
              <p className="text-xs text-muted-foreground">0.2 FPS (5s) to 60 FPS (~16ms)</p>
            </div>
            <div className="text-right">
              <span className="font-mono text-sm font-semibold text-primary">{currentFps} FPS</span>
              <span className="ml-2 font-mono text-xs text-muted-foreground">({currentMs}ms)</span>
            </div>
          </div>

          <input
            type="range"
            min={0.2}
            max={60}
            step={currentFps < 1 ? 0.1 : 1}
            value={currentFps}
            onChange={(e) => dispatch(setRefresh(Number(e.target.value)))}
            className="mt-3 w-full cursor-pointer accent-[var(--primary)]"
          />

          {/* Quick Preset Buttons */}
          <div className="mt-2.5 flex items-center justify-between gap-1.5">
            {[
              { label: "1/5 FPS (5s)", fps: 0.2 },
              { label: "1 FPS (1s)", fps: 1 },
              { label: "15 FPS (Default)", fps: 15 },
              { label: "30 FPS", fps: 30 },
              { label: "60 FPS", fps: 60 },
            ].map((preset) => (
              <button
                key={preset.fps}
                type="button"
                onClick={() => dispatch(setRefresh(preset.fps))}
                className={`rounded-lg border px-2 py-1 text-[10px] font-medium transition-all ${
                  currentFps === preset.fps
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-white/10 bg-secondary/30 text-muted-foreground hover:bg-secondary"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}