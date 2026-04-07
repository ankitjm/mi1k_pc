#!/usr/bin/env bash
###############################################################################
# MI1K Update — Safely update a deployed MI1K instance
#
# Usage:
#   ./mi1k-update.sh                          # Load from tarball in this dir
#   ./mi1k-update.sh --image mi1k-v0.4.tar.gz # Specify tarball path
#   ./mi1k-update.sh --no-backup              # Skip pre-update backup
#
# Safety: Backs up the database before updating. Rolls back automatically
# if the new version fails health checks.
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.portable.yml"
ENV_FILE="${SCRIPT_DIR}/.env"
BACKUP_DIR="${SCRIPT_DIR}/backups"

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
IMAGE_TARBALL=""
SKIP_BACKUP=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image)      IMAGE_TARBALL="$2"; shift 2 ;;
    --no-backup)  SKIP_BACKUP=true; shift ;;
    -h|--help)
      echo "Usage: $0 [--image TARBALL] [--no-backup]"
      echo ""
      echo "Options:"
      echo "  --image TARBALL   Path to the MI1K image tarball (auto-detected if not specified)"
      echo "  --no-backup       Skip database backup before update"
      exit 0
      ;;
    *) err "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Verify Running Instance ─────────────────────────────────────────────────
header "Pre-update checks"

if [[ ! -f "${ENV_FILE}" ]]; then
  err "No .env file found. Is MI1K deployed here?"
  echo "  Run ./mi1k-deploy.sh first."
  exit 1
fi

source "${ENV_FILE}"

if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^mi1k$'; then
  warn "MI1K container is not running. Will attempt to start after update."
fi

# Get current version
CURRENT_VERSION=$(curl -sf "http://localhost:${MI1K_PORT:-3100}/api/health" 2>/dev/null | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
info "Current version: ${CURRENT_VERSION}"

# ── Find Image Tarball ───────────────────────────────────────────────────────
if [[ -z "${IMAGE_TARBALL}" ]]; then
  IMAGE_TARBALL=$(find "${SCRIPT_DIR}" -maxdepth 1 -name "mi1k-*.tar.gz" -o -name "mi1k-*.tar" 2>/dev/null | sort -t- -k2 -V | tail -1)
fi

if [[ -z "${IMAGE_TARBALL}" || ! -f "${IMAGE_TARBALL}" ]]; then
  err "No MI1K image tarball found."
  echo "  Place a mi1k-*.tar.gz file in this directory, or use --image PATH"
  exit 1
fi

ok "Image tarball: ${IMAGE_TARBALL}"

# ── Save Current Image ID ───────────────────────────────────────────────────
OLD_IMAGE_ID=$(docker inspect mi1k-server:latest --format='{{.Id}}' 2>/dev/null || echo "")
if [[ -n "${OLD_IMAGE_ID}" ]]; then
  # Tag the old image so we can rollback
  docker tag mi1k-server:latest mi1k-server:previous 2>/dev/null || true
  ok "Saved current image as mi1k-server:previous (for rollback)"
fi

# ── Database Backup ──────────────────────────────────────────────────────────
if [[ "${SKIP_BACKUP}" == "false" ]]; then
  header "Backing up database"

  mkdir -p "${BACKUP_DIR}"
  BACKUP_FILE="${BACKUP_DIR}/pre-update-$(date +%Y%m%d-%H%M%S).sql"

  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'mi1k-postgres'; then
    docker exec mi1k-postgres pg_dump -U mi1k -d mi1k --clean --if-exists > "${BACKUP_FILE}"
    BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
    ok "Database backed up: ${BACKUP_FILE} (${BACKUP_SIZE})"
  else
    warn "Postgres container not found — skipping backup"
    BACKUP_FILE=""
  fi
else
  info "Skipping backup (--no-backup)"
  BACKUP_FILE=""
fi

# ── Load New Image ───────────────────────────────────────────────────────────
header "Loading new image"

info "Loading ${IMAGE_TARBALL}..."
docker load < "${IMAGE_TARBALL}"

NEW_IMAGE_ID=$(docker inspect mi1k-server:latest --format='{{.Id}}' 2>/dev/null || echo "")
if [[ "${OLD_IMAGE_ID}" == "${NEW_IMAGE_ID}" ]]; then
  info "Image is the same as current — no changes detected"
fi
ok "New image loaded"

# ── Restart Stack ────────────────────────────────────────────────────────────
header "Restarting MI1K"

COMPOSE_ARGS="-f ${COMPOSE_FILE} --env-file ${ENV_FILE}"

# Check if caddy profile was active
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'mi1k-caddy'; then
  COMPOSE_ARGS="${COMPOSE_ARGS} --profile https"
fi

info "Recreating MI1K container with new image..."
docker compose ${COMPOSE_ARGS} up -d --force-recreate mi1k

# ── Health Check ─────────────────────────────────────────────────────────────
header "Verifying update"

MAX_WAIT=120
WAITED=0
HEALTH_URL="http://localhost:${MI1K_PORT:-3100}/api/health"

info "Waiting for MI1K to become healthy..."
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
  NEW_VERSION=$(curl -sf "${HEALTH_URL}" 2>/dev/null | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
  ok "MI1K is healthy!"
  info "Version: ${CURRENT_VERSION} → ${NEW_VERSION}"
else
  # ── Rollback ─────────────────────────────────────────────────────────
  err "MI1K failed health check after update!"
  echo ""

  header "Rolling back"

  if docker image inspect mi1k-server:previous &>/dev/null 2>&1; then
    info "Restoring previous image..."
    docker tag mi1k-server:previous mi1k-server:latest
    docker compose ${COMPOSE_ARGS} up -d --force-recreate mi1k

    # Restore database if we backed it up
    if [[ -n "${BACKUP_FILE}" && -f "${BACKUP_FILE}" ]]; then
      info "Restoring database backup..."
      sleep 5  # Wait for postgres to be ready
      docker exec -i mi1k-postgres psql -U mi1k -d mi1k < "${BACKUP_FILE}"
      ok "Database restored from backup"
    fi

    # Wait for rollback health
    WAITED=0
    while [[ ${WAITED} -lt 60 ]]; do
      if curl -sf "${HEALTH_URL}" &>/dev/null; then
        break
      fi
      sleep 3
      WAITED=$((WAITED + 3))
    done

    if curl -sf "${HEALTH_URL}" &>/dev/null; then
      ok "Rollback successful — running previous version"
    else
      err "Rollback also failed. Check logs: docker compose -f ${COMPOSE_FILE} logs mi1k"
    fi
  else
    err "No previous image to rollback to."
    echo "  Check logs: docker compose -f ${COMPOSE_FILE} logs mi1k"
  fi

  exit 1
fi

# ── Cleanup ──────────────────────────────────────────────────────────────────
# Remove previous tag if update succeeded
docker rmi mi1k-server:previous 2>/dev/null || true

# Keep only last 5 backups
if [[ -d "${BACKUP_DIR}" ]]; then
  ls -tp "${BACKUP_DIR}"/pre-update-*.sql 2>/dev/null | tail -n +6 | xargs -r rm --
fi

# ── Summary ──────────────────────────────────────────────────────────────────
header "Update Complete"

echo -e "  ${GREEN}${BOLD}MI1K updated successfully!${NC}"
echo ""
echo "  Version: ${CURRENT_VERSION} → ${NEW_VERSION}"
if [[ -n "${BACKUP_FILE}" ]]; then
  echo "  Backup:  ${BACKUP_FILE}"
fi
echo ""
