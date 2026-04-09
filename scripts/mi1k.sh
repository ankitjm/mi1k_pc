#!/bin/bash
# mi1k — service control for macOS (launchd)
# Usage: mi1k start | stop | restart | status | logs [server|middleware]

set -e

LABEL_SERVER="tech.khosha.mi1k"
LABEL_MIDDLEWARE="tech.khosha.mi1k-middleware"
PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST_SERVER="$PLIST_DIR/$LABEL_SERVER.plist"
PLIST_MIDDLEWARE="$PLIST_DIR/$LABEL_MIDDLEWARE.plist"
APP_DIR="$HOME/Documents/mi1k"
LOG_SERVER="$APP_DIR/logs/mi1k-launchd.log"
LOG_MIDDLEWARE="$APP_DIR/middleware/logs/daemon.log"

red()    { printf "\033[0;31m%s\033[0m\n" "$1"; }
green()  { printf "\033[0;32m%s\033[0m\n" "$1"; }
yellow() { printf "\033[0;33m%s\033[0m\n" "$1"; }

check_pg() {
  if ! /opt/homebrew/bin/pg_isready -q 2>/dev/null; then
    yellow "PostgreSQL not running — starting..."
    brew services start postgresql@17
    sleep 3
  fi
}

is_loaded() {
  launchctl list "$1" >/dev/null 2>&1
}

do_start() {
  echo "Starting Mi1k..."
  check_pg
  mkdir -p "$APP_DIR/logs" "$APP_DIR/middleware/logs"

  if is_loaded "$LABEL_SERVER"; then
    yellow "Server already running"
  else
    launchctl load "$PLIST_SERVER"
    green "Server started"
  fi

  # Wait for server health before starting middleware
  echo "Waiting for server..."
  for i in $(seq 1 30); do
    if curl -sf http://localhost:3100/api/health >/dev/null 2>&1; then
      green "Server is ready"
      break
    fi
    sleep 2
  done

  if is_loaded "$LABEL_MIDDLEWARE"; then
    yellow "Middleware already running"
  else
    launchctl load "$PLIST_MIDDLEWARE"
    green "Middleware started"
  fi

  echo ""
  green "Mi1k is running — http://localhost:3100"
}

do_stop() {
  echo "Stopping Mi1k..."

  if is_loaded "$LABEL_MIDDLEWARE"; then
    launchctl unload "$PLIST_MIDDLEWARE"
    green "Middleware stopped"
  else
    yellow "Middleware not running"
  fi

  if is_loaded "$LABEL_SERVER"; then
    launchctl unload "$PLIST_SERVER"
    green "Server stopped"
  else
    yellow "Server not running"
  fi
}

do_restart() {
  do_stop
  sleep 2
  do_start
}

do_status() {
  echo "Mi1k Status"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # PostgreSQL
  if /opt/homebrew/bin/pg_isready -q 2>/dev/null; then
    green "  PostgreSQL:  running"
  else
    red   "  PostgreSQL:  stopped"
  fi

  # Server
  if is_loaded "$LABEL_SERVER"; then
    if curl -sf http://localhost:3100/api/health >/dev/null 2>&1; then
      green "  Server:      running (port 3100)"
    else
      yellow "  Server:      loaded but not healthy"
    fi
  else
    red   "  Server:      stopped"
  fi

  # Middleware
  if is_loaded "$LABEL_MIDDLEWARE"; then
    green "  Middleware:   running"
  else
    red   "  Middleware:   stopped"
  fi

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

do_logs() {
  case "${2:-all}" in
    server)     tail -f "$LOG_SERVER" ;;
    middleware) tail -f "$LOG_MIDDLEWARE" ;;
    all|*)      tail -f "$LOG_SERVER" "$LOG_MIDDLEWARE" ;;
  esac
}

case "${1:-}" in
  start)   do_start ;;
  stop)    do_stop ;;
  restart) do_restart ;;
  status)  do_status ;;
  logs)    do_logs "$@" ;;
  *)
    echo "Usage: mi1k {start|stop|restart|status|logs [server|middleware]}"
    exit 1
    ;;
esac
