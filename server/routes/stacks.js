import express from "express";
import fs from "fs";
import path from "path";
import { docker } from "../helpers/dockerUtils.js";
import { STACKS_DIR } from "../config/constants.js";
import { execAsync } from "../helpers/sysInfo.js";

const router = express.Router();

// Helper: Locate original compose file on host filesystem using Docker labels
async function findHostComposeFilePath(stackName) {
  try {
    const rawContainers = await docker.listContainers({ all: true });
    const stackContainers = rawContainers.filter((c) => {
      const proj = c.Labels?.["com.docker.compose.project"];
      return proj === stackName;
    });

    if (stackContainers.length === 0) return null;

    const container = docker.getContainer(stackContainers[0].Id);
    const inspectData = await container.inspect();
    const labels = inspectData.Config?.Labels || {};

    // 1. Try explicit config_files label (e.g. "/root/immich/docker-compose.yml")
    const configFilesLabel = labels["com.docker.compose.project.config_files"];
    if (configFilesLabel) {
      const firstFile = configFilesLabel.split(",")[0].trim();
      const mappedPath = path.join("/host", firstFile);
      if (fs.existsSync(mappedPath)) {
        return { realHostPath: firstFile, containerPath: mappedPath };
      }
    }

    // 2. Fall back to working_dir label
    const workingDir = labels["com.docker.compose.project.working_dir"];
    if (workingDir) {
      const candidates = [
        path.join("/host", workingDir, "docker-compose.yml"),
        path.join("/host", workingDir, "docker-compose.yaml"),
        path.join("/host", workingDir, "compose.yml"),
        path.join("/host", workingDir, "compose.yaml"),
      ];

      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          const originalPath = cand.replace(/^\/host/, "");
          return { realHostPath: originalPath, containerPath: cand };
        }
      }
    }
  } catch (err) {
    console.error("Failed to inspect host compose path:", err);
  }

  return null;
}

// List all stacks (running containers + local directories)
router.get("/", async (req, res) => {
  try {
    const rawContainers = await docker.listContainers({ all: true });
    const stackMap = {};

    rawContainers.forEach((c) => {
      const projectName =
        c.Labels?.["com.docker.compose.project"] || "standalone";
      if (!stackMap[projectName]) {
        stackMap[projectName] = {
          name: projectName,
          containers: [],
          status: "stopped",
        };
      }
      stackMap[projectName].containers.push({
        id: c.Id,
        name: c.Names[0] ? c.Names[0].replace("/", "") : c.Id.substring(0, 8),
        state: c.State,
        image: c.Image,
      });
    });

    Object.values(stackMap).forEach((st) => {
      if (st.containers.some((c) => c.state === "running")) {
        st.status = "running";
      }
    });

    if (fs.existsSync(STACKS_DIR)) {
      const localStackDirs = fs
        .readdirSync(STACKS_DIR, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

      localStackDirs.forEach((dirName) => {
        if (!stackMap[dirName]) {
          stackMap[dirName] = {
            name: dirName,
            containers: [],
            status: "stopped",
          };
        }
        const composeFile = path.join(
          STACKS_DIR,
          dirName,
          "docker-compose.yml",
        );
        if (fs.existsSync(composeFile)) {
          stackMap[dirName].composeContent = fs.readFileSync(
            composeFile,
            "utf-8",
          );
        }
      });
    }

    res.json(Object.values(stackMap));
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to list stacks", details: err.message });
  }
});

// GET raw compose file (Local app data -> Host disk -> Reconstructed fallback)
router.get("/:name/compose", async (req, res) => {
  const { name } = req.params;

  // 1. Check local dashboard data folder first (./data/stacks/<name>/docker-compose.yml)
  const localComposePath = path.join(STACKS_DIR, name, "docker-compose.yml");
  if (fs.existsSync(localComposePath)) {
    const composeContent = fs.readFileSync(localComposePath, "utf-8");
    return res.json({ name, composeContent, source: "local" });
  }

  // 2. Check original file on host disk via Docker labels
  const hostFileInfo = await findHostComposeFilePath(name);
  if (hostFileInfo) {
    try {
      const composeContent = fs.readFileSync(
        hostFileInfo.containerPath,
        "utf-8",
      );
      return res.json({
        name,
        composeContent,
        source: `host (${hostFileInfo.realHostPath})`,
      });
    } catch (err) {
      console.error(
        `Failed to read file at ${hostFileInfo.containerPath}:`,
        err,
      );
    }
  }

  // 3. Fallback for containers without compose files (e.g. CasaOS / Standalone)
  try {
    const rawContainers = await docker.listContainers({ all: true });
    const stackContainers = rawContainers.filter((c) => {
      const proj = c.Labels?.["com.docker.compose.project"];
      return proj === name || (name === "standalone" && !proj);
    });

    if (stackContainers.length > 0) {
      let generatedCompose = `version: '3.8'\nservices:\n`;

      for (const containerSummary of stackContainers) {
        const container = docker.getContainer(containerSummary.Id);
        const inspectData = await container.inspect();

        const serviceName =
          inspectData.Config.Labels?.["com.docker.compose.service"] ||
          inspectData.Name.replace("/", "");
        const image = inspectData.Config.Image;
        const restartPolicy =
          inspectData.HostConfig.RestartPolicy?.Name || "unless-stopped";

        generatedCompose += `  ${serviceName}:\n`;
        generatedCompose += `    image: ${image}\n`;
        generatedCompose += `    restart: ${restartPolicy}\n`;

        // Extract Ports
        const portBindings = inspectData.HostConfig.PortBindings || {};
        const portEntries = [];
        for (const [containerPort, hostBindings] of Object.entries(
          portBindings,
        )) {
          if (hostBindings && hostBindings.length > 0) {
            const hostPort = hostBindings[0].HostPort;
            const cPort = containerPort.split("/")[0];
            portEntries.push(`      - "${hostPort}:${cPort}"`);
          }
        }
        if (portEntries.length > 0) {
          generatedCompose += `    ports:\n${portEntries.join("\n")}\n`;
        }
        generatedCompose += `\n`;
      }

      return res.json({
        name,
        composeContent: generatedCompose.trimEnd(),
        source: "reconstructed",
      });
    }
  } catch (err) {
    console.error("Failed to generate fallback compose:", err);
  }

  return res.json({
    name,
    composeContent: `# No docker-compose configuration detected for stack: ${name}\nservices:\n`,
    source: "none",
  });
});

// Deploy or Update Stack
router.post("/", async (req, res) => {
  const { name, composeContent } = req.body;
  if (!name || !composeContent) {
    return res
      .status(400)
      .json({ error: "Stack name and composeContent are required" });
  }

  const stackDir = path.join(STACKS_DIR, name);
  if (!fs.existsSync(stackDir)) {
    fs.mkdirSync(stackDir, { recursive: true });
  }

  const composePath = path.join(stackDir, "docker-compose.yml");
  fs.writeFileSync(composePath, composeContent, "utf-8");

  try {
    const { stdout, stderr } = await execAsync(
      `docker compose -f "${composePath}" -p "${name}" up -d`,
    );
    res.json({ success: true, stdout, stderr });
  } catch (err) {
    res.status(500).json({
      error: "Failed to deploy stack using docker compose",
      details: err.message,
    });
  }
});

// Stop / Bring down stack
router.post("/:name/down", async (req, res) => {
  const { name } = req.params;
  const stackDir = path.join(STACKS_DIR, name);
  const composePath = path.join(stackDir, "docker-compose.yml");

  try {
    if (fs.existsSync(composePath)) {
      await execAsync(`docker compose -f "${composePath}" -p "${name}" down`);
    } else {
      await execAsync(`docker compose -p "${name}" down`).catch(() => {});
    }
    res.json({ success: true });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to bring down stack", details: err.message });
  }
});

// Delete Stack & Files
router.delete("/:name", async (req, res) => {
  const { name } = req.params;
  const stackDir = path.join(STACKS_DIR, name);
  const composePath = path.join(stackDir, "docker-compose.yml");

  try {
    if (fs.existsSync(composePath)) {
      await execAsync(`docker compose -f "${composePath}" -p "${name}" down`);
      fs.rmSync(stackDir, { recursive: true, force: true });
    } else {
      await execAsync(`docker stack rm "${name}"`).catch(() => {});
    }
    res.json({ success: true });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to stop/remove stack", details: err.message });
  }
});

export default router;
