// Demo-mode dataset. Nothing here talks to a real Docker daemon or
// filesystem — it's all in-memory, seeded once per page load, and mutated
// directly by mockApi.js so the demo actually feels interactive (starting
// or stopping a "container" really does flip its state for the rest of the
// session) without needing any backend at all. Resets on refresh, which is
// the expected behavior for a stateless static-hosted demo.

function seedServices() {
  return [
    { id: "demo-immich", containerName: "immich-server", name: "Immich", stack: "media-stack", category: "Media", icon: "camera", port: 2283, image: "ghcr.io/immich-app/immich-server:release", online: true, hidden: false, isCustom: false, isFavorite: true },
    { id: "demo-navidrome", containerName: "navidrome", name: "Navidrome", stack: "media-stack", category: "Media", icon: "music", port: 4533, image: "deluan/navidrome:latest", online: true, hidden: false, isCustom: false, isFavorite: true },
    { id: "demo-frigate", containerName: "frigate", name: "Frigate", stack: "media-stack", category: "Media", icon: "video", port: 5000, image: "ghcr.io/blakeblackshear/frigate:stable", online: true, hidden: false, isCustom: false, isFavorite: false },
    { id: "demo-prowlarr", containerName: "prowlarr", name: "Prowlarr", stack: "media-stack", category: "Media", icon: "search", port: 9696, image: "lscr.io/linuxserver/prowlarr:latest", online: false, hidden: false, isCustom: false, isFavorite: false },
    { id: "demo-lidarr", containerName: "lidarr", name: "Lidarr", stack: "media-stack", category: "Media", icon: "disc", port: 8686, image: "lscr.io/linuxserver/lidarr:latest", online: true, hidden: false, isCustom: false, isFavorite: false },

    { id: "demo-home-assistant", containerName: "home-assistant", name: "Home Assistant", stack: "automation-stack", category: "Automation", icon: "home", port: 8123, image: "ghcr.io/home-assistant/home-assistant:stable", online: true, hidden: false, isCustom: false, isFavorite: true },
    { id: "demo-n8n", containerName: "n8n", name: "n8n", stack: "automation-stack", category: "Automation", icon: "workflow", port: 5678, image: "n8nio/n8n:latest", online: true, hidden: false, isCustom: false, isFavorite: false },

    { id: "demo-open-webui", containerName: "open-webui", name: "Open WebUI", stack: "ai-stack", category: "AI", icon: "bot", port: 8080, image: "ghcr.io/open-webui/open-webui:main", online: true, hidden: false, isCustom: false, isFavorite: true },
    { id: "demo-searxng", containerName: "searxng", name: "SearXNG", stack: "ai-stack", category: "AI", icon: "search", port: 8081, image: "searxng/searxng:latest", online: true, hidden: false, isCustom: false, isFavorite: false },

    { id: "demo-portainer", containerName: "portainer", name: "Portainer", stack: "infra-stack", category: "Infra", icon: "container", port: 9000, image: "portainer/portainer-ce:latest", online: true, hidden: false, isCustom: false, isFavorite: false },
    { id: "demo-adguard", containerName: "adguard-home", name: "AdGuard Home", stack: "infra-stack", category: "Network", icon: "shield", port: 3000, image: "adguard/adguardhome:latest", online: true, hidden: false, isCustom: false, isFavorite: true },
    { id: "demo-qbittorrent", containerName: "qbittorrent", name: "qBittorrent", stack: "standalone", category: "Media", icon: "download", port: 8090, image: "lscr.io/linuxserver/qbittorrent:latest", online: true, hidden: false, isCustom: false, isFavorite: false },
    { id: "demo-nextcloud", containerName: "nextcloud", name: "Nextcloud", stack: "standalone", category: "Infra", icon: "cloud", port: 8443, image: "nextcloud:latest", online: false, hidden: false, isCustom: false, isFavorite: false },
  ]
}

function seedUsers() {
  return [
    { id: "demo-admin", username: "demo-admin", role: "Admin" },
    { id: "demo-viewer", username: "demo-viewer", role: "Viewer" },
  ]
}

function seedSettings() {
  return {
    categories: ["AI", "Media", "Infra", "Network", "Automation"],
    compact: false,
    amoled: false,
    theme: "default",
    refresh: 10,
  }
}

function seedComposeFor(stackName) {
  const bySt = state.services.filter((s) => s.stack === stackName)
  let yml = "services:\n"
  for (const s of bySt) {
    yml += `  ${s.containerName}:\n    image: ${s.image}\n    restart: unless-stopped\n    ports:\n      - "${s.port}:${s.port}"\n\n`
  }
  return yml.trimEnd() + "\n"
}

export const state = {
  services: seedServices(),
  users: seedUsers(),
  settings: seedSettings(),
  bootTime: Date.now(),
}

export function resetDemoState() {
  state.services = seedServices()
  state.users = seedUsers()
  state.settings = seedSettings()
  state.bootTime = Date.now()
}

// Smooth, believable-looking wandering values instead of pure random jumps,
// so the live charts in the demo actually look like a real running system.
let cpuWalk = 22
let netDownWalk = 180
let netUpWalk = 40

function wander(value, min, max, step) {
  const next = value + (Math.random() - 0.5) * step
  return Math.max(min, Math.min(max, next))
}

export function getFakeTelemetry() {
  cpuWalk = wander(cpuWalk, 8, 65, 10)
  netDownWalk = wander(netDownWalk, 20, 900, 250)
  netUpWalk = wander(netUpWalk, 5, 300, 80)

  const totalMemGB = 16
  const usedMemGB = parseFloat((5.5 + (cpuWalk / 100) * 3).toFixed(1))
  const freeMemGB = parseFloat((totalMemGB - usedMemGB).toFixed(1))

  return {
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    cpuLoad: Math.round(cpuWalk),
    ram: [
      { name: "Used RAM", value: usedMemGB, fill: "#a855f7" },
      { name: "Free RAM", value: freeMemGB, fill: "#22c55e" },
    ],
    net: { down: Math.round(netDownWalk), up: Math.round(netUpWalk) },
    totalMemGB,
    usedMemGB,
    freeMemGB,
  }
}

export function getFakeProcesses() {
  return state.services
    .filter((s) => s.online)
    .map((s) => ({
      id: s.id,
      name: s.containerName,
      pid: s.id.slice(-8),
      cpu: parseFloat((Math.random() * 18).toFixed(1)),
      mem: `${Math.round(80 + Math.random() * 900)} MB`,
      memValue: Math.round(80 + Math.random() * 900),
      status: "running",
    }))
    .sort((a, b) => b.cpu - a.cpu)
}

export function getFakeLogs(containerName) {
  const lines = [
    `[info] ${containerName} starting up...`,
    `[info] Listening on 0.0.0.0`,
    `[info] Connected to database`,
    `[info] Health check passed`,
    `[info] Handling request GET /api/status -> 200 OK`,
    `[warn] Slow query detected (412ms)`,
    `[info] Handling request GET /api/status -> 200 OK`,
    `[info] Background job completed`,
  ]
  return lines.join("\n")
}

export { seedComposeFor }
