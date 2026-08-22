import React, { useEffect } from "react"
import { useSelector, useDispatch } from "react-redux"
import { setSettings } from "../store/settingsSlice"
import { CategoriesSettings } from "./settings/CategoriesSettings"
import { AppearanceSettings } from "./settings/AppearanceSettings"
import { UserSettings } from "./settings/UserSettings"
import { BackupSettings } from "./settings/BackupSettings"
import { authFetch, getToken } from "../lib/api"

export function Settings({ isAdmin = true }) {
  const dispatch = useDispatch()
  const { categories, theme, refresh } = useSelector((state) => state.settings)
  const token = getToken()

  useEffect(() => {
    async function loadBackendSettings() {
      if (!token) return
      try {
        const res = await authFetch("/api/settings")
        if (res.ok) {
          const data = await res.json()
          dispatch(setSettings(data))
        }
      } catch (err) {
        console.error("Failed to load server settings", err)
      }
    }
    loadBackendSettings()
  }, [dispatch, token])

  useEffect(() => {
    if (!token) return
    // These are shared, app-wide settings, so only an Admin can actually
    // persist them server-side — skip the request entirely for a Viewer
    // rather than firing a PUT that's just going to come back 403.
    if (!isAdmin) return

    // Sync refresh value to localStorage for components relying on window events
    localStorage.setItem("homelab_refresh", String(refresh))
    window.dispatchEvent(new Event("homelab_settings_updated"))

    authFetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories, theme, refresh }),
    }).catch((e) => console.error("Failed to sync settings to server", e))
  }, [categories, theme, refresh, token, isAdmin])

  return (
    <div className="grid max-w-4xl grid-cols-1 gap-6 p-8 lg:grid-cols-2">
      <CategoriesSettings isAdmin={isAdmin} />
      <AppearanceSettings />
      <UserSettings token={token} isAdmin={isAdmin} />
      <BackupSettings isAdmin={isAdmin} />
    </div>
  )
}
