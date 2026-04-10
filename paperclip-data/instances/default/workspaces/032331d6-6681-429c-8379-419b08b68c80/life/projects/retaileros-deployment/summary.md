# RetailerOS Production Deployment

**Status:** Active — live at https://retaileros.in/app/
**Goal:** Stable, working RetailerOS SPA accessible at retaileros.in

## Key Facts

- **Live URL:** https://retaileros.in/app/
- **Landing page:** https://retaileros.in/ (separate, do not touch)
- **Server:** khosha.tech / 147.93.111.188 (production VPS)
- **Source:** `/var/www/retaileros/production/` on khosha.tech
- **Express port:** 3010 | PM2 process: `retaileros-prod`
- **Database:** PostgreSQL `retaileros_prod` on localhost:5432
- **Vite base:** `/app/` (assets served at `/app/assets/`)

## Demo Credentials (seeded 2026-04-06)

- Store Code: `ROS-20260225-0001`
- Store Name: Khosha Electronics
- Mobile (OTP): `9876543210`

## Deployment Workflow

1. SSH: `ssh root@khosha.tech` (pw: Kh0shaSystem&)
2. Edit source in `/var/www/retaileros/production/src/`
3. `cd /var/www/retaileros/production && npm run build`
4. PM2 auto-serves — no restart needed for frontend changes

## Critical Rules

- **NEVER edit** `/Users/ankitmehta/Projects/retaileros/` (local machine files — wrong codebase)
- **NEVER add login form to center column** — the dark "OS"/"RETAILER" decorative text is intentional design
- Gitea repo (`git.khosha.tech/khosha-bot/RetailerOS`) only has README — not the source of truth
- GitHub remote (`github.com:ankitjm/retaileros.git`) is also not the deployed version
