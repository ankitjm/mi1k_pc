# ThumbnailOS — VPS Deployment Runbook

**Target:** Hetzner CX21/CX31, Ubuntu 22.04 LTS
**Goal:** Full stack live in < 2 hours from SSH access
**Last updated:** 2026-03-21

---

## Prerequisites (gather before starting)

- [ ] Hetzner VPS SSH credentials (IP, root password or SSH key)
- [ ] Domain `thumbnailos.in` DNS A record pointing to VPS IP
- [ ] All `.env` values ready (see `.env.example`)
- [ ] GitHub repo access (or tarball of codebase)

---

## Step 1 — Initial server setup (~10 min)

```bash
# SSH in as root
ssh root@<VPS_IP>

# Update packages
apt update && apt upgrade -y

# Create deploy user
adduser deploy
usermod -aG sudo deploy

# Copy SSH key to deploy user (run from local machine)
ssh-copy-id deploy@<VPS_IP>

# Switch to deploy user for the rest
su - deploy
```

---

## Step 2 — Install Node.js 20 (~5 min)

```bash
# Install via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node -v   # should be v20.x
npm -v    # should be 10.x
```

---

## Step 3 — Install Python 3.11 (~5 min)

```bash
sudo apt install -y python3.11 python3.11-venv python3-pip

# Verify
python3.11 --version   # should be 3.11.x
pip3 --version
```

---

## Step 4 — Install PostgreSQL 15 (~10 min)

```bash
# Add PostgreSQL repo
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-15

# Start and enable
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create app database and user
sudo -u postgres psql <<EOF
CREATE USER thumbnailos WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
CREATE DATABASE thumbnailos OWNER thumbnailos;
GRANT ALL PRIVILEGES ON DATABASE thumbnailos TO thumbnailos;
EOF

# Verify connection
psql -U thumbnailos -d thumbnailos -h localhost -c '\conninfo'
```

---

## Step 5 — Install Nginx (~5 min)

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Open firewall ports
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Verify Nginx is serving (should see default page)
curl http://localhost
```

---

## Step 6 — Install PM2 (~3 min)

```bash
sudo npm install -g pm2

# Set PM2 to start on reboot
pm2 startup systemd -u deploy --hp /home/deploy
# Run the output command it prints (sudo env PATH=...)
```

---

## Step 7 — Install Certbot / SSL (~10 min)

> DNS A record must be pointing to this server's IP before this step.

```bash
sudo apt install -y certbot python3-certbot-nginx

# Issue certificate
sudo certbot --nginx -d thumbnailos.in -d www.thumbnailos.in \
  --non-interactive --agree-tos --email hello@thumbnailos.in

# Verify auto-renewal
sudo certbot renew --dry-run
```

---

## Step 8 — Deploy application code (~10 min)

```bash
cd /home/deploy

# Clone from GitHub (or extract tarball)
git clone https://github.com/<org>/thumbnailos.git
cd thumbnailos

# Install Node dependencies
npm install --production

# Copy and fill env file
cp agents/engineer/.env.example .env
nano .env   # fill in all values

# Run DB migrations
npm run migrate

# Verify DB schema
psql -U thumbnailos -d thumbnailos -h localhost -c '\dt'
```

---

## Step 9 — Configure Nginx reverse proxy (~5 min)

```bash
sudo nano /etc/nginx/sites-available/thumbnailos
```

Paste this config:

```nginx
server {
    listen 80;
    server_name thumbnailos.in www.thumbnailos.in;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name thumbnailos.in www.thumbnailos.in;

    ssl_certificate /etc/letsencrypt/live/thumbnailos.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/thumbnailos.in/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;

    # Landing page (static or served by Node)
    root /home/deploy/thumbnailos/landing/dist;
    index index.html;

    location / {
        try_files $uri $uri/ @api;
    }

    location @api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /webhook {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/thumbnailos /etc/nginx/sites-enabled/
sudo nginx -t        # must show: syntax is ok
sudo systemctl reload nginx
```

---

## Step 10 — Start application with PM2 (~5 min)

```bash
cd /home/deploy/thumbnailos

# Start API server
pm2 start npm --name "thumbnailos-api" -- start

# Start audit pipeline worker
pm2 start npm --name "thumbnailos-worker" -- run worker

# Save PM2 process list
pm2 save

# Check status
pm2 status
pm2 logs --lines 50
```

---

## Step 11 — Configure cron jobs (~5 min)

```bash
# Edit deploy user's crontab
crontab -e
```

Add these lines (all times IST = UTC+5:30):

```cron
# ThumbnailOS Cron Schedule (IST)
# Sunday 10AM IST = Sunday 04:30 UTC
30 4 * * 0 cd /home/deploy/thumbnailos && npm run cron:research >> /var/log/thumbnailos/research.log 2>&1

# Mon-Tue audit generation, 9AM IST = 03:30 UTC
30 3 * * 1,2 cd /home/deploy/thumbnailos && npm run cron:generate >> /var/log/thumbnailos/generate.log 2>&1

# Wednesday delivery, 10AM IST = 04:30 UTC
30 4 * * 3 cd /home/deploy/thumbnailos && npm run cron:deliver >> /var/log/thumbnailos/deliver.log 2>&1

# Thursday follow-up, 10AM IST = 04:30 UTC
30 4 * * 4 cd /home/deploy/thumbnailos && npm run cron:followup >> /var/log/thumbnailos/followup.log 2>&1

# Friday status report, 5PM IST = 11:30 UTC
30 11 * * 5 cd /home/deploy/thumbnailos && npm run cron:status >> /var/log/thumbnailos/status.log 2>&1
```

```bash
# Create log directory
sudo mkdir -p /var/log/thumbnailos
sudo chown deploy:deploy /var/log/thumbnailos

# Verify crontab saved
crontab -l
```

---

## Step 12 — Smoke test (~10 min)

```bash
# 1. HTTPS loads
curl -I https://thumbnailos.in

# 2. API health check
curl https://thumbnailos.in/api/health

# 3. Test DB connection
psql -U thumbnailos -d thumbnailos -h localhost -c 'SELECT NOW();'

# 4. Test audit pipeline against mock data
cd /home/deploy/thumbnailos
npm run pipeline:test

# 5. Check all PM2 processes are online
pm2 status

# 6. Check Nginx logs for errors
sudo tail -50 /var/log/nginx/error.log
```

---

## Rollback procedure

```bash
# Stop app
pm2 stop all

# Roll back to previous git commit
git log --oneline -5
git checkout <previous-commit-hash>
npm install --production

# Restart
pm2 restart all
```

---

## Time estimates summary

| Step | Task | Time |
|------|------|------|
| 1 | Initial server setup | 10 min |
| 2 | Node.js 20 | 5 min |
| 3 | Python 3.11 | 5 min |
| 4 | PostgreSQL 15 | 10 min |
| 5 | Nginx | 5 min |
| 6 | PM2 | 3 min |
| 7 | Certbot / SSL | 10 min |
| 8 | Deploy app code | 10 min |
| 9 | Nginx config | 5 min |
| 10 | Start with PM2 | 5 min |
| 11 | Cron jobs | 5 min |
| 12 | Smoke tests | 10 min |
| **Total** | | **~83 min** |

---

## Common issues

| Issue | Fix |
|-------|-----|
| `certbot: domain not resolving` | Verify DNS A record, wait for propagation |
| `pg: role does not exist` | Re-run Step 4 psql commands as postgres user |
| `pm2: command not found` | `sudo npm install -g pm2` |
| `nginx: 502 Bad Gateway` | App not running — check `pm2 status` and `pm2 logs` |
| `port 3000 already in use` | `sudo lsof -i :3000` then `kill -9 <pid>` |
