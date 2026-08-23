import React, { createContext, useCallback, useContext, useRef, useState } from "react"
import { AlertTriangle, HelpCircle } from "lucide-react"

const ConfirmContext = createContext(null)

const glass = "border border-white/10 bg-card/95 backdrop-blur-2xl shadow-2xl"

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const resolverRef = useRef(null)

  const confirm = useCallback((options) => {
    const opts = typeof options === "string" ? { message: options } : options
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setDialog({
        title: opts.title || (opts.danger ? "Are you sure?" : "Confirm"),
        message: opts.message,
        confirmLabel: opts.confirmLabel || (opts.danger ? "Delete" : "Confirm"),
        cancelLabel: opts.cancelLabel || "Cancel",
        danger: Boolean(opts.danger),
      })
    })
  }, [])

  const settle = (result) => {
    setDialog(null)
    if (resolverRef.current) {
      resolverRef.current(result)
      resolverRef.current = null
    }
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => settle(false)} />
          <div className={`relative w-full max-w-sm rounded-2xl p-6 ${glass}`}>
            <div className="flex items-start gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  dialog.danger ? "bg-rose-500/15 text-rose-400" : "bg-primary/15 text-primary"
                }`}
              >
                {dialog.danger ? <AlertTriangle className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
              </span>
              <div className="min-w-0 pt-1">
                <h3 className="text-base font-semibold text-foreground">{dialog.title}</h3>
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{dialog.message}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => settle(false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              >
                {dialog.cancelLabel}
              </button>
              <button
                onClick={() => settle(true)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                  dialog.danger
                    ? "bg-rose-500/90 text-white hover:bg-rose-500"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider")
  }
  return ctx
}
