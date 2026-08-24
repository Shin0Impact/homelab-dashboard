#!/usr/bin/env bash
#
# Homelab OS installer
#
#   curl -fsSL https://raw.githubusercontent.com/Shin0Impact/homelab-dashboard/main/install.sh | bash
#
# Clones (or updates) the repo and builds + starts it with Docker Compose.
# Safe to re-run: if it's already installed, this pulls the latest code and
# rebuilds instead of cloning again.
#
set -euo pipefail

REPO_URL="https://github.com/Shin0Impact/homelab-dashboard.git"
INSTALL_DIR="${INSTALL_DIR:-$HOME/homelab-os}"

c_green() { printf '\033[0;32m%s\033[0m\n' "$1"; }
c_red()   { printf '\033[0;31m%s\033[0m\n' "$1"; }
c_dim()   { printf '\033[2m%s\033[0m\n' "$1"; }

fail() {
  c_red "Error: $1"
  exit 1
}

echo "Homelab OS installer"
echo "======================"
echo

# --- Prerequisites ---------------------------------------------------------
command -v git >/dev/null 2>&1 || fail "git is required but not installed. Install it, then re-run this script."
command -v docker >/dev/null 2>&1 || fail "Docker is required but not installed. See https://docs.docker.com/engine/install/"

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  fail "Docker Compose is required (either the 'docker compose' plugin or standalone 'docker-compose')."
fi

if ! docker info >/dev/null 2>&1; then
  fail "Docker is installed but not reachable — is the daemon running, and does this user have permission to use it? (try: sudo usermod -aG docker \$USER, then log back in)"
fi

# --- Clone or update ---------------------------------------------------------
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "Existing install found at $INSTALL_DIR — updating instead of cloning."
  git -C "$INSTALL_DIR" pull --ff-only
elif [ -e "$INSTALL_DIR" ]; then
  fail "$INSTALL_DIR already exists and isn't a git repo. Set INSTALL_DIR to somewhere else and re-run, e.g.:\n  INSTALL_DIR=\$HOME/homelab-os-2 bash install.sh"
else
  echo "Cloning into $INSTALL_DIR..."
  git clone --depth 1 "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# --- Build & start -----------------------------------------------------------
echo
echo "Building and starting (this can take a minute on first run)..."
$COMPOSE up -d --build

echo
c_green "Homelab OS is up."
echo

PORT="$(grep -oP '(?<=PORT=)\d+' docker-compose.yml | head -1)"
PORT="${PORT:-3333}"

LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
if [ -n "$LAN_IP" ]; then
  echo "Open:  http://${LAN_IP}:${PORT}"
fi
echo "  or:  http://localhost:${PORT}  (from this machine)"
echo
c_dim "First time? You'll land on a setup screen to create your admin account — no default password to look up."
c_dim "To update later, just re-run this script (or: cd $INSTALL_DIR && git pull && $COMPOSE up -d --build)."
