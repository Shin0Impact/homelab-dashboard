import React, { useState } from "react"
import { Layers, Play, Square, FileCode, Plus, Search, AlertCircle, X, Save, Loader2 } from "lucide-react"

const glass = "border border-border bg-card text-card-foreground backdrop-blur-xl shadow-sm transition-colors"

export function Stacks({ services = [], onRefresh }) {
  const [search, setSearch] = useState("")

  // Edit / View Compose Modal States
  const [selectedStack, setSelectedStack] = useState(null)
  const [stackComposeContent, setStackComposeContent] = useState("")
  const [isLoadingCompose, setIsLoadingCompose] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Deploy New Stack Modal States
  const [isDeployOpen, setIsDeployOpen] = useState(false)
  const [stackNameInput, setStackNameInput] = useState("")
  const [newComposeContent, setNewComposeContent] = useState("")

  const safeServices = Array.isArray(services) ? services : []

  const stacksMap = safeServices.reduce((acc, container) => {
    const stackName =
      container.stack ||
      container.labels?.["com.docker.compose.project"] ||
      "standalone"

    const displayName = stackName === "standalone" ? "Standalone Services" : stackName

    if (!acc[stackName]) {
      acc[stackName] = {
        name: displayName,
        rawKey: stackName,
        containers: [],
      }
    }

    acc[stackName].containers.push(container)
    return acc
  }, {})

  const stackList = Object.values(stacksMap)
  const filteredStacks = stackList.filter((stack) =>
    stack.name.toLowerCase().includes(search.toLowerCase())
  )

  // Fetch real compose content when clicking "Compose File"
  const handleOpenComposeModal = async (stackName) => {
    setSelectedStack(stackName)
    setIsLoadingCompose(true)
    try {
      const token = localStorage.getItem("homelab_token")
      const res = await fetch(`/api/stacks/${stackName}/compose`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      setStackComposeContent(data.composeContent || "")
    } catch (err) {
      console.error("Failed to fetch compose file:", err)
      setStackComposeContent("# Failed to fetch compose file from backend.")
    } finally {
      setIsLoadingCompose(false)
    }
  }

  // Save / Redeploy stack updates
  const handleSaveAndDeployCompose = async () => {
    if (!selectedStack || !stackComposeContent.trim()) return
    setIsSaving(true)

    try {
      const token = localStorage.getItem("homelab_token")
      const res = await fetch("/api/stacks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: selectedStack,
          composeContent: stackComposeContent,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.details || data.error || "Failed to deploy stack")

      alert(`Stack "${selectedStack}" updated & deployed successfully!`)
      if (onRefresh) await onRefresh()
      setSelectedStack(null)
    } catch (err) {
      alert(`Deployment Error: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Deploy brand new stack
  const handleDeploySubmit = async (e) => {
    e.preventDefault()
    if (!stackNameInput.trim() || !newComposeContent.trim()) return
    setIsSaving(true)

    try {
      const token = localStorage.getItem("homelab_token")
      const res = await fetch("/api/stacks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: stackNameInput.trim(),
          composeContent: newComposeContent,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.details || data.error || "Failed to deploy stack")

      alert(`Stack "${stackNameInput}" deployed successfully!`)
      if (onRefresh) await onRefresh()

      setStackNameInput("")
      setNewComposeContent("")
      setIsDeployOpen(false)
    } catch (err) {
      alert(`Deploy error: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Bring down stack
  const handleStackDown = async (stackName) => {
    if (!confirm(`Are you sure you want to stop all containers in ${stackName}?`)) return

    try {
      const token = localStorage.getItem("homelab_token")
      const res = await fetch(`/api/stacks/${stackName}/down`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (!res.ok) throw new Error("Failed to bring down stack")

      if (onRefresh) await onRefresh()
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
  }

  return (
    <div className="min-h-full w-full p-4 sm:p-6 md:p-8 space-y-6 text-foreground">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Docker Stacks</h2>
          <span className="rounded-full bg-secondary/80 px-2.5 py-0.5 text-xs font-medium text-muted-foreground border border-white/5">
            {filteredStacks.length} Stacks
          </span>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3 sm:max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search stacks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-input/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
            />
          </div>
          <button
            onClick={() => setIsDeployOpen(true)}
            className="flex items-center gap-2 shrink-0 px-3.5 py-1.5 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 rounded-xl text-xs font-semibold transition-colors"
          >
            <Plus className="h-4 w-4" /> Deploy Stack
          </button>
        </div>
      </div>

      {/* Stacks List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredStacks.map((stack) => {
          const totalContainers = stack.containers.length
          const runningContainers = stack.containers.filter(
            (c) => c.status === "online" || c.state === "running"
          ).length
          const isHealthy = runningContainers === totalContainers && totalContainers > 0

          return (
            <div key={stack.name} className={`p-5 rounded-2xl ${glass} space-y-4`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base capitalize text-foreground">{stack.name}</h3>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          isHealthy
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${isHealthy ? "bg-emerald-500" : "bg-amber-500"}`} />
                        {runningContainers} / {totalContainers} Running
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => handleOpenComposeModal(stack.rawKey)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                  >
                    <FileCode className="h-3.5 w-3.5" /> Compose File
                  </button>
                  <button
                    onClick={() => handleOpenComposeModal(stack.rawKey)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 transition-colors"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" /> Deploy
                  </button>
                  <button
                    onClick={() => handleStackDown(stack.rawKey)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/25 transition-colors"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" /> Down
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {stack.containers.map((c) => {
                  const isOnline = c.status === "online" || c.state === "running"
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/40 border border-border text-xs transition-colors hover:bg-secondary/70"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-medium text-foreground truncate">{c.name || c.containerName}</p>
                        <p className="font-mono text-[10px] text-muted-foreground truncate">{c.image}</p>
                      </div>
                      <span className={`h-2 w-2 rounded-full shrink-0 ${isOnline ? "bg-emerald-500" : "bg-rose-500"}`} />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {filteredStacks.length === 0 && (
          <div className={`p-8 text-center text-sm text-muted-foreground rounded-2xl flex flex-col items-center gap-2 ${glass}`}>
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
            <p>No Docker stacks found.</p>
          </div>
        )}
      </div>

      {/* Edit Compose Modal */}
      {selectedStack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedStack(null)} />
          <div className={`relative w-full max-w-2xl rounded-2xl p-6 ${glass} space-y-4`}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-base capitalize text-foreground">
                  Stack: {selectedStack}
                </h3>
              </div>
              <button onClick={() => setSelectedStack(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {isLoadingCompose ? (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading compose configuration...
              </div>
            ) : (
              <textarea
                rows={12}
                value={stackComposeContent}
                onChange={(e) => setStackComposeContent(e.target.value)}
                className="w-full p-4 font-mono text-xs bg-zinc-950 text-emerald-400 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setSelectedStack(null)}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-border text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAndDeployCompose}
                disabled={isSaving || isLoadingCompose}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save & Deploy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deploy New Stack Modal */}
      {isDeployOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDeployOpen(false)} />
          <div className={`relative w-full max-w-lg rounded-2xl p-6 ${glass} space-y-4`}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-base text-foreground">Deploy New Stack</h3>
              <button onClick={() => setIsDeployOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleDeploySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Stack Name</label>
                <input
                  type="text"
                  placeholder="e.g. cloud-stack"
                  value={stackNameInput}
                  onChange={(e) => setStackNameInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-input/50 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">docker-compose.yml</label>
                <textarea
                  rows={8}
                  placeholder={`version: '3.8'\nservices:\n  app:\n    image: nginx:latest\n    ports:\n      - "8080:80"`}
                  value={newComposeContent}
                  onChange={(e) => setNewComposeContent(e.target.value)}
                  className="w-full p-3 font-mono text-xs bg-input/50 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsDeployOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-border text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Deploy Stack
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}