import React, { useState } from "react"
import { ChevronRight, Lock, Server, User, Wifi } from "lucide-react"

const glass =
  "border border-white/5 bg-card/60 backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]"

export function Login({ onSignIn }) {
  const [username, setUsername] = useState("admin")
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Authentication failed")
      }

      if (data.token) {
        localStorage.setItem("homelab_token", data.token)
        localStorage.setItem("homelab_user", JSON.stringify(data.user))
        onSignIn(data)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className={`w-full max-w-sm rounded-2xl p-8 ${glass}`}>
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <Server className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">Homelab OS</h1>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Authenticate to access your private server.
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-center text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Username</label>
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-input/40 px-3 py-2.5 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20">
              <User className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</label>
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-input/40 px-3 py-2.5 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 accent-[var(--primary)]"
            />
            Remember Session
          </label>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In to Server"}
            <ChevronRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-white/5 bg-card/40 py-2 text-xs text-muted-foreground">
          <Wifi className="h-3.5 w-3.5 text-chart-2" />
          Connected via Tailscale · 100.64.0.1
        </div>
      </div>
    </div>
  )
}