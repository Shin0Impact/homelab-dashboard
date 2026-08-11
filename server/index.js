import express from "express";
import cors from "cors";
import Docker from "dockerode";
import si from "systeminformation";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3333;

const DATA_FILE = path.resolve(__dirname, "custom_services.json");

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

const getCustomServices = () => {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return [];
  }
};

const saveCustomServices = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

const isWindows = process.platform === "win32";
const docker = new Docker(
  isWindows
    ? { socketPath: "//./pipe/docker_engine" }
    : { socketPath: "/var/run/docker.sock" },
);

app.use(cors());
app.use(express.json());

// Smart Name Cleaner & Icon/Category Inferencer
function inferCategoryAndIcon(rawName, image = "") {
  const fullText = `${rawName} ${image}`.toLowerCase();

  // 1. Lowercase and remove common prefixes (big-bear-, docker-, etc.) and suffixes
  let cleanKey = rawName
    .toLowerCase()
    .replace(/^(big-bear|docker|my|local)[-_]/, "")
    .replace(/[-_](server|app|container|service)$/, "");

  // 2. Strip ALL hyphens and underscores so "searx-ng" -> "searxng" & "home-assistant" -> "homeassistant"
  cleanKey = cleanKey.replace(/[-_]/g, "");

  const dashboardIconBase =
    "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png";

  let category = "Infra";
  let fallbackIcon = "container";

  if (
    fullText.includes("chroma") ||
    fullText.includes("ollama") ||
    fullText.includes("ai")
  ) {
    category = "AI";
    fallbackIcon = "bot";
  } else if (
    fullText.includes("navidrome") ||
    fullText.includes("lidarr") ||
    fullText.includes("deemix") ||
    fullText.includes("plex") ||
    fullText.includes("jellyfin")
  ) {
    category = "Media";
    fallbackIcon = "music";
  } else if (
    fullText.includes("searx") ||
    fullText.includes("ntfy") ||
    fullText.includes("assistant") ||
    fullText.includes("palgate") ||
    fullText.includes("wled")
  ) {
    category = "Automation";
    fallbackIcon = "workflow";
  }

  const iconUrl = `${dashboardIconBase}/${cleanKey}.png`;

  return { category, icon: fallbackIcon, iconUrl };
}

// 1. DOCKER DISCOVERY + CUSTOM MERGE + DYNAMIC CATEGORIES
app.get("/api/containers", async (req, res) => {
  try {
    const custom = getCustomServices();
    let dockerContainers = [];

    try {
      dockerContainers = await docker.listContainers({ all: true });
    } catch (dockerErr) {
      console.warn("Docker socket query failed:", dockerErr.message);
    }

    const formattedDocker = dockerContainers.map((c) => {
      const cleanName = c.Names[0].replace("/", "");
      const state = c.State;

      const inferred = inferCategoryAndIcon(cleanName, c.Image);
      const category = c.Labels["homelab.category"] || inferred.category;
      const icon = c.Labels["homelab.icon"] || inferred.icon;

      const publicPort = c.Ports.find((p) => p.PublicPort)?.PublicPort;

      const override = custom.find(
        (item) =>
          item.id === c.Id ||
          item.name.toLowerCase() === cleanName.toLowerCase(),
      );

      return {
        id: c.Id,
        name: override?.name || cleanName,
        status: state,
        online: state === "running",
        port: override?.port !== undefined ? override.port : publicPort || null,
        category: override?.category || category,
        icon: override?.icon || icon,
        iconUrl: override?.iconUrl || inferred.iconUrl,
        image: c.Image,
        isCustom: false,
      };
    });

    const customOnly = custom
      .filter(
        (item) =>
          !formattedDocker.some(
            (d) =>
              d.id === item.id ||
              d.name.toLowerCase() === item.name.toLowerCase(),
          ),
      )
      .map((item) => {
        const inferred = inferCategoryAndIcon(item.name);
        return {
          ...item,
          status: item.online !== false ? "running" : "exited",
          online: item.online !== false,
          iconUrl: item.iconUrl || inferred.iconUrl,
          isCustom: true,
        };
      });

    const allServices = [...formattedDocker, ...customOnly];

    // Collect all dynamic categories present across services + defaults
    const defaultCategories = ["AI", "Media", "Infra", "Network", "Automation"];
    const detectedCategories = Array.from(
      new Set([
        ...defaultCategories,
        ...allServices.map((s) => s.category).filter(Boolean),
      ]),
    );

    res.json({
      services: allServices,
      categories: detectedCategories,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch containers", details: err.message });
  }
});

// CRUD & Helper Routes remain standard...
app.post("/api/services", (req, res) => {
  try {
    const custom = getCustomServices();
    const newService = {
      ...req.body,
      id: req.body.id || `custom-${Date.now()}`,
    };
    custom.push(newService);
    saveCustomServices(custom);
    res.json({ success: true, service: newService });
  } catch {
    res.status(500).json({ error: "Failed to save service" });
  }
});

app.put("/api/services/:id", (req, res) => {
  try {
    let custom = getCustomServices();
    const { id } = req.params;
    const existingIndex = custom.findIndex((s) => s.id === id);

    if (existingIndex > -1) {
      custom[existingIndex] = { ...custom[existingIndex], ...req.body };
    } else {
      custom.push({ id, ...req.body });
    }

    saveCustomServices(custom);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to update service" });
  }
});

app.delete("/api/services/:id", (req, res) => {
  try {
    let custom = getCustomServices();
    custom = custom.filter((s) => s.id !== req.params.id);
    saveCustomServices(custom);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete service" });
  }
});

const distPath = path.resolve(__dirname, "../dist");
app.use(express.static(distPath));
app.use((req, res) => {
  if (req.path.startsWith("/api"))
    return res.status(404).json({ error: "API route not found" });
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () =>
  console.log(`Homelab Dashboard running on http://localhost:${PORT}`),
);
