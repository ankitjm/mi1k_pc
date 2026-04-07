#!/usr/bin/env bash
###############################################################################
# MI1K Migrate — Export/Import data between Paperclip/MI1K instances
#
# Usage:
#   ./mi1k-migrate.sh export --output ./backup/
#   ./mi1k-migrate.sh import --from ./backup/
#
# Export creates a portable bundle containing:
#   - Full PostgreSQL database dump
#   - Encryption master key (for agent secrets)
#   - Uploaded files from storage volume
#
# Import restores all of the above into a running MI1K instance.
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.portable.yml"
ENV_FILE="${SCRIPT_DIR}/.env"

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

usage() {
  echo "Usage: $0 <command> [options]"
  echo ""
  echo "Commands:"
  echo "  export    Export data from this MI1K instance"
  echo "  import    Import data into this MI1K instance"
  echo ""
  echo "Export options:"
  echo "  --output DIR     Directory to save the backup (default: ./mi1k-backup)"
  echo "  --db-url URL     PostgreSQL connection URL (auto-detected if running in portable stack)"
  echo ""
  echo "Import options:"
  echo "  --from DIR       Directory containing the backup to restore"
  echo "  --db-url URL     PostgreSQL connection URL (auto-detected if running in portable stack)"
  echo "  --skip-db        Skip database restore (only restore files)"
  echo "  --skip-files     Skip file restore (only restore database)"
  echo ""
  echo "Examples:"
  echo "  $0 export --output ./backup"
  echo "  $0 import --from ./backup"
  exit 1
}

# ── Auto-detect database connection ──────────────────────────────────────────
detect_db_url() {
  # If running the portable stack, get credentials from .env
  if [[ -f "${ENV_FILE}" ]]; then
    source "${ENV_FILE}"
    # Check if postgres container is running
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^mi1k-postgres$'; then
      echo "postgres://mi1k:${POSTGRES_PASSWORD}@localhost:$(docker port mi1k-postgres 5432/tcp 2>/dev/null | cut -d: -f2 || echo "5432")/mi1k"
      return 0
    fi
  fi
  return 1
}

# ── Get volume mount path ───────────────────────────────────────────────────
get_paperclip_volume() {
  docker volume inspect mi1k_mi1k-data --format '{{ .Mountpoint }}' 2>/dev/null || \
  docker volume inspect deploy_mi1k-data --format '{{ .Mountpoint }}' 2>/dev/null || \
  echo ""
}

# ═════════════════════════════════════════════════════════════════════════════
# EXPORT
# ═════════════════════════════════════════════════════════════════════════════
do_export() {
  local OUTPUT_DIR="./mi1k-backup"
  local DB_URL=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --output)  OUTPUT_DIR="$2"; shift 2 ;;
      --db-url)  DB_URL="$2"; shift 2 ;;
      *) err "Unknown option: $1"; usage ;;
    esac
  done

  header "MI1K Data Export"

  # Resolve output directory
  OUTPUT_DIR="$(realpath -m "${OUTPUT_DIR}")"
  mkdir -p "${OUTPUT_DIR}"
  info "Export directory: ${OUTPUT_DIR}"

  # ── Database Export ──────────────────────────────────────────────────────
  header "Exporting database"

  if [[ -z "${DB_URL}" ]]; then
    # Try auto-detect from portable stack
    if DB_URL=$(detect_db_url); then
      ok "Auto-detected database connection"
    else
      # Try from docker exec into the postgres container
      if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'mi1k-postgres\|mi1k_postgres'; then
        info "Using Docker exec into postgres container"
        docker exec mi1k-postgres pg_dump -U mi1k -d mi1k --clean --if-exists > "${OUTPUT_DIR}/database.sql"
        ok "Database exported via Docker exec"
      else
        err "Cannot auto-detect database. Use --db-url to specify connection."
        exit 1
      fi
    fi
  fi

  if [[ ! -f "${OUTPUT_DIR}/database.sql" ]]; then
    # Export using pg_dump via the postgres container
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'mi1k-postgres'; then
      docker exec mi1k-postgres pg_dump -U mi1k -d mi1k --clean --if-exists > "${OUTPUT_DIR}/database.sql"
      ok "Database exported via Docker exec"
    elif command -v pg_dump &>/dev/null; then
      pg_dump "${DB_URL}" --clean --if-exists > "${OUTPUT_DIR}/database.sql"
      ok "Database exported via pg_dump"
    else
      err "pg_dump not available. Install postgresql-client or run export from a system with database access."
      exit 1
    fi
  fi

  DB_SIZE=$(du -sh "${OUTPUT_DIR}/database.sql" | cut -f1)
  info "Database dump size: ${DB_SIZE}"

  # ── Secrets Export ─────────────────────────────────────────────────────
  header "Exporting secrets"

  VOLUME_PATH=$(get_paperclip_volume)
  if [[ -n "${VOLUME_PATH}" ]]; then
    MASTER_KEY="${VOLUME_PATH}/instances/default/secrets/master.key"
    if [[ -f "${MASTER_KEY}" ]]; then
      cp "${MASTER_KEY}" "${OUTPUT_DIR}/master.key"
      chmod 600 "${OUTPUT_DIR}/master.key"
      ok "Master encryption key exported"
    else
      warn "No master.key found — agent secrets won't be decryptable on import"
    fi
  else
    warn "Cannot locate paperclip volume — skipping secrets export"
    warn "You can manually copy master.key from /paperclip/instances/default/secrets/"
  fi

  # ── Storage Files Export ───────────────────────────────────────────────
  header "Exporting storage files"

  if [[ -n "${VOLUME_PATH}" ]]; then
    STORAGE_DIR="${VOLUME_PATH}/instances/default/data/storage"
    if [[ -d "${STORAGE_DIR}" ]]; then
      STORAGE_SIZE=$(du -sh "${STORAGE_DIR}" 2>/dev/null | cut -f1)
      info "Storage directory size: ${STORAGE_SIZE}"
      mkdir -p "${OUTPUT_DIR}/storage"
      cp -a "${STORAGE_DIR}/." "${OUTPUT_DIR}/storage/" 2>/dev/null || true
      ok "Storage files exported"
    else
      info "No storage files found — skipping"
    fi
  else
    warn "Cannot locate paperclip volume — skipping storage export"
  fi

  # ── Export .env if present ─────────────────────────────────────────────
  if [[ -f "${ENV_FILE}" ]]; then
    cp "${ENV_FILE}" "${OUTPUT_DIR}/source.env"
    ok "Source .env saved (for reference only)"
  fi

  # ── Summary ────────────────────────────────────────────────────────────
  header "Export Complete"

  echo "  Exported to: ${OUTPUT_DIR}/"
  echo ""
  ls -lh "${OUTPUT_DIR}/"
  echo ""

  TOTAL_SIZE=$(du -sh "${OUTPUT_DIR}" | cut -f1)
  echo -e "  ${BOLD}Total export size: ${TOTAL_SIZE}${NC}"
  echo ""
  echo "  To import on another server:"
  echo "    1. Transfer this directory to the target server"
  echo "    2. Run: ./mi1k-migrate.sh import --from ${OUTPUT_DIR}"
  echo ""
}

# ═════════════════════════════════════════════════════════════════════════════
# IMPORT
# ═════════════════════════════════════════════════════════════════════════════
do_import() {
  local FROM_DIR=""
  local DB_URL=""
  local SKIP_DB=false
  local SKIP_FILES=false

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --from)       FROM_DIR="$2"; shift 2 ;;
      --db-url)     DB_URL="$2"; shift 2 ;;
      --skip-db)    SKIP_DB=true; shift ;;
      --skip-files) SKIP_FILES=true; shift ;;
      *) err "Unknown option: $1"; usage ;;
    esac
  done

  if [[ -z "${FROM_DIR}" ]]; then
    err "Missing --from option. Specify the backup directory."
    usage
  fi

  FROM_DIR="$(realpath "${FROM_DIR}")"

  if [[ ! -d "${FROM_DIR}" ]]; then
    err "Backup directory not found: ${FROM_DIR}"
    exit 1
  fi

  header "MI1K Data Import"
  info "Importing from: ${FROM_DIR}"

  # Verify MI1K is running
  if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^mi1k$'; then
    err "MI1K container is not running."
    echo "  Run ./mi1k-deploy.sh first to set up the instance, then import."
    exit 1
  fi

  # ── Confirm ────────────────────────────────────────────────────────────
  echo ""
  warn "This will REPLACE the current MI1K database and files with the backup data."
  echo ""
  read -rp "  Are you sure you want to proceed? (yes/no): " CONFIRM
  if [[ "${CONFIRM}" != "yes" ]]; then
    info "Import cancelled."
    exit 0
  fi

  # ── Stop MI1K (keep postgres running) ──────────────────────────────────
  header "Preparing for import"
  info "Stopping MI1K application..."
  docker stop mi1k 2>/dev/null || true
  ok "MI1K stopped"

  # ── Database Import ────────────────────────────────────────────────────
  if [[ "${SKIP_DB}" == "false" ]]; then
    header "Importing database"

    if [[ ! -f "${FROM_DIR}/database.sql" ]]; then
      err "No database.sql found in backup directory"
      warn "Use --skip-db to skip database restore"
      docker start mi1k
      exit 1
    fi

    DB_SIZE=$(du -sh "${FROM_DIR}/database.sql" | cut -f1)
    info "Database dump size: ${DB_SIZE}"

    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'mi1k-postgres'; then
      info "Restoring database via Docker exec..."
      docker exec -i mi1k-postgres psql -U mi1k -d mi1k < "${FROM_DIR}/database.sql"
      ok "Database restored"
    elif [[ -n "${DB_URL}" ]]; then
      info "Restoring database via psql..."
      psql "${DB_URL}" < "${FROM_DIR}/database.sql"
      ok "Database restored"
    else
      err "Cannot connect to database. Ensure mi1k-postgres container is running or use --db-url."
      docker start mi1k
      exit 1
    fi
  else
    info "Skipping database restore (--skip-db)"
  fi

  # ── Secrets Import ─────────────────────────────────────────────────────
  header "Importing secrets"

  VOLUME_PATH=$(get_paperclip_volume)
  if [[ -n "${VOLUME_PATH}" && -f "${FROM_DIR}/master.key" ]]; then
    SECRETS_DIR="${VOLUME_PATH}/instances/default/secrets"
    mkdir -p "${SECRETS_DIR}"
    cp "${FROM_DIR}/master.key" "${SECRETS_DIR}/master.key"
    # Ensure correct ownership (node user = UID 1000 in the container)
    chown 1000:1000 "${SECRETS_DIR}/master.key" 2>/dev/null || true
    chmod 600 "${SECRETS_DIR}/master.key"
    ok "Master encryption key restored"
  elif [[ -f "${FROM_DIR}/master.key" ]]; then
    warn "Cannot locate paperclip volume — copying master.key via docker cp"
    docker cp "${FROM_DIR}/master.key" mi1k:/paperclip/instances/default/secrets/master.key 2>/dev/null || \
      warn "Failed to copy master.key — agent secrets may not decrypt"
  else
    info "No master.key in backup — skipping"
  fi

  # ── Storage Files Import ───────────────────────────────────────────────
  if [[ "${SKIP_FILES}" == "false" ]]; then
    header "Importing storage files"

    if [[ -d "${FROM_DIR}/storage" ]]; then
      STORAGE_SIZE=$(du -sh "${FROM_DIR}/storage" 2>/dev/null | cut -f1)
      info "Storage files size: ${STORAGE_SIZE}"

      if [[ -n "${VOLUME_PATH}" ]]; then
        STORAGE_DEST="${VOLUME_PATH}/instances/default/data/storage"
        mkdir -p "${STORAGE_DEST}"
        cp -a "${FROM_DIR}/storage/." "${STORAGE_DEST}/"
        # Fix ownership
        chown -R 1000:1000 "${STORAGE_DEST}" 2>/dev/null || true
        ok "Storage files restored"
      else
        warn "Cannot locate volume — trying docker cp"
        docker start mi1k 2>/dev/null || true
        sleep 2
        docker cp "${FROM_DIR}/storage/." mi1k:/paperclip/instances/default/data/storage/
        docker stop mi1k 2>/dev/null || true
        ok "Storage files restored via docker cp"
      fi
    else
      info "No storage files in backup — skipping"
    fi
  else
    info "Skipping file restore (--skip-files)"
  fi

  # ── Restart MI1K ───────────────────────────────────────────────────────
  header "Starting MI1K"
  docker start mi1k
  info "Waiting for MI1K to become healthy..."

  MAX_WAIT=90
  WAITED=0
  while [[ ${WAITED} -lt ${MAX_WAIT} ]]; do
    if docker inspect mi1k --format='{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; then
      break
    fi
    echo -n "."
    sleep 3
    WAITED=$((WAITED + 3))
  done
  echo ""

  if docker inspect mi1k --format='{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; then
    ok "MI1K is healthy with imported data!"
  else
    warn "MI1K may still be starting. Check logs:"
    echo "  docker logs mi1k --tail 50"
  fi

  # ── Summary ────────────────────────────────────────────────────────────
  header "Import Complete"

  echo -e "  ${GREEN}${BOLD}Data import finished!${NC}"
  echo ""
  [[ "${SKIP_DB}" == "false" ]] && echo "  ✓ Database restored"
  [[ -f "${FROM_DIR}/master.key" ]] && echo "  ✓ Encryption key restored"
  [[ "${SKIP_FILES}" == "false" && -d "${FROM_DIR}/storage" ]] && echo "  ✓ Storage files restored"
  echo ""
  echo "  Open your MI1K instance to verify the imported data."
  echo ""
}

# ═════════════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════════════
if [[ $# -lt 1 ]]; then
  usage
fi

COMMAND="$1"
shift

case "${COMMAND}" in
  export) do_export "$@" ;;
  import) do_import "$@" ;;
  *)      err "Unknown command: ${COMMAND}"; usage ;;
esac
