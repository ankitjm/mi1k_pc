# Mi1k Installation Guide

Fresh install instructions for a new machine. Copy-paste these into Claude Code on the target machine.

---

## Mac Installation

```
I need you to install Mi1k (a Paperclip AI fork) on this Mac from scratch. Follow these steps exactly:

### 1. Prerequisites

Install Homebrew (if not already installed):
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

Install Node.js 20+ via nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.zshrc
nvm install 20
nvm use 20

Install pnpm:
npm install -g pnpm

Install PostgreSQL 17:
brew install postgresql@17
brew services start postgresql@17

Create the database and user:
createuser -s paperclip 2>/dev/null || true
psql -U paperclip -c "ALTER USER paperclip PASSWORD 'paperclip';" 2>/dev/null || true
createdb -U paperclip paperclip 2>/dev/null || true

Install Git (if not already):
brew install git

### 2. Clone the repo

cd ~/Documents
git clone git@github.com:ankitjm/mi1k_pc.git mi1k
cd mi1k

### 3. Install dependencies

pnpm install

### 4. Set up PAPERCLIP_HOME

Create the data directory:
mkdir -p paperclip-data/context
mkdir -p paperclip-data/wiki/agents
mkdir -p paperclip-data/wiki/brand
mkdir -p paperclip-data/wiki/domain

### 5. Build the UI

cd ui && pnpm build && cd ..

### 6. Start the server (first run — applies migrations)

Set environment variables and start:
export PAPERCLIP_HOME="$(pwd)/paperclip-data"
export PAPERCLIP_INSTANCE_ID="default"
export PAPERCLIP_MIGRATION_AUTO_APPLY="true"
export DATABASE_URL="postgres://paperclip:paperclip@localhost:5432/paperclip"
node server/node_modules/tsx/dist/cli.mjs server/src/index.ts

Wait for it to say "Paperclip is running" then open http://localhost:3100 in your browser.
Run through the onboarding wizard to create your first company and agent.
Then stop the server with Ctrl+C.

### 7. Install middleware dependencies

cd middleware && npm install && cd ..

### 8. Install as background services (launchd)

This runs Mi1k invisibly in the background — no terminal window needed. It auto-starts on login and auto-restarts on crash.

First, find your Node path (needed for the plists):
NODE_PATH="$(which node)"
echo "$NODE_PATH"

Create the server service plist at ~/Library/LaunchAgents/tech.khosha.mi1k.plist:

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
        <string>cd $HOME/Documents/mi1k && PAPERCLIP_HOME=$HOME/Documents/mi1k/paperclip-data PAPERCLIP_INSTANCE_ID=default PAPERCLIP_MIGRATION_AUTO_APPLY=true MI1K_HUB_URL=http://187.77.12.140:3200 MI1K_INSTANCE_NAME=CHANGE_ME $NODE_PATH server/node_modules/tsx/dist/cli.mjs server/src/index.ts</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$HOME/Documents/mi1k/logs/mi1k-launchd.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/Documents/mi1k/logs/mi1k-launchd.err</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>$NODE_PATH_DIR:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
        <key>HOME</key>
        <string>$HOME</string>
    </dict>
</dict>
</plist>

Create the middleware service plist at ~/Library/LaunchAgents/tech.khosha.mi1k-middleware.plist:

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
        <string>cd $HOME/Documents/mi1k/middleware && mkdir -p logs && MI1K_HUB_URL=http://187.77.12.140:3200 MI1K_INSTANCE_NAME=CHANGE_ME DATABASE_URL=postgres://paperclip:paperclip@localhost:5432/paperclip $NODE_PATH --experimental-strip-types src/index.ts</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>ThrottleInterval</key>
    <integer>30</integer>
    <key>StandardOutPath</key>
    <string>$HOME/Documents/mi1k/middleware/logs/daemon.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/Documents/mi1k/middleware/logs/daemon.err</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>$NODE_PATH_DIR:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
        <key>HOME</key>
        <string>$HOME</string>
    </dict>
</dict>
</plist>

IMPORTANT: In both plists above, replace:
- $HOME with the actual home directory (e.g. /Users/username)
- $NODE_PATH with the actual node path from step above
- $NODE_PATH_DIR with the directory containing node (e.g. /Users/username/.nvm/versions/node/v25.6.0/bin)
- CHANGE_ME with the client/instance name

Then set up the mi1k control command:
mkdir -p ~/bin
ln -sf ~/Documents/mi1k/scripts/mi1k.sh ~/bin/mi1k
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

### 9. Start it

mi1k start

This starts PostgreSQL (if needed), the server, and the middleware. Everything runs in the background.

Other commands:
- mi1k stop — stop everything
- mi1k restart — restart everything
- mi1k status — check if services are running
- mi1k logs — tail all logs
- mi1k logs server — tail server logs only
- mi1k logs middleware — tail middleware logs only

### 10. After onboarding

Upload brand materials on the Brand Brain page (/brand-brain).
The middleware auto-seeds agent context every 60 seconds.
```

---

## Windows Installation

```
I need you to install Mi1k (a Paperclip AI fork) on this Windows machine from scratch. Follow these steps exactly:

### 1. Prerequisites

Install Node.js 20+ from https://nodejs.org (use the LTS installer).
Or via winget:
winget install OpenJS.NodeJS.LTS

Install pnpm:
npm install -g pnpm

Install PostgreSQL 17 from https://www.postgresql.org/download/windows/
During install: set password to "paperclip", keep default port 5432.
Or via winget:
winget install PostgreSQL.PostgreSQL.17

After PostgreSQL is installed, open a terminal and create the database:
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE USER paperclip WITH PASSWORD 'paperclip' SUPERUSER;"
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE paperclip OWNER paperclip;"

Install Git from https://git-scm.com/download/win or:
winget install Git.Git

### 2. Clone the repo

Open a terminal (PowerShell or Git Bash):
cd %USERPROFILE%\Documents
git clone git@github.com:ankitjm/mi1k_pc.git mi1k
cd mi1k

### 3. Install dependencies

pnpm install

### 4. Set up PAPERCLIP_HOME

mkdir paperclip-data\context
mkdir paperclip-data\wiki\agents
mkdir paperclip-data\wiki\brand
mkdir paperclip-data\wiki\domain

### 5. Build the UI

cd ui
pnpm build
cd ..

### 6. Start the server (first run — applies migrations)

In PowerShell:
$env:PAPERCLIP_HOME = "$PWD\paperclip-data"
$env:PAPERCLIP_INSTANCE_ID = "default"
$env:PAPERCLIP_MIGRATION_AUTO_APPLY = "true"
$env:DATABASE_URL = "postgres://paperclip:paperclip@localhost:5432/paperclip"
node server\node_modules\tsx\dist\cli.mjs server\src\index.ts

Wait for "Paperclip is running" then open http://localhost:3100.
Run the onboarding wizard to create your first company and agent.
Then stop the server with Ctrl+C.

### 7. Install middleware dependencies

cd middleware
npm install
cd ..

### 8. Install as background services (Task Scheduler)

This runs Mi1k invisibly in the background — no terminal window. Auto-starts on login, auto-restarts on crash.

Create the startup script at %USERPROFILE%\Documents\mi1k\scripts\mi1k-service.bat:

@echo off
set APP_DIR=%USERPROFILE%\Documents\mi1k
set PAPERCLIP_HOME=%APP_DIR%\paperclip-data
set PAPERCLIP_INSTANCE_ID=default
set PAPERCLIP_MIGRATION_AUTO_APPLY=true
set DATABASE_URL=postgres://paperclip:paperclip@localhost:5432/paperclip
set MI1K_HUB_URL=http://187.77.12.140:3200
set MI1K_INSTANCE_NAME=CHANGE_ME

cd /d %APP_DIR%
start /b node server\node_modules\tsx\dist\cli.mjs server\src\index.ts

:waitloop
timeout /t 3 /nobreak >nul
curl -sf http://localhost:3100/api/health >nul 2>&1
if errorlevel 1 goto waitloop

cd middleware
start /b node --experimental-strip-types src\index.ts
cd /d %APP_DIR%

Register it as a scheduled task that runs at login (run in admin PowerShell):
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$env:USERPROFILE\Documents\mi1k\scripts\mi1k-service.bat`"" -WorkingDirectory "$env:USERPROFILE\Documents\mi1k"
$trigger = New-ScheduledTaskTrigger -AtLogon
$settings = New-ScheduledTaskSettingsSet -RestartInterval (New-TimeSpan -Minutes 1) -RestartCount 999 -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit 0
Register-ScheduledTask -TaskName "Mi1k" -Action $action -Trigger $trigger -Settings $settings -Description "Mi1k Server and Middleware"

IMPORTANT: Replace CHANGE_ME with the client/instance name in mi1k-service.bat.

### 9. Start it

Start-ScheduledTask -TaskName "Mi1k"

Or just log out and back in — it starts automatically.

Other commands (PowerShell):
- Start-ScheduledTask -TaskName "Mi1k" — start
- Stop-ScheduledTask -TaskName "Mi1k" — stop
- Get-ScheduledTask -TaskName "Mi1k" — check status
- Unregister-ScheduledTask -TaskName "Mi1k" — remove

### 10. After onboarding

Upload brand materials on the Brand Brain page (/brand-brain).
The middleware auto-seeds agent context every 60 seconds.
```

---

## Notes for both platforms

- **Database**: Default credentials are `paperclip:paperclip@localhost:5432/paperclip`. Change in DATABASE_URL if needed.
- **Port**: Server runs on 3100 by default.
- **PAPERCLIP_HOME**: Points to `paperclip-data/` inside the repo. This is where all runtime data lives (agent configs, wiki, context files). It's gitignored.
- **Middleware**: Runs three jobs on a 60-second loop: session rotation (clears bloated sessions), wiki seeding (imports agent memory), context injection (writes CONTEXT.md per agent).
- **Brand Brain**: After onboarding, go to `/brand-brain` to upload additional brand materials (PDF, DOCX, XLSX, CSV, TXT, MD). Files get extracted and added to `paperclip-data/context/`.
- **SSH tunnel** (optional): To expose remotely, add to startup script: `ssh -N -R 3100:localhost:3100 root@YOUR_SERVER_IP &`
- **Claude API**: Agents require a Claude subscription or API key configured during onboarding.
