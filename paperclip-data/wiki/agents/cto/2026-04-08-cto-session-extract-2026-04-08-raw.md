---
agent: cto
date: 2026-04-08T14:05:20.210Z
type: session_extract
tags: [cto, session-extract, raw]
source: session:fd08343d-4a27-4a93-a7a7-54264f306d24
---

# CTO session extract — 2026-04-08 (raw)

## Raw Session Excerpt

```
 /etc/cron.d/arrowhead-tally\nfi","newString":"if [ -f /opt/arrowhead/deploy/cron/arrowhead-tally ]; then\n    cp /opt/arrowhead/deploy/cron/arrowhead-tally /etc/cron.d/arrowhead-tally\nfi\n\n# Set up Python venv for Tally sync\nif [ -d /opt/arrowhead/tally-sync ]; then\n    python3.12 -m venv /opt/arrowhead/venv\n    /opt/arrowhead/venv/bin/pip install --quiet -r /opt/arrowhead/tally-sync/requirements.txt\n    chown -R arrowhead:arrowhead /opt/arrowhead/venv\n    echo \"Tally sync venv ready at /opt/arrowhead/venv\"\nfi","originalFile":"#!/bin/bash\n# Arrowhead VPS bootstrap script\n# Run as root on a fresh Hostinger VPS (Ubuntu 22.04)\n# Usage: bash setup-vps.sh\n#\n# After running this script:\n#   1. Add GitHub Actions SSH pubkey to /home/arrowhead/.ssh/authorized_keys\n#   2. Update /opt/arrowhead/.env with real credentials\n#   3. Run certbot for SSL\n#   4. Configure GitHub repo secrets (VPS_HOST, VPS_SSH_KEY)\n\nset -euo pipefail\n\nARROWHEAD_DB_PASS=\"${ARROWHEAD_DB_PASS:-CHANGE_ME_NOW}\"\nREDIS_PASS=\"${REDIS_PASS:-CHANGE_ME_NOW}\"\n\necho \"=== [1/10] System update ===\"\napt update && apt upgrade -y\napt install -y curl wget git build-essential ufw fail2ban logrotate\n\necho \"=== [2/10] Firewall ===\"\nufw --force enable\nufw allow OpenSSH\nufw allow 80/tcp\nufw allow 443/tcp\n\necho \"=== [3/10] Deploy user ===\"\nif ! id -u arrowhead &>/dev/null; then\n    adduser arrowhead --disabled-password --gecos \"\"\nfi\nmkdir -p /home/arrowhead/.ssh\nchmod 700 /home/arrowhead/.ssh\ntouch /home/arrowhead/.ssh/authorized_keys\nchmod 600 /home/arrowhead/.ssh/authorized_keys\nchown -R arrowhead:arrowhead /home/arrowhead/.ssh\n\necho \"=== [4/10] PostgreSQL 16 ===\"\nif ! command -v psql &>/dev/null; then\n    sh -c 'echo \"deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main\" > /etc/apt/sources.list.d/pgdg.list'\n    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -\n    apt update && apt install -y postgres
```
