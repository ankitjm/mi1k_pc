# ThumbnailOS — Tech Stack

## Architecture Overview

```
thumbnailos.in (Hetzner VPS)
├── Landing Page (static or Next.js)
│   └── Free audit signup form → PostgreSQL
├── API Server (Node.js/Express or FastAPI)
│   ├── /signup → save lead, trigger audit generation
│   ├── /webhook/razorpay → payment confirmation → onboarding
│   └── /audit/:id → serve audit status
├── Audit Pipeline (cron or queue)
│   ├── Pull new signups from DB
│   ├── Fetch channel data via YouTube API v3
│   ├── Analyze thumbnails via Claude API
│   ├── Generate PDF report via PDFKit/Puppeteer
│   └── Trigger Brevo delivery sequence
├── Cron Scheduler (node-cron)
│   ├── Sunday 10AM IST — channel research + weekly brief
│   ├── Mon–Tue — audit generation for new signups
│   ├── Wednesday — audit delivery
│   ├── Thursday — follow-up emails
│   └── Friday — outreach + status report
└── Database (PostgreSQL)
    ├── leads (id, name, email, channel_url, tier, status, created_at)
    ├── audits (id, lead_id, pdf_path, sent_at, opened_at)
    ├── payments (id, lead_id, razorpay_id, amount, status, created_at)
    └── outreach (id, channel_url, email_sent, opened, replied, converted)
```

---

## Services & Integrations

| Service | API | Purpose |
|---------|-----|---------|
| YouTube Data API v3 | REST | Channel research, video stats |
| Anthropic Claude API | REST | Thumbnail analysis, report writing |
| Brevo | REST | Email sequences, delivery |
| Razorpay | REST + Webhooks | INR subscriptions, payment webhooks |
| Airtable | REST | Pipeline tracking, MRR dashboard |
| WhatsApp Business | REST (Interakt/Twilio) | Delivery notifications |
| Hetzner | VPS | All hosting |

---

## Infrastructure

- **VPS:** Hetzner CX21 (2 vCPU, 4GB RAM) or CX31 (4 vCPU, 8GB RAM)
- **OS:** Ubuntu 22.04 LTS
- **Web server:** Nginx (reverse proxy)
- **SSL:** Let's Encrypt (Certbot)
- **Process manager:** PM2
- **Database:** PostgreSQL 15+

---

## Environment Variables Required

```
# YouTube
YOUTUBE_API_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Brevo
BREVO_API_KEY=
BREVO_SENDER_EMAIL=hello@thumbnailos.in
BREVO_SENDER_NAME=ThumbnailOS

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Airtable
AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=

# WhatsApp (Phase 2)
WHATSAPP_API_KEY=
WHATSAPP_PHONE_ID=

# App
DATABASE_URL=postgresql://...
APP_PORT=3000
NODE_ENV=production
```

---

## Deployment Flow

1. SSH into Hetzner VPS
2. Clone repo (private GitHub repo)
3. `npm install` / `pip install -r requirements.txt`
4. Set `.env` with all API keys
5. Run DB migrations
6. Start with PM2: `pm2 start ecosystem.config.js`
7. Configure Nginx reverse proxy
8. Set up SSL with Certbot
9. Configure cron jobs via node-cron or crontab
