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

### 8. Create the startup script

Create a file at ~/Desktop/mi1k.command with this content:

#!/bin/bash
set -e
APP_DIR="$HOME/Documents/mi1k"
NODE="$(which node)"
cd "$APP_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Starting Mi1k"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cleanup() {
  echo ""
  echo "Shutting down..."
  [ -n "$SERVER_PID" ]     && kill "$SERVER_PID"     2>/dev/null || true
  [ -n "$MIDDLEWARE_PID" ] && kill "$MIDDLEWARE_PID" 2>/dev/null || true
  echo "All stopped."
}
trap cleanup EXIT INT TERM

if lsof -ti :3100 > /dev/null 2>&1; then
  echo "Killing existing process on port 3100..."
  lsof -ti :3100 | xargs kill -9
  sleep 1
fi

if ! pg_isready -q 2>/dev/null; then
  echo "Starting PostgreSQL..."
  brew services start postgresql@17
  sleep 3
fi

echo ""
echo "[1/2] Starting Mi1k server..."
export PAPERCLIP_HOME="$APP_DIR/paperclip-data"
export PAPERCLIP_INSTANCE_ID="default"
export PAPERCLIP_MIGRATION_AUTO_APPLY="true"
export DATABASE_URL="postgres://paperclip:paperclip@localhost:5432/paperclip"
export MI1K_HUB_URL="http://187.77.12.140:3200"
export MI1K_INSTANCE_NAME="CHANGE_ME"
"$NODE" server/node_modules/tsx/dist/cli.mjs server/src/index.ts &
SERVER_PID=$!

echo "Waiting for Mi1k on http://localhost:3100 ..."
for i in $(seq 1 40); do
  if curl -sf http://localhost:3100/api/health > /dev/null 2>&1; then
    echo "✓ Mi1k is ready!"
    break
  fi
  sleep 3
done

echo ""
echo "[2/2] Starting middleware..."
cd "$APP_DIR/middleware"
mkdir -p logs
"$NODE" --experimental-strip-types src/index.ts >> logs/daemon.log 2>&1 &
MIDDLEWARE_PID=$!
echo "✓ Middleware running (PID $MIDDLEWARE_PID)"
cd "$APP_DIR"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Mi1k is running — http://localhost:3100"
echo "  Close this window to stop everything."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
open http://localhost:3100

wait $SERVER_PID

Make it executable:
chmod +x ~/Desktop/mi1k.command

### 9. Run it

Double-click ~/Desktop/mi1k.command — Mi1k opens in browser.

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

### 8. Create the startup script

Create a file at %USERPROFILE%\Desktop\mi1k.bat with this content:

@echo off
title Mi1k
set APP_DIR=%USERPROFILE%\Documents\mi1k
cd /d %APP_DIR%

echo =============================================
echo   Starting Mi1k
echo =============================================

set PAPERCLIP_HOME=%APP_DIR%\paperclip-data
set PAPERCLIP_INSTANCE_ID=default
set PAPERCLIP_MIGRATION_AUTO_APPLY=true
set DATABASE_URL=postgres://paperclip:paperclip@localhost:5432/paperclip
set MI1K_HUB_URL=http://187.77.12.140:3200
set MI1K_INSTANCE_NAME=CHANGE_ME

echo.
echo [1/2] Starting Mi1k server...
start /b node server\node_modules\tsx\dist\cli.mjs server\src\index.ts

echo Waiting for server...
:waitloop
timeout /t 3 /nobreak >nul
curl -sf http://localhost:3100/api/health >nul 2>&1
if errorlevel 1 goto waitloop
echo Server is ready!

echo.
echo [2/2] Starting middleware...
cd middleware
start /b node --experimental-strip-types src\index.ts
cd /d %APP_DIR%

echo.
echo =============================================
echo   Mi1k is running - http://localhost:3100
echo   Close this window to stop everything.
echo =============================================
start http://localhost:3100

pause

### 9. Run it

Double-click mi1k.bat on your Desktop — Mi1k opens in browser.

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
