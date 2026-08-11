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

// Serve static frontend files from Vite production build (../dist or ./dist)
const distPath = fs.existsSync(path.resolve(__dirname, "../dist"))
  ? path.resolve(__dirname, "../dist")
  : path.resolve(__dirname, "dist");

app.use(express.static(distPath));

// Icon matcher logic
function inferCategoryAndIcon(rawName, image = "") {
  const nameLower = rawName.toLowerCase();
  const imageLower = image.toLowerCase();
  const fullText = `${nameLower} ${imageLower}`;

  let iconName = "";

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

// 1. Containers API
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
        hidden: override?.hidden === true,
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

// Container actions
app.post("/api/containers/:id/:action", async (req, res) => {
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

// Update endpoint
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

// Catch-all route to serve React's index.html for UI routing on port 3333
app.get("*", (req, res) => {
  const indexPath = path.join(distPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res
      .status(404)
      .send("Frontend build not found. Please run 'npm run build'.");
  }
});

app.listen(PORT, () =>
  console.log(`Server listening on http://localhost:${PORT}`),
);
