import { state, resetDemoState, getFakeTelemetry, getFakeProcesses, getFakeLogs, seedComposeFor } from "./demoData"

// Wraps a plain value as something that looks like a fetch() Response —
// same .ok / .status / .json() / .text() shape callers already expect,
// so every existing authFetch() call site works completely unmodified.
function mockResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  }
}

function delay(ms = 220 + Math.random() * 180) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toContainerShape(s) {
  return {
    id: s.id,
    containerName: s.containerName,
    name: s.name,
    stack: s.stack,
    labels: {},
    status: s.online ? "online" : "offline",
    online: s.online,
    state: s.online ? "running" : "exited",
    category: s.category,
    icon: s.icon,
    port: s.port,
    url: `#`,
    image: s.image,
    ports: [],
    isCustom: s.isCustom,
    hidden: s.hidden,
    is_favorite: s.isFavorite,
    favorite: s.isFavorite,
  }
}

function buildStacksPayload() {
  const groups = {}
  for (const s of state.services) {
    if (!groups[s.stack]) groups[s.stack] = { name: s.stack, containers: [], status: "stopped" }
    groups[s.stack].containers.push({
      id: s.id,
      name: s.containerName,
      state: s.online ? "running" : "exited",
      image: s.image,
    })
  }
  Object.values(groups).forEach((g) => {
    if (g.containers.some((c) => c.state === "running")) g.status = "running"
  })
  return Object.values(groups)
}

// Routes a (method, path) pair to a handler. Path patterns use simple
// colon-params, matched against the URL's pathname only (query strings and
// the leading /api are stripped by the caller).
const routes = [
  {
    method: "POST",
    pattern: /^\/register$/,
    handler: async () => {
      await delay()
      return mockResponse(201, {
        token: "demo-token",
        user: { id: "demo-admin", username: "demo-admin", role: "Admin" },
      })
    },
  },
  {
    method: "GET",
    pattern: /^\/setup-status$/,
    handler: async () => mockResponse(200, { setupRequired: false }),
  },
  {
    method: "POST",
    pattern: /^\/login$/,
    handler: async () => {
      // Demo mode accepts anything — the point is to remove friction, not
      // to test the real auth flow.
      await delay()
      return mockResponse(200, {
        token: "demo-token",
        user: { id: "demo-admin", username: "demo-admin", role: "Admin" },
      })
    },
  },

  {
    method: "GET",
    pattern: /^\/(containers|services)$/,
    handler: async () => {
      await delay()
      const visible = state.services.filter((s) => !s.hidden)
      return mockResponse(200, {
        services: visible.map(toContainerShape),
        totalContainers: visible.length,
        onlineCount: visible.filter((s) => s.online).length,
      })
    },
  },
  {
    method: "GET",
    pattern: /^\/services\/hidden$/,
    handler: async () => {
      await delay()
      return mockResponse(200, { services: state.services.filter((s) => s.hidden).map(toContainerShape) })
    },
  },
  {
    method: "POST",
    pattern: /^\/services$/,
    handler: async (m, body) => {
      await delay()
      const svc = {
        id: `demo-custom-${Date.now()}`,
        containerName: body.name || "custom-service",
        name: body.name || "Custom Service",
        stack: "standalone",
        category: body.category || "Infra",
        icon: body.icon || "container",
        port: body.port || null,
        image: "custom",
        online: true,
        hidden: false,
        isCustom: true,
        isFavorite: false,
      }
      state.services.push(svc)
      return mockResponse(201, toContainerShape(svc))
    },
  },
  {
    method: "PUT",
    pattern: /^\/services\/([^/]+)$/,
    handler: async (m, body) => {
      await delay()
      const svc = state.services.find((s) => s.id === m[1])
      if (!svc) return mockResponse(404, { error: "Not found" })
      if ("hidden" in body) svc.hidden = body.hidden
      if ("is_favorite" in body || "favorite" in body) svc.isFavorite = Boolean(body.is_favorite || body.favorite)
      if (body.name) svc.name = body.name
      if (body.category) svc.category = body.category
      if (body.icon) svc.icon = body.icon
      return mockResponse(200, { success: true, service: toContainerShape(svc) })
    },
  },
  {
    method: "DELETE",
    pattern: /^\/services\/([^/]+)$/,
    handler: async (m) => {
      await delay()
      const svc = state.services.find((s) => s.id === m[1])
      if (svc && !svc.isCustom) {
        svc.hidden = true
        return mockResponse(200, { success: true, hidden: true })
      }
      state.services = state.services.filter((s) => s.id !== m[1])
      return mockResponse(200, { success: true, deleted: true })
    },
  },

  {
    method: "POST",
    pattern: /^\/containers\/([^/]+)\/(start|stop|restart)$/,
    handler: async (m) => {
      await delay(400)
      const svc = state.services.find((s) => s.id === m[1])
      if (svc) svc.online = m[2] !== "stop"
      return mockResponse(200, { success: true })
    },
  },
  {
    method: "GET",
    pattern: /^\/containers\/([^/]+)\/logs$/,
    handler: async (m) => {
      await delay()
      const svc = state.services.find((s) => s.id === m[1])
      return mockResponse(200, getFakeLogs(svc?.containerName || "container"))
    },
  },

  {
    method: "GET",
    pattern: /^\/telemetry$/,
    handler: async () => mockResponse(200, getFakeTelemetry()),
  },
  {
    method: "GET",
    pattern: /^\/telemetry\/processes$/,
    handler: async () => {
      await delay()
      return mockResponse(200, { processes: getFakeProcesses() })
    },
  },
  {
    method: "GET",
    pattern: /^\/services-telemetry$/,
    handler: async () => mockResponse(200, {
      ytdl: { label: "Lidarr YT Downloader", detail: "3 tracks queued", status: "online" },
      frigate: { label: "Frigate", detail: "4 cameras · 2 recording", status: "online" },
    }),
  },
  {
    method: "GET",
    pattern: /^\/tailscale$/,
    handler: async () => mockResponse(200, { connected: true, devicesCount: 4, tailnet: "demo-tailnet.ts.net" }),
  },
  {
    method: "GET",
    pattern: /^\/storage$/,
    handler: async () => mockResponse(200, {
      usedFormatted: "1.8 TB",
      totalFormatted: "4.0 TB",
      percentage: 45,
      driveCount: 2,
      drives: [
        { name: "/mnt/storage", used: 1.2, total: 2.0 },
        { name: "/mnt/backup", used: 0.6, total: 2.0 },
      ],
    }),
  },

  {
    method: "GET",
    pattern: /^\/settings$/,
    handler: async () => mockResponse(200, state.settings),
  },
  {
    method: "PUT",
    pattern: /^\/settings$/,
    handler: async (m, body) => {
      state.settings = { ...state.settings, ...body }
      return mockResponse(200, { success: true, settings: state.settings })
    },
  },

  {
    method: "GET",
    pattern: /^\/users$/,
    handler: async () => mockResponse(200, state.users),
  },
  {
    method: "POST",
    pattern: /^\/users$/,
    handler: async (m, body) => {
      if (!body.password || body.password.length < 8) {
        return mockResponse(400, { message: "Password must be at least 8 characters" })
      }
      const u = { id: `demo-user-${Date.now()}`, username: body.username, role: body.role || "Viewer" }
      state.users.push(u)
      return mockResponse(201, u)
    },
  },
  {
    method: "PUT",
    pattern: /^\/users\/([^/]+)\/password$/,
    handler: async (m, body) => {
      if (!body.newPassword || body.newPassword.length < 8) {
        return mockResponse(400, { message: "New password must be at least 8 characters" })
      }
      return mockResponse(200, { message: "Password updated (demo — not actually stored)." })
    },
  },
  {
    method: "DELETE",
    pattern: /^\/users\/([^/]+)$/,
    handler: async (m) => {
      const target = state.users.find((u) => u.id === m[1])
      const adminCount = state.users.filter((u) => u.role === "Admin").length
      if (target?.role === "Admin" && adminCount <= 1) {
        return mockResponse(403, { message: "Cannot delete the last remaining Admin account" })
      }
      state.users = state.users.filter((u) => u.id !== m[1])
      return mockResponse(200, { message: "User deleted" })
    },
  },

  {
    method: "GET",
    pattern: /^\/stacks$/,
    handler: async () => {
      await delay()
      return mockResponse(200, buildStacksPayload())
    },
  },
  {
    method: "GET",
    pattern: /^\/stacks\/([^/]+)\/compose$/,
    handler: async (m) => {
      await delay()
      return mockResponse(200, { name: m[1], composeContent: seedComposeFor(m[1]), source: "demo" })
    },
  },
  {
    method: "POST",
    pattern: /^\/stacks$/,
    handler: async () => {
      await delay(500)
      return mockResponse(200, { success: true, stdout: "(demo) stack deployed", stderr: "" })
    },
  },
  {
    method: "POST",
    pattern: /^\/stacks\/([^/]+)\/down$/,
    handler: async (m) => {
      await delay(400)
      state.services.filter((s) => s.stack === m[1]).forEach((s) => (s.online = false))
      return mockResponse(200, { success: true })
    },
  },
]

export async function mockFetch(url, options = {}) {
  const method = (options.method || "GET").toUpperCase()
  const path = url.replace(/^\/api/, "").split("?")[0]

  let body = {}
  if (options.body) {
    try {
      body = JSON.parse(options.body)
    } catch {
      body = {}
    }
  }

  for (const route of routes) {
    if (route.method !== method) continue
    const match = path.match(route.pattern)
    if (match) {
      return route.handler(match, body)
    }
  }

  return mockResponse(404, { error: "Not found in demo mode", path })
}

export { resetDemoState }
