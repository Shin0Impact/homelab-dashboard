import React, { useEffect } from "react"
import { useSelector, useDispatch } from "react-redux"
import { setSettings } from "../store/settingsSlice"
import { CategoriesSettings } from "./settings/CategoriesSettings"
import { AppearanceSettings } from "./settings/AppearanceSettings"
import { UserSettings } from "./settings/UserSettings"
import { BackupSettings } from "./settings/BackupSettings"

export function Settings() {
  const dispatch = useDispatch()
  const { categories, compact, theme, refresh } = useSelector((state) => state.settings)
  const token = localStorage.getItem("homelab_token")

  useEffect(() => {
    async function loadBackendSettings() {
      if (!token) return
      try {
        const res = await fetch("/api/settings", {
          headers: { Authorization: `Bearer ${token}` },
        })
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
    fetch("/api/settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ categories, compact, theme, refresh }),
    }).catch((e) => console.error("Failed to sync settings to server", e))
  }, [categories, compact, theme, refresh, token])

  return (
    <div className="grid max-w-4xl grid-cols-1 gap-6 p-8 lg:grid-cols-2">
      <CategoriesSettings />
      <AppearanceSettings />
      <UserSettings token={token} />
      <BackupSettings />
    </div>
  )
}