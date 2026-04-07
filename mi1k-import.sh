#!/bin/bash
# Mi1k Import — run this on the new Mac to set everything up from scratch
# Usage: bash mi1k-import.sh ~/Desktop/mi1k-transfer.tar.gz
set -e

ARCHIVE="${1:-$HOME/Desktop/mi1k-transfer.tar.gz}"
INSTALL_DIR="$HOME/Mi1k"
DOCKER="/usr/local/bin/docker"

alert() {
  osascript -e "display dialog \"$1\" buttons {\"OK\"} default button \"OK\" with title \"Mi1k Setup\"" 2>/dev/null || echo "$1"
}

echo "======================================"
echo "  Mi1k Import"
echo "======================================"

# 1. Check archive exists
if [ ! -f "$ARCHIVE" ]; then
  echo "ERROR: Archive not found at $ARCHIVE"
  echo "Usage: bash mi1k-import.sh /path/to/mi1k-transfer.tar.gz"
  exit 1
fi

# 2. Install Homebrew if missing
if ! command -v brew &>/dev/null; then
  echo "[1/7] Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
  echo "[1/7] Homebrew already installed"
fi

# 3. Install Docker Desktop if missing
if [ ! -d "/Applications/Docker.app" ]; then
  echo "[2/7] Installing Docker Desktop..."
  brew install --cask docker
else
  echo "[2/7] Docker Desktop already installed"
fi

# 4. Start Docker
echo "[3/7] Starting Docker Desktop..."
open -a Docker
echo "      Waiting for Docker to be ready..."
for i in $(seq 1 40); do
  if $DOCKER info > /dev/null 2>&1; then
    echo "      Docker is ready!"
    break
  fi
  sleep 3
done
if ! $DOCKER info > /dev/null 2>&1; then
  alert "Docker failed to start. Please open Docker Desktop manually and re-run this script."
  exit 1
fi

# 5. Extract archive
echo "[4/7] Extracting archive..."
mkdir -p "$INSTALL_DIR"
tar xzf "$ARCHIVE" -C "$INSTALL_DIR" --strip-components=1
echo "      Extracted to $INSTALL_DIR"

# 6. Fix .env for new machine
echo "[5/7] Configuring for this machine..."
cd "$INSTALL_DIR/project"
sed -i '' \
  's|PAPERCLIP_PUBLIC_URL=.*|PAPERCLIP_PUBLIC_URL=http://localhost:3100|g' \
  .env

# Add Claude OAuth token from this Mac's keychain if available
CLAUDE_TOKEN=$(security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['claudeAiOauth']['accessToken'])" 2>/dev/null || echo "")
if [ -n "$CLAUDE_TOKEN" ]; then
  # Update or add the token
  if grep -q "CLAUDE_CODE_OAUTH_TOKEN" .env; then
    sed -i '' "s|CLAUDE_CODE_OAUTH_TOKEN=.*|CLAUDE_CODE_OAUTH_TOKEN=$CLAUDE_TOKEN|g" .env
  else
    echo "CLAUDE_CODE_OAUTH_TOKEN=$CLAUDE_TOKEN" >> .env
  fi
  echo "      Claude auth token configured from Keychain"
else
  echo "      NOTE: Claude token not found in Keychain — you may need to log in manually"
fi

# 7. Start containers and restore data
echo "[6/7] Starting containers and restoring database..."
$DOCKER compose up -d db
echo "      Waiting for database..."
for i in $(seq 1 30); do
  if $DOCKER compose exec db pg_isready -U paperclip > /dev/null 2>&1; then
    break
  fi
  sleep 2
done

# Stop server before restore
$DOCKER compose stop server 2>/dev/null || true

# Wipe and restore database
$DOCKER compose exec db psql -U paperclip postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='paperclip';" > /dev/null 2>&1 || true
$DOCKER compose exec db psql -U paperclip postgres -c "DROP DATABASE IF EXISTS paperclip;" > /dev/null 2>&1
$DOCKER compose exec db psql -U paperclip postgres -c "CREATE DATABASE paperclip OWNER paperclip;" > /dev/null 2>&1
$DOCKER compose exec -T db psql -U paperclip paperclip < "$INSTALL_DIR/database.sql" > /dev/null 2>&1
echo "      Database restored"

# Restore paperclip volume (agents, skills, context, config)
$DOCKER compose up -d server
sleep 3
$DOCKER run --rm \
  -v mi1k_paperclip-data:/data \
  -v "$INSTALL_DIR/volume":/backup \
  alpine sh -c "cd /data && tar xzf /backup/paperclip-volume.tar.gz"
echo "      Volume data restored"

# Restart server with fresh volume
$DOCKER compose restart server

# 8. Wait and open
echo "[7/7] Waiting for Mi1k to be ready..."
for i in $(seq 1 40); do
  if curl -sf http://localhost:3100/api/health > /dev/null 2>&1; then
    echo "      Mi1k is ready!"
    break
  fi
  sleep 3
done

# Install Desktop apps
echo ""
echo "Installing Desktop launcher apps..."

# Mi1k Start app
mkdir -p "$HOME/Desktop/Mi1k.app/Contents/MacOS"
cat > "$HOME/Desktop/Mi1k.app/Contents/MacOS/Mi1k" << 'APPEOF'
#!/bin/bash
DOCKER="/usr/local/bin/docker"
if ! pgrep -x "Docker" > /dev/null 2>&1; then
  open -a Docker
  for i in $(seq 1 30); do $DOCKER info > /dev/null 2>&1 && break; sleep 2; done
fi
cd "$HOME/Mi1k/project"
$DOCKER compose up --build -d
for i in $(seq 1 40); do
  curl -sf http://localhost:3100/api/health > /dev/null 2>&1 && break
  sleep 3
done
open http://localhost:3100
APPEOF
cat > "$HOME/Desktop/Mi1k.app/Contents/Info.plist" << 'PLISTEOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Mi1k</string>
  <key>CFBundleExecutable</key><string>Mi1k</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleIdentifier</key><string>tech.khosha.mi1k</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
</dict></plist>
PLISTEOF
chmod +x "$HOME/Desktop/Mi1k.app/Contents/MacOS/Mi1k"
xattr -cr "$HOME/Desktop/Mi1k.app" 2>/dev/null || true

# Mi1k Stop app
mkdir -p "$HOME/Desktop/Mi1k Stop.app/Contents/MacOS"
cat > "$HOME/Desktop/Mi1k Stop.app/Contents/MacOS/Mi1k Stop" << 'APPEOF'
#!/bin/bash
cd "$HOME/Mi1k/project"
/usr/local/bin/docker compose down
osascript -e 'display notification "Mi1k stopped." with title "Mi1k"'
APPEOF
cat > "$HOME/Desktop/Mi1k Stop.app/Contents/Info.plist" << 'PLISTEOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Mi1k Stop</string>
  <key>CFBundleExecutable</key><string>Mi1k Stop</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleIdentifier</key><string>tech.khosha.mi1k.stop</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
</dict></plist>
PLISTEOF
chmod +x "$HOME/Desktop/Mi1k Stop.app/Contents/MacOS/Mi1k Stop"
xattr -cr "$HOME/Desktop/Mi1k Stop.app" 2>/dev/null || true

open http://localhost:3100

echo ""
echo "======================================"
echo "  Mi1k is running at http://localhost:3100"
echo "  Use Mi1k.app on Desktop to start/stop"
echo "======================================"
