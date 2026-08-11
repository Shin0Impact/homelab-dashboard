import express from "express";
import cors from "cors";
import Docker from "dockerode";
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

// Advanced Container & Image Icon Matcher
function inferCategoryAndIcon(rawName, image = "") {
  const nameLower = rawName.toLowerCase();
  const imageLower = image.toLowerCase();
  const fullText = `${nameLower} ${imageLower}`;

  let iconName = "";

  // Explicit mappings based on container/image contents seen in your dashboard
  if (fullText.includes("open-webui") || fullText.includes("openwebui"))
    iconName = "open-webui";
  else if (fullText.includes("adguard")) iconName = "adguard-home";
  else if (fullText.includes("uptime-kuma") || fullText.includes("uptime_kuma"))
    iconName = "uptime-kuma";
  else if (
    fullText.includes("home-assistant") ||
    fullText.includes("homeassistant")
  )
    iconName = "home-assistant";
  else if (fullText.includes("nextcloud")) iconName = "nextcloud";
  else if (fullText.includes("immich")) iconName = "immich";
  else if (fullText.includes("frigate")) iconName = "frigate";
  else if (fullText.includes("navidrome")) iconName = "navidrome";
  else if (fullText.includes("mosquitto")) iconName = "mosquitto";
  else if (fullText.includes("redis") || fullText.includes("valkey"))
    iconName = "redis";
  else if (fullText.includes("postgres")) iconName = "postgresql";
  else if (fullText.includes("lidarr")) iconName = "lidarr";
  else {
    // Fallback cleanup strategy
    let clean = nameLower
      .replace(/^(big-bear|docker|my|local)[-_]/, "")
      .replace(/[-_](main|app|server|container|service|1|2|3)$/g, "");
    iconName = clean.replace(/[-_]/g, "");
  }

  const dashboardIconBase =
    "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png";

  let category = "Infra";
  let fallbackIcon = "container";

  if (
    fullText.includes("open-webui") ||
    fullText.includes("ollama") ||
    fullText.includes("ai")
  ) {
    category = "AI";
    fallbackIcon = "bot";
  } else if (fullText.includes("navidrome") || fullText.includes("lidarr")) {
    category = "Media";
    fallbackIcon = "music";
  } else if (
    fullText.includes("home-assistant") ||
    fullText.includes("mosquitto")
  ) {
    category = "Automation";
    fallbackIcon = "workflow";
  }

  return {
    category,
    icon: fallbackIcon,
    iconUrl: `${dashboardIconBase}/${iconName}.png`,
  };
}

// 1. DOCKER DISCOVERY + CUSTOM MERGE + VISIBILITY FILTER
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
        hidden: override?.hidden === true, // Carry over hide state
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
          hidden: item.hidden === true,
          isCustom: true,
        };
      });

    const allServices = [...formattedDocker, ...customOnly];

    // Build unique list of categories
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

// Update endpoint (saves persistent edits like hidden status)
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

// Port listener
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
