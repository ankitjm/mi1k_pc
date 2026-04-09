# Mi1k Master Guide

Version 1.0 — April 2026

---

## 1. Product Overview

Mi1k installs a private AI workforce on a client's own machine. Each department head gets an AI CEO and specialist agents that read from one shared Brand Brain — the company's knowledge base. Agents work in the background, never send data to anyone else's cloud, and stay under the client's full control via approval gates and token budgets.

Mi1k is built on Paperclip AI (open-source agent control plane) with customisations for local deployment, brand brain management, session intelligence, and central tracking.

**What the client gets:**
- AI agents assigned to roles (CEO, CMO, CTO, etc.)
- A shared Brand Brain with their company identity, ICP, products, tone of voice
- A daily briefing workflow via dashboard (and WhatsApp if configured)
- Full ownership — software, data, brand brain, agents all live on their machine

---

## 2. Client Prerequisites Checklist

Before arriving at the client site, they must have:

| # | Requirement | Details |
|---|-------------|---------|
| 1 | **Dedicated machine** | Mac or Windows, 8GB+ RAM, 20GB+ free disk. Isolated — no existing company data. Runs 24/7. |
| 2 | **Admin access** | Can install software, change system settings on that machine. |
| 3 | **Stable internet** | For Claude API calls, git updates, and hub reporting. |
| 4 | **Claude account** | Sign up at claude.ai, subscribe to Pro ($20/month) or Team. Client pays Anthropic directly. |
| 5 | **GitHub account** | Sign up at github.com (free). Needed to receive Mi1k updates via `git pull`. |
| 6 | **WhatsApp number** | For OpenClaw agent communication bridge. Can be a new number. Installed on the same dedicated machine. |

---

## 3. Installation Guide

### Mac

```
1. Install Homebrew:
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

2. Install Node.js via nvm:
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
   source ~/.zshrc
   nvm install 20 && nvm use 20

3. Install pnpm and PostgreSQL:
   npm install -g pnpm
   brew install postgresql@17
   brew services start postgresql@17

4. Create database:
   createuser -s paperclip 2>/dev/null || true
   psql -U paperclip -c "ALTER USER paperclip PASSWORD 'paperclip';" 2>/dev/null || true
   createdb -U paperclip paperclip 2>/dev/null || true

5. Clone and install:
   cd ~/Documents
   git clone git@github.com:ankitjm/mi1k_pc.git mi1k
   cd mi1k
   pnpm install

6. Create data directories:
   mkdir -p paperclip-data/{context,wiki/agents,wiki/brand,wiki/domain}

7. Build the UI:
   cd ui && pnpm build && cd ..

8. First run (applies database migrations):
   export PAPERCLIP_HOME="$(pwd)/paperclip-data"
   export PAPERCLIP_INSTANCE_ID="default"
   export PAPERCLIP_MIGRATION_AUTO_APPLY="true"
   export DATABASE_URL="postgres://paperclip:paperclip@localhost:5432/paperclip"
   node server/node_modules/tsx/dist/cli.mjs server/src/index.ts

9. Open http://localhost:3100, run onboarding wizard. Then Ctrl+C.

10. Install middleware:
    cd middleware && npm install && cd ..

11. Create startup script at ~/Desktop/mi1k.command (see INSTALL.md for full script)
    chmod +x ~/Desktop/mi1k.command

12. Double-click mi1k.command to start everything.
```

### Windows

```
1. Install Node.js LTS from https://nodejs.org or: winget install OpenJS.NodeJS.LTS
2. Install pnpm: npm install -g pnpm
3. Install PostgreSQL 17 from https://www.postgresql.org/download/windows/
4. Create DB:
   "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE USER paperclip WITH PASSWORD 'paperclip' SUPERUSER;"
   "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE paperclip OWNER paperclip;"
5. Clone, install, build, run — same as Mac but with backslashes and PowerShell env vars.
   See INSTALL.md for the full Windows script.
```

---

## 4. Onboarding Process (7-Day Summary)

| Day | Activity | Duration |
|-----|----------|----------|
| 1 | Technical setup — install Mi1k, configure agents, smoke test | Full day |
| 2 | Founder Workshop — mission, voice, products, org chart, pain map, guardrails | 90 min call |
| 3 | Brand Brain finalisation — expand context files, create agents, wire WhatsApp | Full day |
| 4 | Workflow build — define starter workflow, build, test, iterate | Full day |
| 5 | Live demo — show CEO agent, run workflow, capture feedback | 45 min call |
| 6 | Training — walk runbook, live WhatsApp test, show logs and controls | 60 min call |
| 7 | Handover — final checks, confirm backups, schedule check-in, invoice | 30 min call |

---

## 5. Brand Brain

The Brand Brain is a folder of markdown files at `paperclip-data/context/`. Every agent reads from it on every heartbeat.

**Core files (created during Day 2-3):**
- `01_company_brain.md` — company identity, positioning, capabilities
- `02_ideal_customer_profile.md` — target market, buyer personas
- `03_products_and_services.md` — service model, engagement tiers
- `04_tone_and_communication_rules.md` — voice guidelines, banned words

**How to add more:**
- Upload via the Brand Brain page in the UI (`/brand-brain`)
- Or place `.md` files directly in `paperclip-data/context/`

**How agents use it:**
- Each agent's AGENTS.md references files in `context/`
- The middleware's context injector searches the Brand Brain for task-relevant snippets and injects them into each agent's CONTEXT.md

---

## 6. Middleware

The middleware is a background daemon at `middleware/src/index.ts`. It runs four jobs on a polling loop:

| Job | Interval | What it does |
|-----|----------|--------------|
| **Wiki Seeder** | Every tick (60s) | Imports agent memory/life files into the wiki. Incremental — skips already-imported. |
| **Session Rotator** | Every tick (60s) | Finds agents with >200K cached tokens, extracts key decisions to wiki, clears session so agent starts fresh. |
| **Context Injector** | Every tick (60s) | Builds a compact CONTEXT.md for each agent with active tasks + relevant wiki knowledge. Writes to agent's instruction folder. |
| **Reporter** | Hourly | Collects stats (agents, tasks, tokens, git status) and pings the central hub. Queues locally if hub is unreachable. |

**Start:** The middleware starts automatically via `mi1k.command`. Logs go to `middleware/logs/daemon.log`.

---

## 7. Tracking & Monitoring

### Central Hub (VPS)

Each Mi1k installation pings a central hub server hourly with:
- Instance ID and name
- Company count, agent count, task count, project count, routine count
- Daily and total token usage
- Git commit hash and whether updates are available
- OS platform and hostname

**Hub setup (run once on VPS):**
```bash
ssh root@187.77.12.140
bash <(curl -sf https://raw.githubusercontent.com/ankitjm/mi1k_pc/main/deploy/setup-hub.sh)
```
Or copy `deploy/setup-hub.sh` to the VPS and run it.

**Dashboard:** `http://187.77.12.140:3200/dashboard`

Shows a table of all installations with live stats, token usage, git status, and last ping time. Auto-refreshes every 60 seconds.

### What happens when hub is unreachable

Pings queue locally in `paperclip-data/pending-pings.json`. Next time the hub is reachable, all queued pings flush automatically. No data is lost.

### Local update check

The middleware runs `git fetch` hourly and compares local vs remote. Result available at `GET /api/system/update-status`.

---

## 8. Updates

### Pushing updates to clients

1. Make changes on your development machine
2. `git commit` and `git push origin main`
3. Each client's middleware detects the new commit within an hour
4. Hub dashboard shows "Update available" for that installation
5. On the client machine: `cd ~/Documents/mi1k && git pull && cd ui && pnpm build && cd ..`
6. Restart mi1k.command

### What gets updated

- Server code (routes, services, migrations)
- UI (pages, components, styles)
- Middleware (session rotation, context injection, reporter)
- Nothing in `paperclip-data/` is touched — that's the client's data (gitignored)

---

## 9. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT MACHINE                                             │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Mi1k Server │  │  PostgreSQL  │  │    Middleware      │  │
│  │  (Node.js)   │  │  (Database)  │  │  (Background)     │  │
│  │  Port 3100   │←→│  Port 5432   │←→│  - Session Rotator│  │
│  │              │  │              │  │  - Wiki Seeder    │  │
│  │  - API       │  │  - Companies │  │  - Context Inject │  │
│  │  - UI (React)│  │  - Agents    │  │  - Reporter       │  │
│  │  - Heartbeats│  │  - Tasks     │  │                   │  │
│  └──────┬───────┘  │  - Runs      │  └────────┬──────────┘  │
│         │          └──────────────┘           │             │
│         │                                     │             │
│  ┌──────┴───────┐  ┌──────────────┐          │             │
│  │  Claude Code  │  │ paperclip-   │          │  ping/hour  │
│  │  (AI Engine)  │  │ data/        │          │             │
│  │  - Runs agents│  │ - context/   │←─────────┘             │
│  │  - API calls  │  │ - wiki/      │                        │
│  └──────────────┘  │ - agents/     │                        │
│                     └──────────────┘                        │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP POST /ping
                             ▼
                    ┌─────────────────┐
                    │  Mi1k Hub (VPS) │
                    │  Port 3200      │
                    │  - SQLite DB    │
                    │  - Dashboard    │
                    └─────────────────┘
```

---

## 10. API Keys & Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | embedded-postgres | PostgreSQL connection string |
| `PAPERCLIP_HOME` | `~/.paperclip` | Data directory root |
| `PAPERCLIP_INSTANCE_ID` | `default` | Instance identifier |
| `PAPERCLIP_MIGRATION_AUTO_APPLY` | `false` | Auto-apply DB migrations on startup |
| `ANTHROPIC_API_KEY` | (none) | For middleware LLM extraction (Haiku). Optional — raw excerpts used if unset. |
| `MI1K_HUB_URL` | `http://187.77.12.140:3200` | Central hub for tracking. Set to empty string to disable. |
| `MI1K_INSTANCE_NAME` | hostname | Friendly name shown in hub dashboard |
| `MI1K_REPORT_INTERVAL_MS` | `3600000` (1 hour) | How often to ping the hub |

### API Keys Needed

| Key | Who pays | Purpose |
|-----|----------|---------|
| **Claude Pro/Team** | Client | Powers the AI agents via Claude Code CLI |
| **ANTHROPIC_API_KEY** | You (optional) | Middleware uses Haiku to extract clean summaries from agent sessions. Without it, raw excerpts are saved to wiki instead. ~$0.01/extraction. |
| **Google API Key** | Client (optional) | For image/video generation capabilities |

---

## 11. Troubleshooting

| Problem | Fix |
|---------|-----|
| Server won't start | Check PostgreSQL is running: `brew services list` (Mac) or `pg_isready` |
| "API route not found" | Server needs restart after code changes. Kill and re-run mi1k.command. |
| Agents not running | Check heartbeat scheduler in Settings > Heartbeats. Agents need `enabled: true`. |
| Brand Brain empty | Upload files on `/brand-brain` page or place `.md` files in `paperclip-data/context/` |
| Middleware not connecting | Check `DATABASE_URL` in middleware config matches server config |
| Hub dashboard empty | Check firewall allows port 3200 on VPS. Check `MI1K_HUB_URL` is set correctly. |
| Pings queuing locally | Hub is unreachable. Check VPS is running: `systemctl status mi1k-hub` |
| Git update check fails | Ensure the machine has SSH key access to the GitHub repo |
| High token usage | Session rotator should be clearing bloated sessions. Check middleware logs. |
| Port 3100 already in use | `lsof -ti :3100 \| xargs kill -9` (Mac) or check Task Manager (Windows) |

---

## 12. Customisations vs Upstream Paperclip

Mi1k is a fork of [Paperclip AI](https://github.com/paperclipai/paperclip). Key customisations:

- **Brand Brain page** — `/brand-brain` with upload, context files, agent learnings
- **Middleware daemon** — session rotation, wiki seeding, context injection, hub reporting
- **Avatar crop dialog** — LinkedIn-style circular crop with zoom
- **Mi1k documentation page** — replaces Paperclip docs link
- **Sidebar collapse** — Work and Company sections collapsible
- **Documents route** — wired up (was unregistered in upstream)
- **UI branding** — custom brand colours, version display, sidebar items

For full list of changed files, see `CUSTOMIZATIONS.md`.

To pull upstream Paperclip updates:
```bash
git fetch upstream
git merge upstream/main
# Resolve conflicts, rebuild, test
```

---

## 13. File Structure Reference

```
mi1k/
├── server/              # API server (Node.js + Express)
│   └── src/routes/      # API endpoints
├── ui/                  # React frontend
│   └── src/pages/       # Page components
├── middleware/           # Background daemon
│   └── src/             # Session rotator, wiki, context injector, reporter
├── packages/db/         # Database schema (Drizzle ORM)
├── deploy/              # Deployment scripts
│   └── setup-hub.sh     # VPS hub setup
├── paperclip-data/      # Runtime data (gitignored)
│   ├── context/         # Brand Brain files
│   ├── wiki/            # Agent knowledge wiki
│   └── agents/          # Agent instruction folders
├── INSTALL.md           # Installation instructions
├── MI1K_MASTER_GUIDE.md # This document
└── CUSTOMIZATIONS.md    # Changes vs upstream Paperclip
```

---

## 14. URLs & Dashboards

| URL | What |
|-----|------|
| `http://localhost:3100` | Mi1k main UI (local) |
| `http://localhost:3100/KHO/brand-brain` | Brand Brain page |
| `http://localhost:3100/KHO/documents` | Agent documents |
| `http://localhost:3100/KHO/dashboard` | Company dashboard |
| `http://localhost:3100/docs` | Mi1k documentation |
| `http://localhost:3100/api/health` | Health check endpoint |
| `http://localhost:3100/api/wiki/entries` | Brand Brain + wiki API |
| `http://localhost:3100/api/system/update-status` | Git update status |
| `http://187.77.12.140:3200/dashboard` | Central hub — all installations |

---

*This document should be kept with the repo and given to any agent or team member who needs to understand, install, maintain, or extend Mi1k.*
