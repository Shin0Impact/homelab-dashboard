import React, { useState, useEffect } from "react"
import { Layers, Play, Trash2, Plus, RefreshCw, Loader2, Code2, CheckCircle2, AlertCircle } from "lucide-react"
import { glass } from "./UIHelpers"

export function Stacks({ onRefresh }) {
  const [stacks, setStacks] = useState([])
  const [loading, setLoading] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [stackName, setStackName] = useState("")
  const [composeContent, setComposeContent] = useState(`version: '3.8'
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
`)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const fetchStacks = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/stacks")
      if (res.ok) {
        const data = await res.json()
        setStacks(data)
      }
    } catch (err) {
      console.error("Failed to fetch stacks:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStacks()
  }, [])

  const handleDeploy = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setDeploying(true)

    try {
      const res = await fetch("/api/stacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: stackName, composeContent }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Deployment failed")

      setSuccess(`Stack '${stackName}' deployed successfully.`)
      setStackName("")
      fetchStacks()
      if (onRefresh) onRefresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeploying(false)
    }
  }

  const handleDelete = async (name) => {
    if (!confirm(`Are you sure you want to stop and delete stack '${name}'?`)) return

    try {
      const res = await fetch(`/api/stacks/${name}`, { method: "DELETE" })
      if (res.ok) {
        fetchStacks()
        if (onRefresh) onRefresh()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to delete stack")
      }
    } catch (err) {
      console.error("Failed to delete stack:", err)
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deploy New Stack Form */}
        <div className={`lg:col-span-1 rounded-2xl p-5 sm:p-6 ${glass}`}>
          <div className="flex items-center gap-2 mb-4">
            <Code2 className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Deploy New Stack</h2>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleDeploy} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Stack Name</label>
              <input
                type="text"
                required
                placeholder="e.g. my-app"
                value={stackName}
                onChange={(e) => setStackName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                className="w-full rounded-lg border border-white/10 bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">docker-compose.yml</label>
              <textarea
                required
                rows={12}
                value={composeContent}
                onChange={(e) => setComposeContent(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-input/40 p-3 font-mono text-xs outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <button
              type="submit"
              disabled={deploying}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {deploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
              Deploy Stack
            </button>
          </form>
        </div>

        {/* Existing Stacks List */}
        <div className={`lg:col-span-2 rounded-2xl p-5 sm:p-6 ${glass}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">Active Docker Stacks</h2>
            </div>
            <button
              onClick={fetchStacks}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/50 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="space-y-4">
            {stacks.map((st) => (
              <div key={st.name} className="rounded-xl border border-white/5 bg-secondary/20 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        st.status === "running" ? "bg-emerald-400" : "bg-muted-foreground"
                      }`}
                    />
                    <div>
                      <h3 className="font-semibold text-sm">{st.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {st.containers.length} container{st.containers.length === 1 ? "" : "s"} attached
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(st.name)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {st.containers.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-white/5 pt-3">
                    {st.containers.map((c) => (
                      <span
                        key={c.id}
                        className="inline-flex items-center gap-1.5 rounded-md border border-white/5 bg-background/50 px-2.5 py-1 text-[11px] font-mono text-muted-foreground"
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            c.state === "running" ? "bg-emerald-400" : "bg-destructive"
                          }`}
                        />
                        {c.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {stacks.length === 0 && !loading && (
              <div className="py-12 text-center text-sm text-muted-foreground">No active stacks found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}