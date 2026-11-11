# Homelab OS

A lightweight full-stack dashboard and Docker stack manager for self-hosted infrastructure.

I built it for my own homelab server, which runs Frigate, Immich and other self-hosted services in Docker. It is the one place where I check how the server is doing and start, stop or edit those containers. Homelab OS provides a single interface to monitor system telemetry, manage Docker containers, auto-discover Compose stacks on host disks, and control services through a web UI.

## At a glance

| | |
|---|---|
| **What** | Dashboard and Docker stack manager for a self-hosted server |
| **Stack** | React 19, Vite, Redux Toolkit, Tailwind CSS (frontend); Node.js, Express, Dockerode, systeminformation (backend) |
| **Deploy** | Two-stage Dockerfile and Docker Compose; talks to the Docker socket directly; Tailscale supported |
| **Demo** | A mock-data demo is built by `.github/workflows/deploy-demo.yml` and published to GitHub Pages |

## Features

- **Live System Telemetry** — Real-time streaming graphs for CPU utilization, RAM usage, and network throughput (download/upload speeds).
- **Docker Socket Integration** — Live status tracking (running, exited) for all containers directly via the Docker API (`/var/run/docker.sock`).
- **Smart Host Stack Discovery** — Auto-detects host `docker-compose.yml` files using Docker container labels (`com.docker.compose.project`) and inspects host paths.
- **Service Management & Controls** — Filter services by category (Infra, AI, Media, Automation), launch web GUIs, and execute start, stop, or restart commands.
- **In-Browser Compose Editor** — View, edit, deploy (`up -d`), or tear down (`down`) multi-container stacks right from the UI.
- **Authentication & Tailscale Integration** — Built-in session security with support for Tailscale mesh remote networking.
- **Customizable UI** — Theme switching (Default Dark, AMOLED Dark, Light Mode), custom service tags, and full JSON configuration backup/restore.

## Tech Stack

**Frontend**

- React 19 + Vite
- Tailwind CSS
- Lucide React

**Backend**

- Node.js & Express
- Dockerode (Docker Engine API wrapper)
- Systeminformation (host hardware telemetry)

## Installation & Deployment

The image is built from the included `Dockerfile` (a two-stage build: Vite builds the React frontend, then it's copied into a Node.js backend image) — there's no published image to pull, so every option below builds from source with `build: .`.

### Prerequisites

- Docker Engine / Docker Desktop installed.
- Docker socket access (`/var/run/docker.sock` on Linux/WSL, or a named pipe on native Windows — see the Windows section below).
- (Optional) [Tailscale](https://tailscale.com/) installed on the host if you want the Tailscale mesh integration. The container talks to the host's own Tailscale daemon rather than running its own.

The `docker-compose.yml` in the repo root:

```yaml
services:
  homelab-dashboard:
    build: .
    container_name: homelab-dashboard
    restart: unless-stopped
    ports:
      - "3333:3000"
    volumes:
      # Mount host Docker socket to monitor and control running containers
      - /var/run/docker.sock:/var/run/docker.sock
      # Mount host Tailscale socket and binary for mesh network integration
      - /var/run/tailscale/tailscaled.sock:/var/run/tailscale/tailscaled.sock
      - /usr/bin/tailscale:/usr/bin/tailscale:ro
      # Read-only host filesystem access, used to discover docker-compose.yml files
      - /:/host:ro
      # Persist application data
      - ./data:/app/server/data
      - ./data:/app/data
    environment:
      - NODE_ENV=production
```

> **Note:** The Docker socket is mounted read-write here, not read-only — the dashboard needs write access to actually start, stop, and restart containers on your behalf, not just report their status. `/:/host:ro` stays read-only, since it's only used to discover and read existing `docker-compose.yml` files across the host.

### Linux

#### Command Line Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Shin0Impact/homelab-dashboard.git
   cd homelab-dashboard
   ```
2. Build the image and start the container:
   ```bash
   docker compose up -d --build
   ```
3. Open `http://localhost:3333` (or your server's LAN IP on that port).

#### Docker Desktop (UI) Setup

Docker Desktop doesn't have a way to build and launch a Compose stack purely from the UI — the initial `docker compose up -d --build` above still has to run from a terminal once. After that, Docker Desktop groups the containers by project name in the **Containers** tab, where you can start, stop, restart, view logs, or remove the whole stack with a click, without touching the command line again.

1. Install [Docker Desktop for Linux](https://docs.docker.com/desktop/setup/install/linux/).
2. Run the one-time command-line setup above from a terminal.
3. Manage the stack going forward from the **Containers** tab, under the `homelab-dashboard` group.

### Windows

WSL 2 is the more reliable route if you want the Tailscale integration to work, since the compose file above uses Unix-style socket paths for both the Docker Engine API and Tailscale — neither of which exists in that form on native Windows.

#### Command Line Setup (WSL 2, recommended)

1. Enable the WSL 2 backend in Docker Desktop:
   - **Settings > General** — check **Use the WSL 2 based engine**.
   - **Settings > Resources > WSL Integration** — enable integration for your installed distribution (e.g., Ubuntu).
2. Open your WSL terminal (e.g., Ubuntu) and clone the repository:
   ```bash
   git clone https://github.com/Shin0Impact/homelab-dashboard.git
   cd homelab-dashboard
   ```
3. Build and start, same as Linux:
   ```bash
   docker compose up -d --build
   ```
4. Open `http://localhost:3333` from Windows.

**Command Line Setup (native Windows, no WSL):** the compose file needs two changes first — swap the Docker socket volume for the named pipe (`//./pipe/docker_engine://./pipe/docker_engine`), and drop the Tailscale socket mount, since there's no native-Windows equivalent. Then run the same `docker compose up -d --build` from PowerShell or CMD.

#### Docker Desktop (UI) Setup

Same rule as Linux: the first `docker compose up -d --build` has to run from a terminal (inside WSL, or PowerShell/CMD for native Windows) — there's no GUI-only path to the initial build. Once it's running:

1. Open Docker Desktop.
2. Find the `homelab-dashboard` group in the **Containers** tab.
3. Start, stop, restart, or view logs for the stack from there.
4. Access the dashboard at `http://localhost:3333`.

### Updating

To update to a newer version, pull the latest code and rebuild:

```bash
git pull
docker compose up -d --build
```

This rebuilds the image from the updated Dockerfile/source and recreates the container, while `./data` (mounted as a volume) persists across the rebuild.

## Development Setup

Clone the repository:

```bash
git clone https://github.com/Shin0Impact/homelab-dashboard.git
cd homelab-dashboard
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```
