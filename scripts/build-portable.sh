#!/usr/bin/env bash
###############################################################################
# MI1K Build Portable — Build and package MI1K for deployment
#
# Usage:
#   ./scripts/build-portable.sh                    # Build and package
#   ./scripts/build-portable.sh --skip-build       # Package existing image only
#   ./scripts/build-portable.sh --output /tmp/      # Custom output directory
#
# Produces:
#   mi1k-portable-vX.Y.Z.tar.gz — single archive containing:
#     - MI1K Docker image (compressed)
#     - deploy scripts (deploy, migrate, update)
#     - docker-compose.portable.yml
#     - Caddyfile
#     - .env.template
###############################################################################
set -euo pipefail

# ── Resolve paths ────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEPLOY_DIR="${PROJECT_ROOT}/deploy"

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
SKIP_BUILD=false
OUTPUT_DIR="${PROJECT_ROOT}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build) SKIP_BUILD=true; shift ;;
    --output)     OUTPUT_DIR="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--skip-build] [--output DIR]"
      echo ""
      echo "Options:"
      echo "  --skip-build    Skip Docker image build (use existing mi1k-server:latest)"
      echo "  --output DIR    Output directory for the portable archive"
      exit 0
      ;;
    *) err "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Get Version ──────────────────────────────────────────────────────────────
VERSION=$(grep '"version"' "${PROJECT_ROOT}/server/package.json" | head -1 | grep -o '[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*')
if [[ -z "${VERSION}" ]]; then
  VERSION="0.0.0"
  warn "Could not detect version from server/package.json, using ${VERSION}"
fi

ARCHIVE_NAME="mi1k-portable-v${VERSION}"

header "MI1K Portable Build — v${VERSION}"

# ── Build Docker Image ───────────────────────────────────────────────────────
if [[ "${SKIP_BUILD}" == "false" ]]; then
  header "Building Docker image"

  info "This may take several minutes..."
  docker build \
    -t mi1k-server:latest \
    -t "mi1k-server:v${VERSION}" \
    -f "${PROJECT_ROOT}/Dockerfile" \
    "${PROJECT_ROOT}"

  ok "Image built: mi1k-server:v${VERSION}"
else
  if ! docker image inspect mi1k-server:latest &>/dev/null 2>&1; then
    err "No mi1k-server:latest image found. Remove --skip-build to build it."
    exit 1
  fi
  ok "Using existing mi1k-server:latest image"
fi

# Show image size
IMAGE_SIZE=$(docker image inspect mi1k-server:latest --format='{{.Size}}' | awk '{printf "%.1fGB", $1/1024/1024/1024}')
info "Image size: ${IMAGE_SIZE}"

# ── Export Docker Image ──────────────────────────────────────────────────────
header "Exporting Docker image"

STAGING_DIR=$(mktemp -d)
trap "rm -rf ${STAGING_DIR}" EXIT

IMAGE_FILE="${STAGING_DIR}/mi1k-server-v${VERSION}.tar.gz"
info "Compressing image (this takes a few minutes)..."
docker save mi1k-server:latest | gzip -1 > "${IMAGE_FILE}"

COMPRESSED_SIZE=$(du -sh "${IMAGE_FILE}" | cut -f1)
ok "Image exported: ${COMPRESSED_SIZE} compressed"

# ── Assemble Portable Package ────────────────────────────────────────────────
header "Assembling portable package"

PACKAGE_DIR="${STAGING_DIR}/${ARCHIVE_NAME}"
mkdir -p "${PACKAGE_DIR}"

# Copy image tarball
mv "${IMAGE_FILE}" "${PACKAGE_DIR}/"

# Copy deploy scripts and config
cp "${DEPLOY_DIR}/docker-compose.portable.yml" "${PACKAGE_DIR}/"
cp "${DEPLOY_DIR}/mi1k-deploy.sh"              "${PACKAGE_DIR}/"
cp "${DEPLOY_DIR}/mi1k-migrate.sh"             "${PACKAGE_DIR}/"
cp "${DEPLOY_DIR}/mi1k-update.sh"              "${PACKAGE_DIR}/"
cp "${DEPLOY_DIR}/Caddyfile"                   "${PACKAGE_DIR}/"
cp "${DEPLOY_DIR}/.env.template"               "${PACKAGE_DIR}/"

# Ensure scripts are executable
chmod +x "${PACKAGE_DIR}"/*.sh

# Create a README
cat > "${PACKAGE_DIR}/README.txt" <<'READMEEOF'
MI1K — Portable Deployment Package
===================================

Quick Start:
  1. Run: ./mi1k-deploy.sh
  2. Follow the prompts
  3. Open the URL shown at the end

Scripts:
  mi1k-deploy.sh    — First-time setup (or re-run to update config)
  mi1k-update.sh    — Update to a newer MI1K version
  mi1k-migrate.sh   — Export/import data from another instance

Files:
  docker-compose.portable.yml  — Docker stack definition
  Caddyfile                    — HTTPS reverse proxy config
  .env.template                — Configuration template (for reference)
  .env                         — Your actual config (created by deploy script)

Requirements:
  - Docker (with Docker Compose v2)
  - 4GB+ RAM recommended
  - Port 3100 (or custom), plus 80/443 if using HTTPS

READMEEOF

ok "Package assembled"

# ── Create Final Archive ─────────────────────────────────────────────────────
header "Creating archive"

ARCHIVE_PATH="${OUTPUT_DIR}/${ARCHIVE_NAME}.tar.gz"
tar -czf "${ARCHIVE_PATH}" -C "${STAGING_DIR}" "${ARCHIVE_NAME}"

ARCHIVE_SIZE=$(du -sh "${ARCHIVE_PATH}" | cut -f1)
ok "Archive created: ${ARCHIVE_PATH}"

# ── Summary ──────────────────────────────────────────────────────────────────
header "Build Complete"

echo -e "  ${GREEN}${BOLD}Portable package ready!${NC}"
echo ""
echo -e "  ${BOLD}File:${NC}     ${ARCHIVE_PATH}"
echo -e "  ${BOLD}Size:${NC}     ${ARCHIVE_SIZE}"
echo -e "  ${BOLD}Version:${NC}  v${VERSION}"
echo ""
echo -e "  ${BOLD}To deploy on a new server:${NC}"
echo "    1. scp ${ARCHIVE_PATH} user@server:~/"
echo "    2. ssh user@server"
echo "    3. tar xzf ${ARCHIVE_NAME}.tar.gz"
echo "    4. cd ${ARCHIVE_NAME}"
echo "    5. ./mi1k-deploy.sh"
echo ""
