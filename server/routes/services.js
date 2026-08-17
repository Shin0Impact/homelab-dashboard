import express from "express";
import { docker, inferCategoryAndIcon } from "../helpers/dockerUtils.js";
import { getCustomServices, saveCustomServices } from "../helpers/storage.js";
import { WELL_KNOWN_PORTS } from "../config/constants.js";

const router = express.Router();

router.get("/containers", handleGetServices);
router.get("/services", handleGetServices);

async function handleGetServices(req, res) {
  res.setHeader("Content-Type", "application/json");

  try {
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
        hidden: custom.hidden || false,
      };
    });

    const standaloneCustom = customOverrides.filter(
      (c) =>
        c.isCustom &&
        !containerServices.some(
          (cs) => cs.id === c.id || cs.containerName === c.containerName,
        ),
    );

    const services = [...containerServices, ...standaloneCustom];

    res.json({
      services,
      totalContainers: services.length,
      onlineCount: services.filter((s) => s.online).length,
    });
  } catch (err) {
    console.error("Error fetching containers:", err);
    res
      .status(500)
      .json({ error: "Failed to list containers", details: err.message });
  }
}

router.post("/services", (req, res) => {
  try {
    const custom = getCustomServices();
    const newService = {
      id: req.body.id || `custom-${Date.now()}`,
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

router.put("/services/:id", async (req, res) => {
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

router.delete("/services/:id", (req, res) => {
  try {
    const { id } = req.params;
    let custom = getCustomServices();
    custom = custom.filter((s) => s.id !== id);
    saveCustomServices(custom);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete service" });
  }
});

router.post("/containers/:id/:action", async (req, res) => {
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
});

export default router;
