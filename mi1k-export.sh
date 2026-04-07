#!/bin/bash
# Mi1k Export — packages everything needed to run on another Mac
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXPORT_DIR="$HOME/Desktop/mi1k-transfer"
DOCKER="/usr/local/bin/docker"

echo "======================================"
echo "  Mi1k Export"
echo "======================================"

# Clean previous export
rm -rf "$EXPORT_DIR"
mkdir -p "$EXPORT_DIR/project" "$EXPORT_DIR/volume" "$EXPORT_DIR/agents"

cd "$PROJECT_DIR"

# 1. Make sure containers are running
echo ""
echo "[1/5] Checking containers..."
$DOCKER compose up -d --no-build > /dev/null 2>&1
sleep 3

# 2. Dump database
echo "[2/5] Exporting database..."
$DOCKER compose exec db pg_dump -U paperclip paperclip > "$EXPORT_DIR/database.sql"
echo "      Done — $(wc -l < "$EXPORT_DIR/database.sql") lines"

# 3. Export paperclip volume data (agents, skills, context, config)
echo "[3/5] Exporting agent files and volume data..."
$DOCKER run --rm \
  -v mi1k_paperclip-data:/data \
  -v "$EXPORT_DIR/volume":/backup \
  alpine sh -c "cd /data && tar czf /backup/paperclip-volume.tar.gz --exclude='.cache' ."
echo "      Done — $(du -sh "$EXPORT_DIR/volume/paperclip-volume.tar.gz" | cut -f1)"

# 4. Copy project files (excluding node_modules, dist, .git)
echo "[4/5] Copying project files..."
rsync -a --exclude='node_modules' --exclude='.git' --exclude='ui/dist' \
  "$PROJECT_DIR/" "$EXPORT_DIR/project/"
echo "      Done"

# 5. Bundle everything into a single archive on Desktop
echo "[5/5] Creating final archive..."
cd "$HOME/Desktop"
tar czf mi1k-transfer.tar.gz mi1k-transfer/
rm -rf "$EXPORT_DIR"
echo "      Done — $(du -sh "$HOME/Desktop/mi1k-transfer.tar.gz" | cut -f1)"

echo ""
echo "======================================"
echo "  Export complete!"
echo "  File: ~/Desktop/mi1k-transfer.tar.gz"
echo ""
echo "  On your new Mac, run:"
echo "  curl -fsSL https://raw.githubusercontent.com/paperclipai/paperclip/master/install.sh | bash"
echo "  — OR just copy mi1k-import.sh to the new Mac and run it"
echo "======================================"
