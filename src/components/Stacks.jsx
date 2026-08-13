import React, { useState } from "react"
import { Layers, Play, Square, FileCode, Plus, Search, AlertCircle, X } from "lucide-react"

const glassStyle = "backdrop-blur-md bg-zinc-900/40 border border-white/10 shadow-2xl"

export function Stacks({ services = [], onRefresh, onDeployStack }) {
  const [search, setSearch] = useState("")
  const [selectedStack, setSelectedStack] = useState(null)
  
  // Deploy / Add Stack Modal State
  const [isDeployOpen, setIsDeployOpen] = useState(false)
  const [stackNameInput, setStackNameInput] = useState("")
  const [composeContent, setComposeContent] = useState("")

  const safeServices = Array.isArray(services) ? services : []

  // Group individual containers by their Docker Compose project/stack label if available,
  // or fall back to grouping common service prefixes.
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

  const handleDeploySubmit = (e) => {
    e.preventDefault()
    if (!stackNameInput.trim()) return

    if (onDeployStack) {
      onDeployStack({
        name: stackNameInput.trim(),
        compose: composeContent,
      })
    }

    setStackNameInput("")
    setComposeContent("")
    setIsDeployOpen(false)
  }

  return (
    <div className="min-h-full w-full p-6 space-y-6 text-zinc-100">
      {/* Header Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Docker Stacks</h2>
          <p className="text-xs text-zinc-400">Manage stack deployments and Compose environments</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search stacks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-zinc-900/60 border border-white/10 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>
          <button
            onClick={() => setIsDeployOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-xl text-xs font-semibold transition-colors shrink-0"
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
            <div key={stack.name} className={`p-5 rounded-2xl ${glassStyle} space-y-4`}>
              {/* Stack Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base capitalize">{stack.name}</h3>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isHealthy
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isHealthy ? "bg-emerald-400" : "bg-amber-400"
                          }`}
                        />
                        {runningContainers} / {totalContainers} Running
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Stack contain {totalContainers} service container{totalContainers > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Stack Action Controls */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => setSelectedStack(stack.name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50 transition-colors"
                  >
                    <FileCode className="h-3.5 w-3.5" /> Compose File
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors">
                    <Play className="h-3.5 w-3.5 fill-current" /> Deploy
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors">
                    <Square className="h-3.5 w-3.5 fill-current" /> Down
                  </button>
                </div>
              </div>

              {/* Stack Services List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {stack.containers.map((c) => {
                  const isOnline = c.status === "online" || c.state === "running"
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-black/20 border border-white/5 text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-medium text-zinc-200 truncate">{c.name || c.containerName}</p>
                        <p className="font-mono text-[10px] text-zinc-500 truncate">{c.image}</p>
                      </div>
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          isOnline ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" : "bg-rose-500"
                        }`}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {filteredStacks.length === 0 && (
          <div className={`p-8 text-center text-sm text-zinc-400 rounded-2xl flex flex-col items-center gap-2 ${glassStyle}`}>
            <AlertCircle className="h-6 w-6 text-zinc-500" />
            <p>No Docker stacks found.</p>
          </div>
        )}
      </div>

      {/* Deploy New Stack Modal */}
      {isDeployOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsDeployOpen(false)}
          />
          <div className={`relative w-full max-w-lg rounded-2xl p-6 ${glassStyle} space-y-4`}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-base">Deploy New Stack</h3>
              </div>
              <button
                onClick={() => setIsDeployOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleDeploySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Stack Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. monitoring-stack"
                  value={stackNameInput}
                  onChange={(e) => setStackNameInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-black/40 border border-white/10 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  docker-compose.yml Content
                </label>
                <textarea
                  rows={8}
                  placeholder={`version: '3.8'\nservices:\n  app:\n    image: nginx:latest\n    ports:\n      - "8080:80"`}
                  value={composeContent}
                  onChange={(e) => setComposeContent(e.target.value)}
                  className="w-full p-3 font-mono text-xs bg-black/60 border border-white/10 rounded-xl text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsDeployOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-white/10 text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Deploy Stack
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Compose Viewer Modal */}
      {selectedStack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedStack(null)}
          />
          <div className={`relative w-full max-w-2xl rounded-2xl p-6 ${glassStyle} space-y-4`}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-base capitalize">{selectedStack} — docker-compose.yml</h3>
              </div>
              <button
                onClick={() => setSelectedStack(null)}
                className="text-zinc-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-black/80 font-mono text-xs text-emerald-400 overflow-x-auto max-h-96">
{`version: '3.8'
services:
  ${selectedStack}:
    image: ${stacksMap[selectedStack]?.containers[0]?.image || "custom/image:latest"}
    restart: unless-stopped
    ports:
      - "${stacksMap[selectedStack]?.containers[0]?.port || 8080}:${stacksMap[selectedStack]?.containers[0]?.port || 8080}"
    environment:
      - NODE_ENV=production`}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}