import fs from "fs";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";

export const execAsync = promisify(exec);

export const formatSize = (gb) =>
  gb >= 1000 ? `${(gb / 1024).toFixed(1)} TB` : `${gb.toFixed(1)} GB`;

export async function getStorageStats() {
  const drives = [];

  try {
    const { stdout } = await execAsync("df -k -T");
    const lines = stdout.trim().split("\n").slice(1);

    const ignoredTypes = new Set([
      "tmpfs",
      "devtmpfs",
      "overlay",
      "squashfs",
      "cgroup",
      "proc",
      "sysfs",
      "nsfs",
      "rpc_pipefs",
      "autofs",
    ]);

    const seenMounts = new Set();

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 7) continue;

      const [filesystem, type, blocksStr, usedStr, , , ...mountParts] = parts;
      const mountPoint = mountParts.join(" ");

      if (ignoredTypes.has(type.toLowerCase())) continue;
      if (filesystem.startsWith("/dev/loop")) continue;
      if (seenMounts.has(mountPoint)) continue;

      const totalKBytes = parseInt(blocksStr, 10);
      const usedKBytes = parseInt(usedStr, 10);

      if (isNaN(totalKBytes) || totalKBytes <= 0) continue;

      seenMounts.add(mountPoint);

      const totalGB = totalKBytes / 1024 / 1024;
      const usedGB = usedKBytes / 1024 / 1024;
      const percentage = Math.round((usedGB / totalGB) * 100);

      let displayName = mountPoint;
      if (mountPoint === "/host") displayName = "/ (Host Root)";
      else if (mountPoint.startsWith("/host/"))
        displayName = mountPoint.replace("/host", "");

      drives.push({
        mount: displayName,
        filesystem,
        fsType: type,
        usedGB,
        totalGB,
        usedFormatted: formatSize(usedGB),
        totalFormatted: formatSize(totalGB),
        percentage,
      });
    }
  } catch (err) {
    console.warn(
      "Could not execute `df`, falling back to statfs:",
      err.message,
    );
  }

  if (drives.length === 0) {
    try {
      const targetPath = fs.existsSync("/host") ? "/host" : "/";
      const stats = fs.statfsSync(targetPath);

      const totalBytes = stats.blocks * stats.bsize;
      const freeBytes = stats.bfree * stats.bsize;
      const usedBytes = totalBytes - freeBytes;

      const totalGB = totalBytes / 1024 ** 3;
      const usedGB = usedBytes / 1024 ** 3;

      drives.push({
        mount: "/",
        filesystem: "root",
        fsType: "default",
        usedGB,
        totalGB,
        usedFormatted: formatSize(usedGB),
        totalFormatted: formatSize(totalGB),
        percentage: Math.round((usedBytes / totalBytes) * 100),
      });
    } catch (statErr) {
      console.error("Storage stat fallback error:", statErr);
    }
  }

  const totalUsedGB = drives.reduce((acc, d) => acc + d.usedGB, 0);
  const totalCapacityGB = drives.reduce((acc, d) => acc + d.totalGB, 0);
  const aggregatePercentage =
    totalCapacityGB > 0 ? Math.round((totalUsedGB / totalCapacityGB) * 100) : 0;

  return {
    usedFormatted: formatSize(totalUsedGB),
    totalFormatted: formatSize(totalCapacityGB),
    percentage: aggregatePercentage,
    driveCount: drives.length,
    drives,
  };
}

export function getCpuUsage() {
  const cpus = os.cpus();
  let user = 0,
    nice = 0,
    sys = 0,
    idle = 0,
    irq = 0;
  for (const cpu of cpus) {
    user += cpu.times.user;
    nice += cpu.times.nice;
    sys += cpu.times.sys;
    idle += cpu.times.idle;
    irq += cpu.times.irq;
  }
  const total = user + nice + sys + idle + irq;
  return { idle, total };
}
