#!/bin/bash
# Mi1k Service Setup — generates launchd plists with correct paths for this machine
# Usage: ./scripts/setup-services.sh "Instance Name"
set -e

INSTANCE_NAME="${1:-CHANGE_ME}"
APP_DIR="$HOME/Documents/mi1k"
NODE_PATH="$(which node)"
NODE_DIR="$(dirname "$NODE_PATH")"
PLIST_DIR="$HOME/Library/LaunchAgents"
HUB_URL="http://187.77.12.140:3200"

if [ ! -f "$APP_DIR/package.json" ]; then
  echo "Error: Mi1k not found at $APP_DIR"
  exit 1
fi

if [ -z "$NODE_PATH" ]; then
  echo "Error: Node.js not found. Install Node.js 20+ first."
  exit 1
fi

echo "Setting up Mi1k services..."
echo "  App dir:       $APP_DIR"
echo "  Node:          $NODE_PATH"
echo "  Instance name: $INSTANCE_NAME"

mkdir -p "$APP_DIR/logs"
mkdir -p "$APP_DIR/middleware/logs"
mkdir -p "$PLIST_DIR"

# ── Server plist ──────────────────────────────────────────────────────
cat > "$PLIST_DIR/tech.khosha.mi1k.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>tech.khosha.mi1k</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>cd $APP_DIR &amp;&amp; PAPERCLIP_HOME=$APP_DIR/paperclip-data PAPERCLIP_INSTANCE_ID=default PAPERCLIP_MIGRATION_AUTO_APPLY=true MI1K_HUB_URL=$HUB_URL MI1K_INSTANCE_NAME=$INSTANCE_NAME $NODE_PATH server/node_modules/tsx/dist/cli.mjs server/src/index.ts</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$APP_DIR/logs/mi1k-launchd.log</string>
    <key>StandardErrorPath</key>
    <string>$APP_DIR/logs/mi1k-launchd.err</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>$NODE_DIR:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
        <key>HOME</key>
        <string>$HOME</string>
    </dict>
</dict>
</plist>
PLIST

# ── Middleware plist ──────────────────────────────────────────────────
cat > "$PLIST_DIR/tech.khosha.mi1k-middleware.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>tech.khosha.mi1k-middleware</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>cd $APP_DIR/middleware &amp;&amp; mkdir -p logs &amp;&amp; MI1K_HUB_URL=$HUB_URL MI1K_INSTANCE_NAME=$INSTANCE_NAME DATABASE_URL=postgres://paperclip:paperclip@localhost:5432/paperclip $NODE_PATH --experimental-strip-types src/index.ts</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>ThrottleInterval</key>
    <integer>30</integer>
    <key>StandardOutPath</key>
    <string>$APP_DIR/middleware/logs/daemon.log</string>
    <key>StandardErrorPath</key>
    <string>$APP_DIR/middleware/logs/daemon.err</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>$NODE_DIR:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
        <key>HOME</key>
        <string>$HOME</string>
    </dict>
</dict>
</plist>
PLIST

# ── mi1k command ─────────────────────────────────────────────────────
mkdir -p "$HOME/bin"
ln -sf "$APP_DIR/scripts/mi1k.sh" "$HOME/bin/mi1k"

# Add to PATH if not already there
if ! grep -q 'HOME/bin' "$HOME/.zshrc" 2>/dev/null; then
  echo 'export PATH="$HOME/bin:$PATH"' >> "$HOME/.zshrc"
fi

echo ""
echo "Services installed. Run: source ~/.zshrc && mi1k start"
echo ""
