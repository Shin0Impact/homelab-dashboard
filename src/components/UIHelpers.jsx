import React from "react"
import {
  Bot,
  Cctv,
  Clapperboard,
  Container,
  Download,
  Image as ImageIcon,
  Music,
  ScanSearch,
  ShieldCheck,
  Workflow,
} from "lucide-react"

export const ICONS = {
  container: Container,
  image: ImageIcon,
  cctv: Cctv,
  shield: ShieldCheck,
  workflow: Workflow,
  bot: Bot,
  music: Music,
  search: ScanSearch,
  download: Download,
  video: Clapperboard,
}

export const CATEGORY_STYLES = {
  AI: "bg-chart-3/20 text-chart-3 border-chart-3/30",
  Media: "bg-chart-5/20 text-chart-5 border-chart-5/30",
  Infra: "bg-chart-1/20 text-chart-1 border-chart-1/30",
  Network: "bg-chart-2/20 text-chart-2 border-chart-2/30",
  Automation: "bg-chart-4/20 text-chart-4 border-chart-4/30",
}

export const glass =
  "border border-white/5 bg-card/60 backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]"

export function StatusDot({ online }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {online && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-chart-2/70 opacity-75" />
      )}
      <span
        className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
          online ? "bg-chart-2" : "bg-destructive"
        }`}
      />
    </span>
  )
}

export function CategoryTag({ category }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
        CATEGORY_STYLES[category] || "bg-secondary text-foreground"
      }`}
    >
      {category}
    </span>
  )
}