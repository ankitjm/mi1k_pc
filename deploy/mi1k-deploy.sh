#!/usr/bin/env bash
###############################################################################
# MI1K Deploy — One-command deployment for any server
#
# Usage:
#   ./mi1k-deploy.sh                  # Interactive setup
#   ./mi1k-deploy.sh --domain x.com   # Non-interactive with domain
#   ./mi1k-deploy.sh --no-https       # Skip Caddy/HTTPS setup
#
# This script is idempotent — run it again to update an existing install.
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.portable.yml"

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${BLUE}ℹ${NC}  $*"; }
ok()    { echo -e "${GREEN}✓${NC}  $*"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $*"; }
err()   { echo -e "${RED}✗${NC}  $*" >&2; }
header(){ echo -e "\n${BOLD}── $* ──${NC}\n"; }

# ── Parse Arguments ──────────────────────────────────────────────────────────
DOMAIN=""
ENABLE_HTTPS=true
PORT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)    DOMAIN="$2"; shift 2 ;;
    --no-https)  ENABLE_HTTPS=false; shift ;;
    --port)      PORT="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--domain DOMAIN] [--no-https] [--port PORT]"
      echo ""
      echo "Options:"
      echo "  --domain DOMAIN   Set the public domain (e.g., agents.mycompany.com)"
      echo "  --no-https        Skip Caddy HTTPS setup (use if you have your own reverse proxy)"
      echo "  --port PORT       Set the MI1K port (default: 3100)"
      exit 0
      ;;
    *) err "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Prerequisites ────────────────────────────────────────────────────────────
header "Checking prerequisites"

if ! command -v docker &>/dev/null; then
  err "Docker is not installed."
  echo "  Install it with: curl -fsSL https://get.docker.com | sh"
  exit 1
fi
ok "Docker installed"

if ! docker compose version &>/dev/null; then
  err "Docker Compose (v2) is not available."
  echo "  It should come with Docker. Try: apt-get install docker-compose-plugin"
  exit 1
fi
ok "Docker Compose available"

if ! docker info &>/dev/null 2>&1; then
  err "Docker daemon is not running or you don't have permission."
  echo "  Try: sudo systemctl start docker"
  exit 1
fi
ok "Docker daemon running"

# Check for MI1K image
if docker image inspect mi1k-server:latest &>/dev/null 2>&1; then
  ok "MI1K image found (mi1k-server:latest)"
else
  # Try to load from tarball in the same directory
  TARBALL=$(find "${SCRIPT_DIR}" -maxdepth 1 -name "mi1k-*.tar.gz" -o -name "mi1k-*.tar" 2>/dev/null | head -1)
  if [[ -n "${TARBALL}" ]]; then
    info "Loading MI1K image from ${TARBALL}..."
    docker load < "${TARBALL}"
    ok "MI1K image loaded"
  else
    err "MI1K image not found."
    echo "  Either:"
    echo "  1. Place a mi1k-*.tar.gz file in this directory, or"
    echo "  2. Run: docker load < mi1k-server-latest.tar.gz"
    exit 1
  fi
fi

# ── Detect Existing Installation ─────────────────────────────────────────────
EXISTING_INSTALL=false
if [[ -f "${ENV_FILE}" ]]; then
  EXISTING_INSTALL=true
  header "Existing installation detected"
  info "Found .env file at ${ENV_FILE}"
  info "Will preserve existing secrets and configuration."
  echo ""
fi

# ── Configuration ────────────────────────────────────────────────────────────
header "Configuration"

generate_secret() {
  openssl rand -hex 32
}

generate_password() {
  openssl rand -base64 24 | tr -d '/+=' | head -c 24
}

if [[ "${EXISTING_INSTALL}" == "true" ]]; then
  # Load existing values
  source "${ENV_FILE}"
  POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"
  BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET}"
  PAPERCLIP_PUBLIC_URL="${PAPERCLIP_PUBLIC_URL}"
  MI1K_PORT="${MI1K_PORT:-3100}"
  MI1K_DOMAIN="${MI1K_DOMAIN:-}"
  ok "Loaded existing configuration"

  # Allow overrides from CLI args
  if [[ -n "${DOMAIN}" ]]; then
    MI1K_DOMAIN="${DOMAIN}"
    PAPERCLIP_PUBLIC_URL="https://${DOMAIN}"
    info "Domain updated to: ${DOMAIN}"
  fi
  if [[ -n "${PORT}" ]]; then
    MI1K_PORT="${PORT}"
    info "Port updated to: ${PORT}"
  fi
else
  # Generate new secrets
  POSTGRES_PASSWORD="$(generate_password)"
  BETTER_AUTH_SECRET="$(generate_secret)"
  ok "Generated database password"
  ok "Generated authentication secret"

  # Get domain
  if [[ -z "${DOMAIN}" ]]; then
    echo ""
    echo -e "  ${BOLD}What domain will MI1K be accessible at?${NC}"
    echo "  Examples: agents.mycompany.com, 192.168.1.100"
    echo "  (Press Enter for 'localhost')"
    echo ""
    read -rp "  Domain: " DOMAIN
    DOMAIN="${DOMAIN:-localhost}"
  fi

  MI1K_DOMAIN="${DOMAIN}"
  MI1K_PORT="${PORT:-3100}"

  if [[ "${DOMAIN}" == "localhost" || "${DOMAIN}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    PAPERCLIP_PUBLIC_URL="http://${DOMAIN}:${MI1K_PORT}"
    ENABLE_HTTPS=false
    info "Using HTTP (no HTTPS for localhost/IP addresses)"
  else
    PAPERCLIP_PUBLIC_URL="https://${DOMAIN}"
  fi

  ok "Public URL: ${PAPERCLIP_PUBLIC_URL}"
fi

# ── Write .env File ──────────────────────────────────────────────────────────
header "Writing configuration"

cat > "${ENV_FILE}" <<EOF
###############################################################################
# MI1K Deployment Configuration — Auto-generated by mi1k-deploy.sh
# WARNING: Do not change POSTGRES_PASSWORD or BETTER_AUTH_SECRET after first run
###############################################################################

POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
PAPERCLIP_PUBLIC_URL=${PAPERCLIP_PUBLIC_URL}
MI1K_PORT=${MI1K_PORT}
MI1K_DOMAIN=${MI1K_DOMAIN}
EOF

chmod 600 "${ENV_FILE}"
ok "Configuration written to .env"

# ── Start the Stack ──────────────────────────────────────────────────────────
header "Starting MI1K"

COMPOSE_ARGS="-f ${COMPOSE_FILE} --env-file ${ENV_FILE}"

if [[ "${ENABLE_HTTPS}" == "true" && -f "${SCRIPT_DIR}/Caddyfile" ]]; then
  COMPOSE_ARGS="${COMPOSE_ARGS} --profile https"
  info "HTTPS enabled via Caddy (auto-SSL for ${MI1K_DOMAIN})"
else
  info "Running without HTTPS (direct access on port ${MI1K_PORT})"
fi

info "Pulling base images..."
docker compose ${COMPOSE_ARGS} pull postgres 2>/dev/null || true

info "Starting services..."
docker compose ${COMPOSE_ARGS} up -d

# ── Wait for Health ──────────────────────────────────────────────────────────
header "Waiting for MI1K to start"

MAX_WAIT=120
WAITED=0
HEALTH_URL="http://localhost:${MI1K_PORT}/api/health"

while [[ ${WAITED} -lt ${MAX_WAIT} ]]; do
  if curl -sf "${HEALTH_URL}" &>/dev/null; then
    break
  fi
  echo -n "."
  sleep 3
  WAITED=$((WAITED + 3))
done
echo ""

if curl -sf "${HEALTH_URL}" &>/dev/null; then
  ok "MI1K is healthy!"
else
  err "MI1K did not become healthy within ${MAX_WAIT}s"
  echo ""
  echo "  Check logs with: docker compose -f ${COMPOSE_FILE} logs mi1k"
  exit 1
fi

# ── Summary ──────────────────────────────────────────────────────────────────
header "Deployment Complete"

echo -e "  ${GREEN}${BOLD}MI1K is running!${NC}"
echo ""
echo -e "  ${BOLD}URL:${NC}       ${PAPERCLIP_PUBLIC_URL}"
if [[ "${ENABLE_HTTPS}" != "true" ]]; then
  echo -e "  ${BOLD}Local:${NC}     http://localhost:${MI1K_PORT}"
fi
echo ""
echo -e "  ${BOLD}Useful commands:${NC}"
echo "    View logs:     docker compose -f ${COMPOSE_FILE} logs -f mi1k"
echo "    Stop:          docker compose -f ${COMPOSE_FILE} down"
echo "    Restart:       docker compose -f ${COMPOSE_FILE} restart mi1k"
echo "    DB backup:     docker compose -f ${COMPOSE_FILE} exec postgres pg_dump -U mi1k mi1k > backup.sql"
echo ""
echo -e "  ${BOLD}Config:${NC}    ${ENV_FILE}"
echo -e "  ${BOLD}Data:${NC}      Docker volumes (mi1k-data, mi1k-pgdata)"
echo ""

if [[ "${EXISTING_INSTALL}" == "false" ]]; then
  echo -e "  ${YELLOW}First time? Open the URL above to create your admin account.${NC}"
  echo ""
fi
