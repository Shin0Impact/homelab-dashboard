import express from "express";
import fs from "fs";
import path from "path";
import { docker } from "../helpers/dockerUtils.js";
import { STACKS_DIR } from "../config/constants.js";
import { execAsync } from "../helpers/sysInfo.js";

const router = express.Router();

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
      });
    });

    Object.values(stackMap).forEach((st) => {
      if (st.containers.some((c) => c.state === "running")) {
        st.status = "running";
      }
    });

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
      const composeFile = path.join(STACKS_DIR, dirName, "docker-compose.yml");
      if (fs.existsSync(composeFile)) {
        stackMap[dirName].composeContent = fs.readFileSync(
          composeFile,
          "utf-8",
        );
      }
    });

    res.json(Object.values(stackMap));
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to list stacks", details: err.message });
  }
});

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
