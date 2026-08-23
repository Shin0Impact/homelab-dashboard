import React, { createContext, useCallback, useContext, useRef, useState } from "react"
import { CheckCircle2, XCircle, Info, X } from "lucide-react"

const ToastContext = createContext(null)

const VARIANTS = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-emerald-400",
    ringClass: "ring-emerald-500/20",
  },
  error: {
    icon: XCircle,
    iconClass: "text-rose-400",
    ringClass: "ring-rose-500/20",
  },
  info: {
    icon: Info,
    iconClass: "text-primary",
    ringClass: "ring-primary/20",
  },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (message, variant = "info", duration = 4500) => {
      const id = ++idRef.current
      setToasts((prev) => [...prev, { id, message, variant }])
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration)
      }
      return id
    },
    [dismiss],
  )

  const toast = {
    success: (message, duration) => push(message, "success", duration),
    error: (message, duration) => push(message, "error", duration),
    info: (message, duration) => push(message, "info", duration),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6">
        {toasts.map((t) => {
          const { icon: Icon, iconClass, ringClass } = VARIANTS[t.variant] || VARIANTS.info
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex w-full max-w-sm animate-[toast-in_0.2s_ease-out] items-start gap-3 rounded-xl border border-white/10 bg-card/95 p-3.5 shadow-2xl ring-1 backdrop-blur-2xl ${ringClass}`}
            >
              <Icon className={`h-5 w-5 shrink-0 ${iconClass}`} />
              <p className="flex-1 text-sm leading-snug text-foreground">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return ctx
}
