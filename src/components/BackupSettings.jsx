import React from "react"
import { useSelector, useDispatch } from "react-redux"
import { setSettings, resetSettings } from "../store/settingsSlice"
import { Download, Upload, RotateCcw } from "lucide-react"

const glass =
  "border border-white/5 bg-card/60 backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]"

export function BackupSettings() {
  const dispatch = useDispatch()
  const { categories, compact, theme, refresh } = useSelector((state) => state.settings)

  const handleExport = () => {
    const data = { categories, compact, theme, refresh }
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
          dispatch(setSettings(parsed))
        } catch {
          alert("Invalid backup file.")
        }
      }
    }
  }

  return (
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
              dispatch(resetSettings())
            }
          }}
          className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive hover:bg-destructive/20"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset Defaults
        </button>
      </div>
    </div>
  )
}