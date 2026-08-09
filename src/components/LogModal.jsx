import React, { useEffect, useState } from "react";
import { Terminal, X, RefreshCw, Loader2 } from "lucide-react";

const glass = "border border-white/10 bg-card/90 backdrop-blur-2xl shadow-2xl";

export function LogModal({ container, onClose }) {
  const [logs, setLogs] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    if (!container) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/containers/${container.id}/logs`);
      const text = await res.text();
      setLogs(text);
    } catch (err) {
      setLogs("Error connecting to server to retrieve logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [container]);

  if (!container) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className={`flex h-[80vh] w-full max-w-4xl flex-col rounded-2xl ${glass}`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">{container.name} — Logs</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
              title="Refresh Logs"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Logs Output */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed text-emerald-400/90 bg-black/60 rounded-b-2xl">
          {loading ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading container output...
            </div>
          ) : (
            <pre className="whitespace-pre-wrap break-all">{logs || "No logs available."}</pre>
          )}
        </div>
      </div>
    </div>
  );
}