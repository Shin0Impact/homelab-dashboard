import express from "express";
import crypto from "crypto";
import { docker, inferCategoryAndIcon } from "../helpers/dockerUtils.js";
import { getCustomServices, saveCustomServices } from "../helpers/storage.js";
import { WELL_KNOWN_PORTS } from "../config/constants.js";
import { authenticateToken, requireAdmin } from "./auth.js";

const router = express.Router();

// Builds the full service list (container-backed + pure custom), with every
// entry's real `hidden` flag — unfiltered. Route handlers below decide what
// to actually expose from this.
async function buildAllServices(req) {
  const rawContainers = await docker.listContainers({ all: true });
  const customOverrides = getCustomServices();

  const hostHeader = req.headers.host || req.hostname;
  const clientHost = hostHeader.split(":")[0];

  const containerServices = rawContainers.map((container) => {
    const rawName = container.Names[0]
      ? container.Names[0].replace("/", "")
      : "unnamed";

    const cleanName = rawName.toLowerCase();
    const meta = inferCategoryAndIcon(rawName, container.Image || "");

    const stackName =
      container.Labels?.["com.docker.compose.project"] || "standalone";

    const custom =
      customOverrides.find(
        (c) => c.id === container.Id || c.containerName === rawName,
      ) || {};

    let detectedPort = null;

    if (Array.isArray(container.Ports) && container.Ports.length > 0) {
      const boundPort = container.Ports.find(
        (p) => p.PublicPort && p.PublicPort > 0,
      );
      if (boundPort) {
        detectedPort = boundPort.PublicPort;
      } else {
        const firstPrivate = container.Ports.find((p) => p.PrivatePort);
        if (firstPrivate) detectedPort = firstPrivate.PrivatePort;
      }
    }

    if (!detectedPort) {
      for (const [key, knownPort] of Object.entries(WELL_KNOWN_PORTS)) {
        if (cleanName.includes(key)) {
          detectedPort = knownPort;
          break;
        }
      }
    }

    const isInternalBackend =
      cleanName.includes("cron") ||
      cleanName.includes("redis") ||
      cleanName.includes("postgres") ||
      cleanName.includes("db-") ||
      cleanName.includes("machine_learning") ||
      cleanName.includes("watchtower");

    let finalUrl = null;
    if (custom.url) {
      finalUrl = custom.url;
    } else if (detectedPort && !isInternalBackend) {
      finalUrl = `http://${clientHost}:${detectedPort}`;
    }

    return {
      id: container.Id,
      containerName: rawName,
      name: custom.name || rawName,
      stack: stackName,
      labels: container.Labels || {},
      status: container.State === "running" ? "online" : "offline",
      online: container.State === "running",
      state: container.State,
      category: custom.category || meta.category,
      icon: custom.icon || meta.icon,
      iconUrl: custom.iconUrl || meta.iconUrl,
      port: isInternalBackend ? null : detectedPort,
      url: finalUrl,
      image: container.Image,
      ports: container.Ports,
      isCustom: false,
      hidden: custom.hidden || false,
    };
  });

  const standaloneCustom = customOverrides
    .filter(
      (c) =>
        c.isCustom &&
        !containerServices.some(
          (cs) => cs.id === c.id || cs.containerName === c.containerName,
        ),
    )
    .map((c) => ({ ...c, hidden: c.hidden || false }));

  return [...containerServices, ...standaloneCustom];
}

// Reads: any logged-in user (Admin or Viewer) can see what's running.
// Hidden services are left out of the normal list entirely — that's what
// "hidden" means — and out of the counts, so the stat cards match what's
// actually shown.
router.get("/containers", authenticateToken, handleGetServices);
router.get("/services", authenticateToken, handleGetServices);

async function handleGetServices(req, res) {
  res.setHeader("Content-Type", "application/json");
  try {
    const all = await buildAllServices(req);
    const visible = all.filter((s) => !s.hidden);

    res.json({
      services: visible,
      totalContainers: visible.length,
      onlineCount: visible.filter((s) => s.online).length,
    });
  } catch (err) {
    console.error("Error fetching containers:", err);
    res
      .status(500)
      .json({ error: "Failed to list containers", details: err.message });
  }
}

// The flip side of hiding: lets the UI show what's hidden and offer to
// bring it back. Admin-only, since hiding/unhiding is an Admin action.
router.get("/services/hidden", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const all = await buildAllServices(req);
    res.json({ services: all.filter((s) => s.hidden) });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to list hidden services", details: err.message });
  }
});

// Writes: registering, editing, or removing a service entry is an
// infrastructure change, so it's Admin-only, same as container start/stop.
router.post("/services", authenticateToken, requireAdmin, (req, res) => {
  try {
    const custom = getCustomServices();
    const newService = {
      id: req.body.id || `custom-${crypto.randomUUID()}`,
      isCustom: true,
      online: true,
      hidden: false,
      ...req.body,
    };

    custom.push(newService);
    saveCustomServices(custom);
    res.status(201).json(newService);
  } catch (err) {
    res.status(500).json({ error: "Failed to create service" });
  }
});

router.put("/services/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    let custom = getCustomServices();
    const { id } = req.params;

    let containerName = req.body.containerName || "";
    if (!containerName) {
      try {
        const rawContainers = await docker.listContainers({ all: true });
        const match = rawContainers.find((c) => c.Id === id);
        if (match && match.Names[0]) {
          containerName = match.Names[0].replace("/", "");
        }
      } catch (e) {}
    }

    const existingIndex = custom.findIndex(
      (s) =>
        s.id === id || (containerName && s.containerName === containerName),
    );

    const updatedData = { id, containerName, ...req.body };

    if (existingIndex > -1) {
      custom[existingIndex] = { ...custom[existingIndex], ...updatedData };
    } else {
      custom.push(updatedData);
    }

    saveCustomServices(custom);
    res.json({ success: true, service: updatedData });
  } catch (err) {
    res.status(500).json({ error: "Failed to update service" });
  }
});

// "Delete" means two different things depending on what this actually is:
//  - A service Homelab OS discovered from a real, still-running container:
//    we have no business destroying that container. This just hides it
//    from the dashboard (flips `hidden: true` on its override entry) —
//    reversible from the Hidden Services list.
//  - A purely custom entry with no backing container (added via "Add
//    Service"): there's nothing to preserve, so this actually removes it.
// Previously this always just filtered the override entry out, which for a
// discovered service either did nothing (if it had never been customized)
// or silently stripped its customization — the container, and the card
// on the dashboard, both stayed exactly as they were either way.
router.delete("/services/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    let stillHasContainer = false;
    try {
      const rawContainers = await docker.listContainers({ all: true });
      stillHasContainer = rawContainers.some((c) => c.Id === id);
    } catch (e) {
      console.error("Failed to check container existence before delete:", e);
    }

    let custom = getCustomServices();

    if (stillHasContainer) {
      const existingIndex = custom.findIndex((s) => s.id === id);
      if (existingIndex > -1) {
        custom[existingIndex] = { ...custom[existingIndex], id, hidden: true };
      } else {
        custom.push({ id, hidden: true });
      }
      saveCustomServices(custom);
      return res.json({ success: true, hidden: true });
    }

    custom = custom.filter((s) => s.id !== id);
    saveCustomServices(custom);
    res.json({ success: true, deleted: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete service" });
  }
});

// Starting/stopping/restarting a container is a real infrastructure action —
// previously this had NO auth check at all, so anyone who could reach the
// API could control any container on the host. Admin-only now.
router.post(
  "/containers/:id/:action",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const { id, action } = req.params;
    try {
      const container = docker.getContainer(id);
      if (action === "start") await container.start();
      else if (action === "stop") await container.stop();
      else if (action === "restart") await container.restart();
      else return res.status(400).json({ error: "Invalid action" });

      res.json({ success: true });
    } catch (err) {
      res
        .status(500)
        .json({ error: `Failed to ${action} container`, details: err.message });
    }
  },
);

// Container logs — the frontend's LogModal already called this endpoint,
// but it never existed on the backend, so the log viewer was silently
// broken. Any logged-in user can view logs (matches read access elsewhere).
router.get(
  "/containers/:id/logs",
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;
    try {
      const container = docker.getContainer(id);
      const rawLogs = await container.logs({
        stdout: true,
        stderr: true,
        tail: 500,
        timestamps: false,
      });
      res.type("text/plain").send(demuxDockerLogBuffer(rawLogs));
    } catch (err) {
      res
        .status(500)
        .json({ error: "Failed to fetch container logs", details: err.message });
    }
  },
);

// Docker multiplexes stdout/stderr into one stream with an 8-byte header per
// frame (when the container wasn't created with a TTY), so a raw buffer
// isn't readable text on its own — strip the framing.
function demuxDockerLogBuffer(buffer) {
  let result = "";
  let offset = 0;
  while (offset + 8 <= buffer.length) {
    const frameSize = buffer.readUInt32BE(offset + 4);
    const start = offset + 8;
    const end = start + frameSize;
    if (end > buffer.length) break;
    result += buffer.toString("utf-8", start, end);
    offset = end;
  }
  return result || buffer.toString("utf-8");
}

export default router;
