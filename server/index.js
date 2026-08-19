import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { PORT } from "./config/constants.js";
import { initStorage } from "./helpers/storage.js";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import settingsRoutes from "./routes/settings.js";
import serviceRoutes from "./routes/services.js";
import telemetryRoutes from "./routes/telemetry.js";
import stackRoutes from "./routes/stacks.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize data folders & default json files
initStorage();

const app = express();

// CORS is only needed in development, where the Vite dev server (5173) calls
// the API on a different port. In production the built frontend is served
// from this same Express process/origin, so there's nothing to allow across
// origins — leaving cors() wide open in prod let any website's JS call the
// API cross-origin. (The real backstop against that is requiring auth on
// every state-changing route — see the route files — but there's no reason
// to also leave the door open here.)
if (process.env.NODE_ENV !== "production") {
  app.use(cors());
}
app.use(express.json());

// API Routers
app.use("/api", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api", serviceRoutes);
app.use("/api", telemetryRoutes);
app.use("/api/stacks", stackRoutes);

// Static Client Files Fallback
const distPath = fs.existsSync(path.resolve(__dirname, "../dist"))
  ? path.resolve(__dirname, "../dist")
  : path.resolve(__dirname, "dist");

app.use(express.static(distPath));

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

app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server listening on http://0.0.0.0:${PORT}`),
);
