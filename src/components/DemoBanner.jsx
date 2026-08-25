import React from "react"
import { Sparkles, FolderGit2, RotateCcw } from "lucide-react"

export function DemoBanner() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-primary/15 px-3 py-1.5 text-center text-xs text-primary">
      <span className="flex items-center gap-1.5 font-medium">
        <Sparkles className="h-3.5 w-3.5" />
        Demo Mode — you're looking at simulated data, not a real server.
      </span>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-1 underline decoration-primary/40 underline-offset-2 hover:text-foreground"
      >
        <RotateCcw className="h-3 w-3" />
        Reset demo
      </button>
      <a
        href="https://github.com/Shin0Impact/homelab-dashboard"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1 underline decoration-primary/40 underline-offset-2 hover:text-foreground"
      >
        <FolderGit2 className="h-3.5 w-3.5" />
        Get it for your own homelab
      </a>
    </div>
  )
}
