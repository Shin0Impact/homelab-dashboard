import Docker from "dockerode";

const isWindows = process.platform === "win32";

export const docker = new Docker(
  isWindows
    ? { socketPath: "//./pipe/docker_engine" }
    : { socketPath: "/var/run/docker.sock" },
);

export function inferCategoryAndIcon(rawName, image = "") {
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
