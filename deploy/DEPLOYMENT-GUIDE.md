# MI1K Deployment Guide

Portable deployment kit for MI1K — your customised AI agent orchestration platform built on Paperclip.

This guide covers three scenarios:
1. **Fresh install** — set up MI1K on a brand new server
2. **Migration** — move an existing Paperclip/MI1K instance (with all your data) to a new server
3. **Updating** — push a new version to an already-deployed server

---

## What's in the Package

When you run `build-portable.sh`, it creates a `.tar.gz` archive containing:

| File | Purpose |
|------|---------|
| `mi1k-deploy.sh` | One-command deployment script |
| `mi1k-migrate.sh` | Export/import data between instances |
| `mi1k-update.sh` | Safe update with automatic rollback |
| `docker-compose.portable.yml` | Full stack definition (app + PostgreSQL + optional HTTPS) |
| `.env.template` | Configuration reference |
| `Caddyfile` | Reverse proxy config for automatic HTTPS |
| `mi1k-server-v*.tar.gz` | The Docker image (pre-built, ~1.2 GB) |

---

## Prerequisites

The target server needs:

- **Docker** (with Docker Compose v2)
- **2 GB RAM minimum** (4 GB recommended)
- **5 GB free disk space** (for image + database + storage)
- A **domain name** pointed at the server (optional — works with IP addresses too)

To install Docker on a fresh Ubuntu/Debian server:
```bash
curl -fsSL https://get.docker.com | sh
```

---

## Scenario 1: Fresh Install

Use this when setting up MI1K on a server that has never run Paperclip or MI1K before.

### Step 1 — Transfer the package to your server

```bash
scp mi1k-portable-v*.tar.gz user@your-server:~/
```

### Step 2 — Extract on the server

```bash
ssh user@your-server
tar xzf mi1k-portable-v*.tar.gz
cd mi1k-portable-v*/
```

### Step 3 — Run the deploy script

**Interactive mode** (it will ask you for a domain):
```bash
./mi1k-deploy.sh
```

**Non-interactive** (pass the domain directly):
```bash
./mi1k-deploy.sh --domain agents.mycompany.com
```

**Without HTTPS** (if you already have Nginx/Cloudflare handling SSL):
```bash
./mi1k-deploy.sh --domain agents.mycompany.com --no-https
```

**On a custom port** (default is 3100):
```bash
./mi1k-deploy.sh --domain agents.mycompany.com --port 8080
```

The script will:
- Check that Docker is installed and running
- Load the MI1K image from the tarball
- Generate a secure database password and auth secret
- Start PostgreSQL + MI1K (+ Caddy for HTTPS if enabled)
- Wait for health checks to pass
- Print the URL where MI1K is accessible

### Step 4 — Open MI1K in your browser

Go to the URL shown at the end of the deploy. On first visit, you'll be asked to create an admin account.

### What gets created

```
your-deploy-folder/
├── .env                  ← Your secrets (auto-generated, DO NOT share)
├── docker-compose.portable.yml
├── mi1k-deploy.sh
├── mi1k-migrate.sh
├── mi1k-update.sh
└── Caddyfile
```

Docker volumes (persistent data):
- `mi1k-pgdata` — PostgreSQL database files
- `mi1k-data` — MI1K application data (uploads, config, encryption keys)
- `mi1k-caddy-data` — SSL certificates (if using Caddy)

---

## Scenario 2: Migration from Existing Paperclip/MI1K

Use this when you already have Paperclip (or an older MI1K) running on another server and want to bring your data — companies, agents, issues, documents, users, everything — into the new deployment.

### Overview

The process is:
1. **Export** data from the old server
2. **Deploy** MI1K on the new server (fresh install, as above)
3. **Import** the exported data into the new server

### Step 1 — Export from the old server

Copy `mi1k-migrate.sh` to the old server (or run it there if you already have the deploy kit):

```bash
./mi1k-migrate.sh export --output ./my-backup
```

This creates a backup folder containing:
- `database.sql` — Full database dump (all your companies, agents, issues, users, etc.)
- `master.key` — Encryption key for agent secrets (API keys stored in MI1K)
- `storage/` — Uploaded files and attachments

**If the old server uses an external PostgreSQL** (not the bundled one), pass the connection URL:
```bash
./mi1k-migrate.sh export --output ./my-backup --db-url "postgres://user:pass@host:5432/dbname"
```

### Step 2 — Deploy MI1K on the new server

Follow [Scenario 1](#scenario-1-fresh-install) above to get a running MI1K instance.

### Step 3 — Transfer the backup to the new server

```bash
scp -r my-backup/ user@new-server:~/mi1k-portable-v*/
```

### Step 4 — Import into the new server

```bash
cd ~/mi1k-portable-v*/
./mi1k-migrate.sh import --from ./my-backup
```

The script will:
- Confirm you want to proceed (this replaces existing data)
- Stop MI1K temporarily
- Restore the database
- Copy the encryption key and storage files
- Restart MI1K and verify health

**Partial imports** (if you only want some parts):
```bash
# Only restore database, skip files
./mi1k-migrate.sh import --from ./my-backup --skip-files

# Only restore files, skip database
./mi1k-migrate.sh import --from ./my-backup --skip-db
```

### Step 5 — Verify

Open MI1K in your browser. You should see all your companies, agents, issues, and documents from the old server.

### Important Notes on Migration

- **Schema differences are handled automatically.** MI1K runs auto-migrations on startup (`PAPERCLIP_MIGRATION_AUTO_APPLY=true`). If the old database has an older schema, MI1K will apply any missing migrations.
- **Users will need to log in again.** Session tokens are tied to the `BETTER_AUTH_SECRET`, which is different on the new server. User accounts and passwords are preserved — they just need to log in again.
- **Agent secrets (API keys) are encrypted.** The `master.key` file is what decrypts them. If you lose this file, you'll need to re-enter API keys for your agents.

---

## Scenario 3: Updating MI1K

When a new version is built, you'll get a new image tarball (e.g., `mi1k-server-v0.4.0.tar.gz`).

### Step 1 — Transfer the new image to the server

```bash
scp mi1k-server-v0.4.0.tar.gz user@your-server:~/mi1k-portable-v*/
```

### Step 2 — Run the update script

```bash
cd ~/mi1k-portable-v*/
./mi1k-update.sh
```

Or specify the tarball explicitly:
```bash
./mi1k-update.sh --image ./mi1k-server-v0.4.0.tar.gz
```

The script will:
1. Back up your database (saved in `backups/` folder)
2. Save the current image as `mi1k-server:previous`
3. Load the new image
4. Restart MI1K
5. Run health checks
6. **Automatically roll back** if the new version fails (restores previous image + database backup)

### Skip the backup (not recommended):
```bash
./mi1k-update.sh --no-backup
```

---

## Day-to-Day Commands

All commands are run from your deploy folder (where `docker-compose.portable.yml` lives).

### View logs
```bash
docker compose -f docker-compose.portable.yml logs -f mi1k
```

### Restart MI1K
```bash
docker compose -f docker-compose.portable.yml restart mi1k
```

### Stop everything
```bash
docker compose -f docker-compose.portable.yml down
```

### Start everything
```bash
docker compose -f docker-compose.portable.yml up -d
```

### Manual database backup
```bash
docker exec mi1k-postgres pg_dump -U mi1k -d mi1k > backup-$(date +%Y%m%d).sql
```

### Restore a manual backup
```bash
docker exec -i mi1k-postgres psql -U mi1k -d mi1k < backup-20260325.sql
```

### Check health
```bash
curl http://localhost:3100/api/health
```

### Access PostgreSQL directly
```bash
docker exec -it mi1k-postgres psql -U mi1k -d mi1k
```

---

## Configuration Reference

The `.env` file controls your deployment. It is auto-generated by `mi1k-deploy.sh` but you can edit it manually.

| Variable | Purpose | Can I change it? |
|----------|---------|-----------------|
| `POSTGRES_PASSWORD` | Database password | No — changing it breaks the database connection |
| `BETTER_AUTH_SECRET` | Authentication signing key | No — changing it logs out all users and breaks sessions |
| `PAPERCLIP_PUBLIC_URL` | The URL users access MI1K from | Yes — update if your domain changes |
| `MI1K_DOMAIN` | Domain for Caddy auto-SSL | Yes — update if your domain changes |
| `MI1K_PORT` | Port MI1K listens on | Yes — restart required |

After editing `.env`, restart:
```bash
docker compose -f docker-compose.portable.yml up -d
```

---

## Architecture

```
Internet
   │
   ▼
[Caddy] ──── automatic HTTPS (optional)
   │
   ▼
[MI1K App] ──── port 3100 inside container
   │
   ▼
[PostgreSQL] ──── port 5432 (internal only, not exposed to host)
```

All three services run in Docker containers on the same network. PostgreSQL is **not** accessible from outside — only MI1K can reach it.

Persistent data lives in Docker volumes:
- **mi1k-pgdata** — database files (your companies, agents, issues, users)
- **mi1k-data** — application state (encryption keys, uploaded files, logs)

---

## Troubleshooting

### MI1K won't start
```bash
docker compose -f docker-compose.portable.yml logs mi1k --tail 50
```
Common causes:
- PostgreSQL not ready yet (wait 30 seconds, it has health checks)
- Missing `.env` file (run `mi1k-deploy.sh`)
- Port already in use (change `MI1K_PORT` in `.env`)

### Database connection errors
```bash
docker compose -f docker-compose.portable.yml logs postgres --tail 20
```
Check that the postgres container is running:
```bash
docker ps --filter "name=mi1k-postgres"
```

### Lost the .env file
If you lose your `.env` file, your `POSTGRES_PASSWORD` and `BETTER_AUTH_SECRET` are gone. The database still has data, but you can't connect to it without the password.

To recover:
1. The password is stored inside the PostgreSQL volume. You can reset it:
   ```bash
   docker exec mi1k-postgres psql -U mi1k -c "ALTER USER mi1k PASSWORD 'new-password';"
   ```
2. Update `.env` with the new password
3. Generate a new `BETTER_AUTH_SECRET` (users will need to log in again):
   ```bash
   openssl rand -hex 32
   ```

### HTTPS not working
- Make sure your domain's DNS A record points to this server's IP
- Check Caddy logs: `docker compose -f docker-compose.portable.yml logs caddy`
- Ports 80 and 443 must be open in your firewall

---

## Building a New Portable Package

To create a new portable package from your development server (where you make changes to MI1K):

```bash
cd /root/Production/apps/mi1k

# Full build (rebuilds the Docker image + packages everything)
bash scripts/build-portable.sh --output /tmp

# Skip Docker build (use existing image, just repackage)
bash scripts/build-portable.sh --skip-build --output /tmp
```

This creates a file like `mi1k-portable-v0.3.1.tar.gz` ready to transfer to any server.
