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
const path = require("path");

let db;
try {
  const BetterSqlite3 = require("better-sqlite3");
  db = new BetterSqlite3(path.join(__dirname, "hub.db"));
} catch {
  console.error("better-sqlite3 not found. Run: cd /opt/mi1k-hub && npm install better-sqlite3");
  process.exit(1);
}

db.pragma("journal_mode = WAL");

// --- Original schema ---
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
    os_hostname TEXT PRIMARY KEY,
    instance_id TEXT,
    instance_name TEXT,
    ip_address TEXT,
    first_seen TEXT DEFAULT (datetime('now')),
    last_seen TEXT DEFAULT (datetime('now')),
    last_ping TEXT
  )
`);

// --- Phase 1: persist all 33 reporter fields ---
[
  "ALTER TABLE pings ADD COLUMN daily_cost_cents INTEGER DEFAULT 0",
  "ALTER TABLE pings ADD COLUMN total_cost_cents INTEGER DEFAULT 0",
  "ALTER TABLE pings ADD COLUMN tasks_done INTEGER DEFAULT 0",
  "ALTER TABLE pings ADD COLUMN tasks_in_progress INTEGER DEFAULT 0",
  "ALTER TABLE pings ADD COLUMN tasks_todo INTEGER DEFAULT 0",
  "ALTER TABLE pings ADD COLUMN tasks_blocked INTEGER DEFAULT 0",
  "ALTER TABLE pings ADD COLUMN tasks_backlog INTEGER DEFAULT 0",
  "ALTER TABLE pings ADD COLUMN agents_active INTEGER DEFAULT 0",
  "ALTER TABLE pings ADD COLUMN agents_paused INTEGER DEFAULT 0",
  "ALTER TABLE pings ADD COLUMN runs_total INTEGER DEFAULT 0",
  "ALTER TABLE pings ADD COLUMN runs_completed INTEGER DEFAULT 0",
  "ALTER TABLE pings ADD COLUMN runs_failed INTEGER DEFAULT 0",
  "ALTER TABLE pings ADD COLUMN active_routines INTEGER DEFAULT 0",
  "ALTER TABLE pings ADD COLUMN open_incidents INTEGER DEFAULT 0",
  "ALTER TABLE pings ADD COLUMN last_activity_at TEXT",
].forEach(function(sql) { try { db.exec(sql); } catch(e) { /* column exists */ } });

// --- Prepared statements ---
const upsertInstance = db.prepare(
  "INSERT INTO instances (os_hostname, instance_id, instance_name, ip_address, last_seen, last_ping) " +
  "VALUES (?, ?, ?, ?, datetime('now'), ?) " +
  "ON CONFLICT(os_hostname) DO UPDATE SET " +
  "instance_id = excluded.instance_id, " +
  "instance_name = CASE WHEN excluded.instance_name != '' THEN excluded.instance_name ELSE instances.instance_name END, " +
  "ip_address = excluded.ip_address, " +
  "last_seen = datetime('now'), last_ping = excluded.last_ping"
);

const insertPing = db.prepare(
  "INSERT INTO pings (" +
  "instance_id, instance_name, ip_address, " +
  "companies, agents, tasks, projects, routines, goals, documents, " +
  "daily_tokens, total_tokens, daily_cost_cents, total_cost_cents, " +
  "tasks_done, tasks_in_progress, tasks_todo, tasks_blocked, tasks_backlog, " +
  "agents_active, agents_paused, " +
  "runs_total, runs_completed, runs_failed, " +
  "active_routines, open_incidents, last_activity_at, " +
  "git_commit, git_behind, update_available, version, os_platform, os_hostname" +
  ") VALUES (" +
  "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?" +
  ")"
);

const PORT = parseInt(process.env.PORT || "3200");

function parseBody(req) {
  return new Promise(function(resolve, reject) {
    var body = "";
    req.on("data", function(c) { body += c; });
    req.on("end", function() {
      try { resolve(JSON.parse(body)); } catch(e) { reject(new Error("Invalid JSON")); }
    });
  });
}

// --- Helpers ---
function timeAgo(iso) {
  if (!iso) return "never";
  var ts = iso.indexOf("T") >= 0 ? iso : iso.replace(" ", "T") + "Z";
  var diff = Date.now() - new Date(ts).getTime();
  if (isNaN(diff)) return "never";
  var m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return m + "m ago";
  var h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  return Math.floor(h / 24) + "d ago";
}
function fmtTok(n) {
  if (!n) return "0";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1000) return Math.round(n / 1000) + "K";
  return String(n);
}
function fmtCost(c) {
  if (!c) return "$0";
  return "$" + (c / 100).toFixed(2);
}
function esc(s) {
  if (!s) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function statusOf(lastSeen) {
  if (!lastSeen) return { label: "Unknown", dot: "#888", ord: 3 };
  var ts = lastSeen.indexOf("T") >= 0 ? lastSeen : lastSeen.replace(" ", "T") + "Z";
  var h = (Date.now() - new Date(ts).getTime()) / 3.6e6;
  if (h < 2) return { label: "Online", dot: "#22C55E", ord: 0 };
  if (h < 6) return { label: "Stale", dot: "#F59E0B", ord: 1 };
  return { label: "Offline", dot: "#DC2625", ord: 2 };
}
function redIf(v) {
  v = v || 0;
  if (v > 0) return '<span style="color:#DC2625;font-weight:600">' + v + '</span>';
  return "0";
}

// --- Dashboard ---
function dashboard() {
  var rows = db.prepare(
    "SELECT i.os_hostname, i.instance_id, i.instance_name, i.ip_address, i.first_seen, i.last_seen, " +
    "p.companies, p.agents, p.tasks, p.projects, p.routines, p.goals, p.documents, " +
    "p.daily_tokens, p.total_tokens, p.git_commit, p.git_behind, p.update_available, " +
    "p.version, p.os_platform, p.os_hostname AS p_hostname, p.pinged_at, " +
    "json_extract(i.last_ping, '$.dailyCostCents') AS jDC, " +
    "json_extract(i.last_ping, '$.totalCostCents') AS jTC, " +
    "json_extract(i.last_ping, '$.tasksDone') AS jTD, " +
    "json_extract(i.last_ping, '$.tasksInProgress') AS jTA, " +
    "json_extract(i.last_ping, '$.tasksTodo') AS jTT, " +
    "json_extract(i.last_ping, '$.tasksBlocked') AS jTB, " +
    "json_extract(i.last_ping, '$.tasksBacklog') AS jTBL, " +
    "json_extract(i.last_ping, '$.agentsActive') AS jAA, " +
    "json_extract(i.last_ping, '$.agentsPaused') AS jAP, " +
    "json_extract(i.last_ping, '$.runsTotal') AS jRT, " +
    "json_extract(i.last_ping, '$.runsCompleted') AS jRC, " +
    "json_extract(i.last_ping, '$.runsFailed') AS jRF, " +
    "json_extract(i.last_ping, '$.activeRoutines') AS jAR, " +
    "json_extract(i.last_ping, '$.openIncidents') AS jOI, " +
    "json_extract(i.last_ping, '$.lastActivityAt') AS jLA, " +
    "(SELECT COUNT(*) FROM pings WHERE os_hostname = i.os_hostname) AS pingCount " +
    "FROM instances i LEFT JOIN pings p ON p.id = (" +
    "SELECT id FROM pings WHERE os_hostname = i.os_hostname ORDER BY id DESC LIMIT 1)"
  ).all();

  // Enrich and sort: online > stale > offline, then by recency
  var data = rows.map(function(r) {
    var st = statusOf(r.last_seen);
    r.st = st;
    r.dCost = r.jDC || 0;   r.tCost = r.jTC || 0;
    r.done = r.jTD || 0;    r.act = r.jTA || 0;
    r.todo = r.jTT || 0;    r.blk = r.jTB || 0;    r.bkl = r.jTBL || 0;
    r.aAct = r.jAA || 0;    r.aPau = r.jAP || 0;
    r.rT = r.jRT || 0;      r.rC = r.jRC || 0;     r.rF = r.jRF || 0;
    r.aRt = r.jAR || 0;     r.oI = r.jOI || 0;     r.lA = r.jLA || "";
    return r;
  }).sort(function(a, b) {
    return a.st.ord - b.st.ord || new Date(b.last_seen || 0) - new Date(a.last_seen || 0);
  });

  // --- Aggregates ---
  var n = data.length;
  var on = data.filter(function(r) { return r.st.label === "Online"; }).length;
  var sAA = 0, sA = 0, sT = 0, sD = 0, sB = 0, sI = 0, sR = 0, sF = 0, sC = 0, sTk = 0;
  data.forEach(function(r) {
    sAA += r.aAct; sA += (r.agents || 0); sT += (r.tasks || 0); sD += r.done;
    sB += r.blk; sI += r.oI; sR += r.rT; sF += r.rF;
    sC += r.dCost; sTk += (r.daily_tokens || 0);
  });
  var pct = sT ? Math.round(sD / sT * 100) : 0;

  // --- Summary bar ---
  function ml(lbl, val, warn) {
    return '<div style="display:inline-flex;align-items:baseline;gap:4px">' +
      '<span style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.04em">' + lbl + '</span>' +
      '<span style="font-size:14px;font-weight:500;' + (warn ? 'color:#DC2625;font-weight:700' : 'color:#2B2B2B') + '">' + val + '</span></div>';
  }
  var sep = '<span style="display:inline-block;width:1px;height:20px;background:#DDD;margin:0 10px;vertical-align:middle"></span>';
  var summary = [
    ml("Online", '<span style="color:#22C55E">' + on + '</span>/' + n),
    ml("Agents", sAA + '/' + sA),
    ml("Tasks", sT + ' (' + pct + '% done' + (sB > 0 ? ', <span style="color:#DC2625;font-weight:700">' + sB + ' blocked</span>' : '') + ')'),
    ml("Incidents", String(sI), sI > 0),
    ml("Runs/24h", sR + (sF > 0 ? ' <span style="color:#DC2625;font-weight:700">(' + sF + ' failed)</span>' : '')),
    ml("Cost/24h", fmtCost(sC)),
    ml("Tokens/24h", fmtTok(sTk))
  ].join(sep);

  // --- Table rows ---
  var trs = data.map(function(r) {
    var nm = esc(r.instance_name || r.os_hostname);
    var ver = esc(r.version || "-") + (r.update_available ? ' <span style="color:#F59E0B">&#8593;</span>' : '');
    var op = r.st.ord === 2 ? ' style="opacity:0.5;cursor:pointer"' : ' style="cursor:pointer"';
    return '<tr' + op + ' onclick="P(\'' + esc(r.os_hostname) + '\')">' +
      '<td class="c nm">' + nm + '</td>' +
      '<td class="c"><span class="dot" style="background:' + r.st.dot + '"></span>' + r.st.label + '</td>' +
      '<td class="c">' + r.aAct + '/' + (r.agents || 0) + '</td>' +
      '<td class="c">' + (r.tasks || 0) + '</td>' +
      '<td class="c">' + (r.done > 0 ? '<span style="color:#22C55E">' + r.done + '</span>' : '0') + '</td>' +
      '<td class="c">' + (r.act > 0 ? '<span style="color:#3B82F6">' + r.act + '</span>' : '0') + '</td>' +
      '<td class="c">' + r.todo + '</td>' +
      '<td class="c">' + redIf(r.blk) + '</td>' +
      '<td class="c">' + r.rT + '</td>' +
      '<td class="c">' + redIf(r.rF) + '</td>' +
      '<td class="c">' + redIf(r.oI) + '</td>' +
      '<td class="c mono">' + fmtCost(r.dCost) + '</td>' +
      '<td class="c mono">' + fmtTok(r.daily_tokens) + '</td>' +
      '<td class="c">' + (r.companies || 0) + '</td>' +
      '<td class="c">' + (r.projects || 0) + '</td>' +
      '<td class="c">' + (r.goals || 0) + '</td>' +
      '<td class="c nw">' + ver + '</td>' +
      '<td class="c nw sub">' + timeAgo(r.pinged_at) + '</td>' +
      '</tr>';
  }).join("\n");

  // --- Instance data for detail panel (JSON blob) ---
  var panelMap = {};
  data.forEach(function(r) {
    panelMap[r.os_hostname] = {
      n: r.instance_name || r.os_hostname, id: r.os_hostname,
      st: r.st.label, dot: r.st.dot,
      ip: r.ip_address || "-", os: r.os_platform || "-", hn: r.os_hostname || "-",
      ver: r.version || "-",
      gc: r.git_commit ? r.git_commit.substring(0, 7) : "-", gb: r.git_behind || 0, ua: !!r.update_available,
      fs: r.first_seen || "-", ls: r.last_seen || "-", la: r.lA || "-", pc: r.pingCount || 0,
      co: r.companies || 0, pr: r.projects || 0, go: r.goals || 0, doc: r.documents || 0,
      rt: r.routines || 0, ar: r.aRt,
      ag: r.agents || 0, aa: r.aAct, ap: r.aPau,
      tk: r.tasks || 0, td: r.done, ta: r.act, tt: r.todo, tb: r.blk, tbl: r.bkl,
      rn: r.rT, rc: r.rC, rf: r.rF, oi: r.oI,
      dtk: r.daily_tokens || 0, ttk: r.total_tokens || 0,
      dc: r.dCost, tc: r.tCost
    };
  });
  var panelJson = JSON.stringify(panelMap).replace(/<\//g, "<\\/");

  // --- Assemble HTML ---
  var html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
    '<title>Mi1k Hub</title>\n' +
    '<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    '<meta http-equiv="refresh" content="60">\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap" rel="stylesheet">\n' +
    '<style>\n' +
    '*{margin:0;padding:0;box-sizing:border-box}\n' +
    'body{font-family:"Inter",system-ui,sans-serif;background:#F4F4F4;color:#2B2B2B;min-height:100vh}\n' +
    'table{width:100%;border-collapse:collapse;background:#FFF;font-size:13px}\n' +
    'thead th{position:sticky;top:0;z-index:10;background:#FAFAFA;font-size:11px;font-weight:500;' +
      'text-transform:uppercase;letter-spacing:0.04em;color:#888;text-align:left;padding:8px 10px;white-space:nowrap}\n' +
    'tbody tr:nth-child(even){background:#FAFAFA}\n' +
    'tbody tr:hover{background:#F0F0F0}\n' +
    '.c{padding:7px 10px;font-size:13px;white-space:nowrap}\n' +
    '.nm{font-weight:500}\n' +
    '.nw{white-space:nowrap}\n' +
    '.mono{font-family:ui-monospace,monospace;font-size:12px}\n' +
    '.sub{color:#888;font-size:12px}\n' +
    '.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px;vertical-align:middle}\n' +
    /* Panel */
    '.ov{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.15);z-index:40}\n' +
    '.pn{display:none;position:fixed;top:0;right:0;bottom:0;width:420px;background:#FFF;z-index:50;' +
      'box-shadow:-4px 0 20px rgba(0,0,0,0.08);overflow-y:auto}\n' +
    '@media(max-width:768px){.pn{width:100%}}\n' +
    '.ps{border-bottom:1px solid #F4F4F4;padding:14px 18px}\n' +
    '.ps:last-child{border-bottom:none}\n' +
    '.pl{font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:0.05em;color:#888;margin-bottom:8px}\n' +
    '.pg{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}\n' +
    '.pv{font-size:14px;font-weight:500;color:#2B2B2B}\n' +
    '.pk{font-size:11px;color:#888}\n' +
    '.pe{font-size:12px;padding:5px 0;border-bottom:1px solid #F4F4F4}\n' +
    '.pe:last-child{border-bottom:none}\n' +
    /* Scrollbar */
    '::-webkit-scrollbar{width:6px}\n' +
    '::-webkit-scrollbar-thumb{background:#DDD;border-radius:3px}\n' +
    '</style>\n' +
    '</head>\n<body>\n';

  // Header
  html += '<div style="padding:14px 24px 0;display:flex;align-items:center;gap:10px">' +
    '<h1 style="font-size:18px;font-weight:800;color:#2B2B2B">Mi1k Hub</h1>' +
    '<span style="font-size:12px;color:#888">Auto-refreshes 60s</span></div>\n';

  // Summary bar
  html += '<div style="margin:10px 24px;padding:8px 14px;background:#FFF;border-radius:6px;' +
    'display:flex;align-items:center;flex-wrap:wrap;gap:2px;border:1px solid #EEE">' +
    summary + '</div>\n';

  // Table
  html += '<div style="margin:0 24px 24px;overflow-x:auto;border-radius:8px;border:1px solid #EEE">\n' +
    '<table>\n<thead><tr>' +
    '<th>Instance</th><th>Status</th><th>Agents</th><th>Tasks</th>' +
    '<th>Done</th><th>Active</th><th>Todo</th><th>Blocked</th>' +
    '<th>Runs/24h</th><th>Failed</th><th>Incidents</th>' +
    '<th>Cost/Day</th><th>Tokens/Day</th>' +
    '<th>Co.</th><th>Projects</th><th>Goals</th>' +
    '<th>Version</th><th>Last Ping</th>' +
    '</tr></thead>\n<tbody>\n';
  if (trs) {
    html += trs;
  } else {
    html += '<tr><td colspan="18" style="padding:32px;text-align:center;color:#888">No installations have pinged yet.</td></tr>';
  }
  html += '\n</tbody></table></div>\n';

  // Panel overlay + panel
  html += '<div class="ov" id="ov" onclick="C()"></div>\n';
  html += '<div class="pn" id="pn">' +
    '<div style="padding:14px 18px;border-bottom:1px solid #F4F4F4;display:flex;align-items:center;justify-content:space-between">' +
    '<div><div id="pnN" style="font-size:16px;font-weight:700;color:#2B2B2B"></div>' +
    '<div id="pnS" style="font-size:12px;color:#888;margin-top:2px"></div></div>' +
    '<button onclick="C()" style="background:none;border:none;font-size:20px;color:#888;cursor:pointer;padding:4px 8px">&times;</button>' +
    '</div><div id="pnB"></div></div>\n';

  // Data blob
  html += '<script type="application/json" id="idata">' + panelJson + '<\/script>\n';

  // Client-side JS (no template literals — all string concat)
  html += '<script>\n' +
    'var D=JSON.parse(document.getElementById("idata").textContent);\n' +
    'function fT(n){if(!n)return"0";if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1000)return Math.round(n/1000)+"K";return String(n)}\n' +
    'function fC(c){if(!c)return"$0";return"$"+(c/100).toFixed(2)}\n' +
    'function tA(iso){if(!iso)return"never";var t=iso.indexOf("T")>=0?iso:iso.replace(" ","T")+"Z";' +
      'var d=Date.now()-new Date(t).getTime();if(isNaN(d))return"never";' +
      'var m=Math.floor(d/60000);if(m<1)return"now";if(m<60)return m+"m ago";' +
      'var h=Math.floor(m/60);if(h<24)return h+"h ago";return Math.floor(h/24)+"d ago"}\n' +
    // Open panel
    'function P(id){\n' +
    '  var d=D[id];if(!d)return;\n' +
    '  document.getElementById("pnN").textContent=d.n;\n' +
    '  document.getElementById("pnS").innerHTML=\'<span class="dot" style="background:\'+d.dot+\'"></span>\'+d.st+" \\u2014 "+(d.ver||"?")+" \\u2014 "+(d.os||"")+" ("+(d.hn||"")+")";\n' +
    '  var h="";\n' +
    // Resources section
    '  h+="<div class=\\"ps\\"><div class=\\"pl\\">Resources</div><div class=\\"pg\\">";' +
    '  [["Companies",d.co],["Projects",d.pr],["Goals",d.go],["Documents",d.doc],["Routines",d.rt],["Active Routines",d.ar]].forEach(function(x){' +
    '    h+="<div><div class=\\"pv\\">"+x[1]+"</div><div class=\\"pk\\">"+x[0]+"</div></div>"});' +
    '  h+="</div></div>";\n' +
    // Agents section
    '  h+="<div class=\\"ps\\"><div class=\\"pl\\">Agents</div><div class=\\"pg\\">";' +
    '  [["Total",d.ag],["Active",d.aa],["Paused",d.ap]].forEach(function(x){' +
    '    h+="<div><div class=\\"pv\\">"+x[1]+"</div><div class=\\"pk\\">"+x[0]+"</div></div>"});' +
    '  h+="</div></div>";\n' +
    // Tasks section
    '  h+="<div class=\\"ps\\"><div class=\\"pl\\">Tasks</div><div class=\\"pg\\">";' +
    '  [["Total",d.tk,"#2B2B2B"],["Done",d.td,"#22C55E"],["Active",d.ta,"#3B82F6"],["Todo",d.tt,"#2B2B2B"],["Blocked",d.tb,"#DC2625"],["Backlog",d.tbl,"#888"]].forEach(function(x){' +
    '    var c=(x[0]==="Blocked"&&x[1]>0)||(x[0]==="Done"&&x[1]>0)||(x[0]==="Active"&&x[1]>0)?x[2]:"#2B2B2B";' +
    '    h+="<div><div class=\\"pv\\" style=\\"color:"+c+"\\">"+x[1]+"</div><div class=\\"pk\\">"+x[0]+"</div></div>"});' +
    '  h+="</div></div>";\n' +
    // Runs section
    '  h+="<div class=\\"ps\\"><div class=\\"pl\\">Runs (24h)</div><div class=\\"pg\\">";' +
    '  [["Total",d.rn],["Completed",d.rc],["Failed",d.rf],["Incidents",d.oi]].forEach(function(x){' +
    '    var c=((x[0]==="Failed"||x[0]==="Incidents")&&x[1]>0)?"#DC2625":"#2B2B2B";' +
    '    h+="<div><div class=\\"pv\\" style=\\"color:"+c+"\\">"+x[1]+"</div><div class=\\"pk\\">"+x[0]+"</div></div>"});' +
    '  h+="</div></div>";\n' +
    // Tokens & Cost
    '  h+="<div class=\\"ps\\"><div class=\\"pl\\">Tokens & Cost</div><div class=\\"pg\\">";' +
    '  [["Tokens/Day",fT(d.dtk)],["Total Tokens",fT(d.ttk)],["Cost/Day",fC(d.dc)],["Total Cost",fC(d.tc)]].forEach(function(x){' +
    '    h+="<div><div class=\\"pv\\">"+x[1]+"</div><div class=\\"pk\\">"+x[0]+"</div></div>"});' +
    '  h+="</div></div>";\n' +
    // System
    '  h+="<div class=\\"ps\\"><div class=\\"pl\\">System</div><div style=\\"font-size:12px;line-height:1.8\\">";' +
    '  [["IP",d.ip],["OS",d.os],["Hostname",d.hn],["Git",d.gc+(d.gb>0?" ("+d.gb+" behind)":"")+(d.ua?" \\u2191":"")],["First Seen",d.fs],["Last Activity",d.la],["Total Pings",d.pc]].forEach(function(x){' +
    '    h+="<div><span style=\\"color:#888\\">"+x[0]+":</span> "+x[1]+"</div>"});' +
    '  h+="</div></div>";\n' +
    // Ping history placeholder
    '  h+="<div class=\\"ps\\"><div class=\\"pl\\">Ping History</div><div id=\\"ph\\">Loading...</div></div>";\n' +
    '  document.getElementById("pnB").innerHTML=h;\n' +
    '  document.getElementById("pn").style.display="block";\n' +
    '  document.getElementById("ov").style.display="block";\n' +
    // Fetch ping history
    '  fetch("api/instances/"+encodeURIComponent(id)+"/pings").then(function(r){return r.json()}).then(function(pings){\n' +
    '    var ph="";\n' +
    '    if(!pings.length){ph="<div style=\\"color:#888\\">No history yet.</div>"}\n' +
    '    else{pings.forEach(function(p,i){\n' +
    '      var prev=pings[i+1];var dl=[];\n' +
    '      if(prev){\n' +
    '        if(p.tasks!==prev.tasks)dl.push((p.tasks-prev.tasks>0?"+":"")+(p.tasks-prev.tasks)+" tasks");\n' +
    '        if(p.agents!==prev.agents)dl.push((p.agents-prev.agents>0?"+":"")+(p.agents-prev.agents)+" agents");\n' +
    '        if((p.tasks_done||0)>(prev.tasks_done||0))dl.push("+"+(p.tasks_done-prev.tasks_done)+" done");\n' +
    '        if((p.runs_failed||0)>(prev.runs_failed||0))dl.push((p.runs_failed-prev.runs_failed)+" failed");\n' +
    '      }\n' +
    '      ph+="<div class=\\"pe\\"><span style=\\"color:#888\\">"+tA(p.pinged_at)+"</span>";\n' +
    '      ph+=" \\u2014 "+(p.agents||0)+" agents, "+(p.tasks||0)+" tasks";\n' +
    '      if(p.daily_tokens)ph+=", "+fT(p.daily_tokens)+" tok";\n' +
    '      if(p.daily_cost_cents)ph+=", "+fC(p.daily_cost_cents);\n' +
    '      if(dl.length)ph+=" <span style=\\"color:#3B82F6\\">("+dl.join(", ")+")</span>";\n' +
    '      ph+="</div>";\n' +
    '    })}\n' +
    '    document.getElementById("ph").innerHTML=ph;\n' +
    '  }).catch(function(){document.getElementById("ph").innerHTML="<div style=\\"color:#DC2625\\">Failed to load.</div>"});\n' +
    '}\n' +
    // Close panel
    'function C(){document.getElementById("pn").style.display="none";document.getElementById("ov").style.display="none"}\n' +
    'document.addEventListener("keydown",function(e){if(e.key==="Escape")C()});\n' +
    '<\/script>\n';

  html += '</body></html>';
  return html;
}

// --- Server ---
var server = http.createServer(function(req, res) {
  var ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  if (req.method === "POST" && req.url === "/ping") {
    parseBody(req).then(function(d) {
      var instanceId = d.instanceId || "unknown";
      var hostname = d.osHostname || "unknown";
      insertPing.run(
        instanceId, d.instanceName, ip,
        d.companies || 0, d.agents || 0, d.tasks || 0, d.projects || 0,
        d.routines || 0, d.goals || 0, d.documents || 0,
        d.dailyTokens || 0, d.totalTokens || 0,
        d.dailyCostCents || 0, d.totalCostCents || 0,
        d.tasksDone || 0, d.tasksInProgress || 0, d.tasksTodo || 0, d.tasksBlocked || 0, d.tasksBacklog || 0,
        d.agentsActive || 0, d.agentsPaused || 0,
        d.runsTotal || 0, d.runsCompleted || 0, d.runsFailed || 0,
        d.activeRoutines || 0, d.openIncidents || 0, d.lastActivityAt || null,
        d.gitCommit, d.gitBehind || 0, d.updateAvailable ? 1 : 0,
        d.version, d.osPlatform, d.osHostname
      );
      upsertInstance.run(hostname, instanceId, d.instanceName, ip, JSON.stringify(d));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    }).catch(function(err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }

  if (req.method === "GET" && (req.url === "/dashboard" || req.url === "/")) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(dashboard());
    return;
  }

  if (req.method === "GET" && req.url === "/api/instances") {
    var rows = db.prepare("SELECT * FROM instances ORDER BY last_seen DESC").all();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(rows));
    return;
  }

  // Ping history API for detail panel
  var m = req.url.match(/^\/api\/instances\/([^/]+)\/pings/);
  if (req.method === "GET" && m) {
    var iid = decodeURIComponent(m[1]);
    var pings = db.prepare("SELECT * FROM pings WHERE os_hostname = ? ORDER BY id DESC LIMIT 20").all(iid);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(pings));
    return;
  }

  // Health check
  if (req.method === "GET" && req.url === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, function() {
  console.log("Mi1k Hub listening on port " + PORT);
  console.log("Dashboard: http://0.0.0.0:" + PORT + "/dashboard");
});
HUBEOF

# 4. Create package.json and install deps
echo "[4/4] Installing dependencies..."
cat > "$HUB_DIR/package.json" << 'PKGEOF'
{
  "name": "mi1k-hub",
  "version": "2.0.0",
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
