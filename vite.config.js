import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The Docker production build is served from the domain root ("/"), but a
// GitHub Pages project site is served from a subpath
// (https://<user>.github.io/<repo>/) — asset URLs need to know which one
// they're in, or every JS/CSS request 404s on Pages. Only the demo build
// (see .github/workflows/deploy-demo.yml) sets these two env vars.
const isDemoBuild = process.env.VITE_DEMO_MODE === "true";
const repoName = process.env.VITE_REPO_NAME || "homelab-dashboard";

// https://vite.dev/config/
export default defineConfig({
  base: isDemoBuild ? `/${repoName}/` : "/",
  plugins: [react(), tailwindcss()],
});
