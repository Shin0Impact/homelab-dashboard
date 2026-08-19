import React, { useState } from "react"
import { ChevronRight, Lock, Server, User, ShieldCheck } from "lucide-react"

const glass =
  "border border-white/5 bg-card/60 backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]"

export function Setup({ onRegistered }) {
  const [username, setUsername] = useState("admin")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Setup failed")
      }

      if (data.token) {
        localStorage.setItem("homelab_token", data.token)
        localStorage.setItem("homelab_user", JSON.stringify(data.user))
        onRegistered(data)
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
          <h1 className="mt-4 text-xl font-semibold">Welcome to Homelab OS</h1>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            No admin account exists yet. Create one to get started.
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
                minLength={3}
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
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Confirm password</label>
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-input/40 px-3 py-2.5 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Admin Account"}
            <ChevronRight className="h-4 w-4" />
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground text-pretty">
          This account gets full Admin access. You can add more accounts later from Settings.
        </p>
      </div>
    </div>
  )
}
