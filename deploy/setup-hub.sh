#!/bin/bash
# Mi1k Hub — Central Tracking Server
# Run on VPS: bash setup-hub.sh
# Sets up a tiny Node.js server that receives pings from Mi1k installations
# Dashboard at http://YOUR_VPS_IP:3200/dashboard
set -e

HUB_DIR="/opt/mi1k-hub"
PORT=3200

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Mi1k Hub Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Install Node.js if missing
if ! command -v node &>/dev/null; then
  echo "[1/4] Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo "[1/4] Node.js already installed: $(node -v)"
fi

# 2. Create hub directory
echo "[2/4] Setting up $HUB_DIR..."
mkdir -p "$HUB_DIR"

# 3. Write the hub server
echo "[3/4] Writing hub server..."
cat > "$HUB_DIR/hub.js" << 'HUBEOF'
const http = require("http");
const { Database } = require("better-sqlite3-wrapper") ?? (() => {
  // Inline SQLite via better-sqlite3
  const Database = require("better-sqlite3");
  return { Database };
})();
const path = require("path");
const fs = require("fs");

// Use better-sqlite3 directly
let db;
try {
  const BetterSqlite3 = require("better-sqlite3");
  db = new BetterSqlite3(path.join(__dirname, "hub.db"));
} catch {
  console.error("better-sqlite3 not found. Run: cd /opt/mi1k-hub && npm install better-sqlite3");
  process.exit(1);
}

db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS pings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instance_id TEXT NOT NULL,
    instance_name TEXT,
    ip_address TEXT,
    companies INTEGER DEFAULT 0,
    agents INTEGER DEFAULT 0,
    tasks INTEGER DEFAULT 0,
    projects INTEGER DEFAULT 0,
    routines INTEGER DEFAULT 0,
    goals INTEGER DEFAULT 0,
    documents INTEGER DEFAULT 0,
    daily_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    git_commit TEXT,
    git_behind INTEGER DEFAULT 0,
    update_available INTEGER DEFAULT 0,
    version TEXT,
    os_platform TEXT,
    os_hostname TEXT,
    pinged_at TEXT DEFAULT (datetime('now'))
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS instances (
    instance_id TEXT PRIMARY KEY,
    instance_name TEXT,
    ip_address TEXT,
    first_seen TEXT DEFAULT (datetime('now')),
    last_seen TEXT DEFAULT (datetime('now')),
    last_ping TEXT
  )
`);

const upsertInstance = db.prepare(`
  INSERT INTO instances (instance_id, instance_name, ip_address, last_seen, last_ping)
  VALUES (?, ?, ?, datetime('now'), ?)
  ON CONFLICT(instance_id) DO UPDATE SET
    instance_name = excluded.instance_name,
    ip_address = excluded.ip_address,
    last_seen = datetime('now'),
    last_ping = excluded.last_ping
`);

const insertPing = db.prepare(`
  INSERT INTO pings (instance_id, instance_name, ip_address, companies, agents, tasks, projects, routines, goals, documents, daily_tokens, total_tokens, git_commit, git_behind, update_available, version, os_platform, os_hostname)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const PORT = parseInt(process.env.PORT || "3200");

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try { resolve(JSON.parse(body)); } catch { reject(new Error("Invalid JSON")); }
    });
  });
}

function timeAgo(iso) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  return Math.floor(h / 24) + "d ago";
}

function dashboard() {
  const rows = db.prepare(`
    SELECT i.instance_id, i.instance_name, i.ip_address, i.first_seen, i.last_seen,
      p.companies, p.agents, p.tasks, p.projects, p.routines, p.goals, p.documents,
      p.daily_tokens, p.total_tokens, p.git_commit, p.git_behind, p.update_available,
      p.version, p.os_platform, p.os_hostname, p.pinged_at
    FROM instances i
    LEFT JOIN pings p ON p.id = (
      SELECT id FROM pings WHERE instance_id = i.instance_id ORDER BY id DESC LIMIT 1
    )
    ORDER BY i.last_seen DESC
  `).all();

  const totalInstances = rows.length;
  const totalAgents = rows.reduce((s, r) => s + (r.agents || 0), 0);
  const totalTasks = rows.reduce((s, r) => s + (r.tasks || 0), 0);
  const updatesAvailable = rows.filter(r => r.update_available).length;

  let tableRows = rows.map(r => `
    <tr>
      <td class="px-4 py-3 font-medium">${r.instance_name || r.instance_id}</td>
      <td class="px-4 py-3 text-gray-500 text-xs font-mono">${r.ip_address || "-"}</td>
      <td class="px-4 py-3">${r.companies || 0}</td>
      <td class="px-4 py-3">${r.agents || 0}</td>
      <td class="px-4 py-3">${r.tasks || 0}</td>
      <td class="px-4 py-3">${r.projects || 0}</td>
      <td class="px-4 py-3">${r.routines || 0}</td>
      <td class="px-4 py-3 font-mono text-xs">${r.daily_tokens ? (r.daily_tokens / 1000).toFixed(0) + "K" : "-"}</td>
      <td class="px-4 py-3 text-xs">${r.version || "-"}</td>
      <td class="px-4 py-3 text-xs">${r.update_available ? '<span class="text-amber-600 font-medium">Update available</span>' : '<span class="text-green-600">Up to date</span>'}</td>
      <td class="px-4 py-3 text-xs text-gray-500">${timeAgo(r.pinged_at)}</td>
      <td class="px-4 py-3 text-xs text-gray-400">${r.os_platform || "-"}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <title>Mi1k Hub</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="60">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen p-6">
  <div class="max-w-7xl mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <h1 class="text-xl font-bold text-gray-800">Mi1k Hub</h1>
      <span class="text-sm text-gray-400">Auto-refreshes every 60s</span>
    </div>

    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <p class="text-2xl font-bold text-gray-800">${totalInstances}</p>
        <p class="text-xs text-gray-500">Installations</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <p class="text-2xl font-bold text-gray-800">${totalAgents}</p>
        <p class="text-xs text-gray-500">Total Agents</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <p class="text-2xl font-bold text-gray-800">${totalTasks}</p>
        <p class="text-xs text-gray-500">Total Tasks</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <p class="text-2xl font-bold ${updatesAvailable ? 'text-amber-600' : 'text-green-600'}">${updatesAvailable}</p>
        <p class="text-xs text-gray-500">Need Updates</p>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table class="w-full text-sm text-left">
        <thead class="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
          <tr>
            <th class="px-4 py-3">Instance</th>
            <th class="px-4 py-3">IP</th>
            <th class="px-4 py-3">Co.</th>
            <th class="px-4 py-3">Agents</th>
            <th class="px-4 py-3">Tasks</th>
            <th class="px-4 py-3">Projects</th>
            <th class="px-4 py-3">Routines</th>
            <th class="px-4 py-3">Tokens/day</th>
            <th class="px-4 py-3">Version</th>
            <th class="px-4 py-3">Git</th>
            <th class="px-4 py-3">Last Ping</th>
            <th class="px-4 py-3">OS</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          ${tableRows || '<tr><td colspan="12" class="px-4 py-8 text-center text-gray-400">No installations have pinged yet.</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  if (req.method === "POST" && req.url === "/ping") {
    try {
      const d = await parseBody(req);
      const instanceId = d.instanceId || "unknown";
      insertPing.run(
        instanceId, d.instanceName, ip,
        d.companies || 0, d.agents || 0, d.tasks || 0, d.projects || 0,
        d.routines || 0, d.goals || 0, d.documents || 0,
        d.dailyTokens || 0, d.totalTokens || 0,
        d.gitCommit, d.gitBehind || 0, d.updateAvailable ? 1 : 0,
        d.version, d.osPlatform, d.osHostname
      );
      upsertInstance.run(instanceId, d.instanceName, ip, JSON.stringify(d));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === "GET" && (req.url === "/dashboard" || req.url === "/")) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(dashboard());
    return;
  }

  if (req.method === "GET" && req.url === "/api/instances") {
    const rows = db.prepare("SELECT * FROM instances ORDER BY last_seen DESC").all();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(rows));
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Mi1k Hub listening on port ${PORT}`);
  console.log(`Dashboard: http://0.0.0.0:${PORT}/dashboard`);
});
HUBEOF

# 4. Create package.json and install deps
echo "[4/4] Installing dependencies..."
cat > "$HUB_DIR/package.json" << 'PKGEOF'
{
  "name": "mi1k-hub",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "better-sqlite3": "^11.0.0"
  }
}
PKGEOF

cd "$HUB_DIR" && npm install --production 2>&1 | tail -3

# 5. Create systemd service
echo "Creating systemd service..."
cat > /etc/systemd/system/mi1k-hub.service << SVCEOF
[Unit]
Description=Mi1k Hub — Central Tracking Server
After=network.target

[Service]
Type=simple
WorkingDirectory=$HUB_DIR
ExecStart=$(which node) $HUB_DIR/hub.js
Restart=always
RestartSec=5
Environment=PORT=$PORT

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable mi1k-hub
systemctl restart mi1k-hub

# 6. Open firewall
if command -v ufw &>/dev/null; then
  ufw allow $PORT/tcp 2>/dev/null || true
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Mi1k Hub is running!"
echo "  Dashboard: http://$(hostname -I | awk '{print $1}'):$PORT/dashboard"
echo "  Ping URL:  http://$(hostname -I | awk '{print $1}'):$PORT/ping"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
