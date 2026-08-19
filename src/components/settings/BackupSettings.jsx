import React from "react"
import { useSelector, useDispatch } from "react-redux"
import { setSettings, resetSettings } from "../../store/settingsSlice"
import { Download, Upload, RotateCcw } from "lucide-react"

const glass =
  "border border-white/5 bg-card/60 backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]"

export function BackupSettings() {
  const dispatch = useDispatch()

  const settingsState = useSelector((state) => state.settings)
  const customizationState = useSelector((state) => state.customization) || {}

  const handleExport = () => {
    const backupData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      data: {
        categories: settingsState.categories || [],
        theme: settingsState.theme || "default",
        refresh: settingsState.refresh || 10,
        compact: settingsState.compact || false,
        favorites: customizationState.favorites || settingsState.favorites || [],
        customServices: settingsState.customServices || customizationState.services || [],
        customStacks: customizationState.stacks || settingsState.stacks || [],
      },
    }

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `homelab-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e) => {
    const fileReader = new FileReader()
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8")
      fileReader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target.result)
          const payload = parsed.data ? parsed.data : parsed

          dispatch(setSettings(payload))

          const token = localStorage.getItem("homelab_token")
          if (token) {
            await fetch("/api/settings", {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(payload),
            }).catch((err) => console.error("Failed to sync restored settings to server", err))
          }

          alert("Backup restored successfully!")
        } catch {
          alert("Invalid or corrupted backup file.")
        }
      }
    }
  }

  return (
    <div className={`rounded-2xl p-6 ${glass} lg:col-span-2`}>
      <h2 className="text-base font-semibold">Backup & Data</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Export or restore custom stacks, categories, favorites, services, and theme preferences.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-secondary/50 px-4 py-2 text-xs font-medium hover:bg-secondary"
        >
          <Download className="h-3.5 w-3.5" /> Export Settings & Stacks
        </button>

        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-secondary/50 px-4 py-2 text-xs font-medium hover:bg-secondary">
          <Upload className="h-3.5 w-3.5" /> Import Settings & Stacks
          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>

        <button
          onClick={() => {
            if (confirm("Reset settings, stacks, and categories to default values?")) {
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