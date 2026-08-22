import React from "react"
import { ExternalLink, Play, Square, Loader2, RefreshCw } from "lucide-react"
import { CategoryTag, ServiceIcon, StatusDot, glass } from "../UIHelpers"
import { getLaunchUrl } from "../../lib/utils"

export function ServiceCard({ service, isCompact, isOnline, isLoading, onToggle, onRefresh, isAdmin = true }) {
  const computedUrl = getLaunchUrl(service)

  return (
    <div
      className={`flex flex-col justify-between rounded-2xl transition-all hover:bg-secondary/20 ${
        isCompact ? "p-3" : "p-4"
      } ${glass}`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className={`flex items-center justify-center rounded-xl bg-secondary/80 ring-1 ring-white/5 ${
            isCompact ? "h-9 w-9" : "h-11 w-11"
          }`}>
            <ServiceIcon service={service} className={isCompact ? "h-5 w-5" : "h-6 w-6"} />
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-secondary/50 px-2.5 py-0.5">
            <StatusDot online={isOnline} />
            <span className="text-[11px] font-medium">
              {isOnline ? "Running" : "Exited"}
            </span>
          </div>
        </div>

        <div className={isCompact ? "mt-2" : "mt-3"}>
          <h3 className={`truncate font-semibold ${isCompact ? "text-sm" : "text-base"}`}>{service.name}</h3>
          <div className="mt-1 flex items-center gap-2">
            <CategoryTag category={service.category} />
            <span className="truncate font-mono text-[11px] text-muted-foreground">
              {service.image || (service.port ? `:${service.port}` : "")}
            </span>
          </div>
        </div>
      </div>

      <div className={`flex items-center justify-between gap-2 border-t border-white/5 ${
        isCompact ? "mt-3 pt-2" : "mt-4 pt-3"
      }`}>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onToggle(service)}
            disabled={isLoading || !isAdmin}
            title={!isAdmin ? "Admin access required" : isOnline ? "Stop Container" : "Start Container"}
            className={`flex items-center justify-center rounded-lg border transition-colors ${
              isCompact ? "h-8 w-8" : "h-9 w-9"
            } ${
              isOnline
                ? "border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            } ${isLoading || !isAdmin ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isOnline ? (
              <Square className="h-3.5 w-3.5 fill-current" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
          </button>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className={`flex items-center justify-center rounded-lg bg-secondary/40 text-muted-foreground hover:text-foreground ${
                isCompact ? "h-8 w-8" : "h-9 w-9"
              }`}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        </div>

        {computedUrl ? (
          <a
            href={computedUrl}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-2 rounded-xl bg-teal-500/15 font-semibold text-teal-400 transition-colors hover:bg-teal-500/25 ${
              isCompact ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-xs"
            }`}
          >
            Launch
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <button
            disabled
            className={`cursor-not-allowed rounded-xl bg-secondary/30 font-medium text-muted-foreground/50 ${
              isCompact ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-xs"
            }`}
          >
            No Port
          </button>
        )}
      </div>
    </div>
  )
}
