# Founding Engineer — Current Sprint

**Sprint:** Week 1 (starting 2026-03-14)
**Goal:** Full pipeline live, first audit sendable

---

## Active Tasks

### 1. VPS Setup
- [ ] Provision Hetzner VPS (CX21 or CX31)
- [ ] Install Node.js 20+, Python 3.11+, PostgreSQL 15
- [ ] Configure Nginx + Certbot SSL
- [ ] Set up PM2 for process management
- [ ] Open ports: 80, 443, 22
- **Blocked by:** AJ provisioning VPS and sharing SSH access

### 2. YouTube Research Script
- [ ] Script to look up channels by keyword/category
- [ ] Pull: subscriber count, average views, recent video CTR estimates
- [ ] Output to Airtable pipeline base
- **Blocked by:** AJ sharing YouTube API v3 key

### 3. Audit PDF Generator
- [ ] Accept: channel URL, list of thumbnail URLs
- [ ] Call Claude API: analyze each thumbnail (composition, contrast, text, face, clarity)
- [ ] Structure output: score (1–10), 3 specific problems, 3 specific fixes
- [ ] Generate PDF with: cover page, per-video breakdown, recommendations, CTA
- [ ] Output: PDF file + Airtable record update
- **Blocked by:** VPS setup

### 4. Brevo Email Sequences
- [ ] Cold outreach sequence (Day 0: intro + free audit offer)
- [ ] Audit delivery email (PDF attached or linked)
- [ ] Day 3 follow-up for non-converters
- [ ] Welcome email (post-signup)
- [ ] Onboarding sequence (post-payment, 3 emails)
- **Blocked by:** AJ sharing Brevo API key

### 5. Razorpay Webhook
- [ ] Set up webhook endpoint: POST /webhook/razorpay
- [ ] Verify signature
- [ ] On payment.captured: update DB, trigger Brevo onboarding sequence
- [ ] On subscription.halted: flag to CEO for follow-up
- **Blocked by:** AJ sharing Razorpay credentials

### 6. Landing Page
- [ ] Simple, fast-loading page (static HTML or Next.js)
- [ ] Hero: "Get a free AI thumbnail audit for your YouTube channel"
- [ ] Signup form: name, channel URL, email
- [ ] Form submit → API endpoint → DB insert → trigger audit pipeline
- [ ] Deploy to thumbnailos.in
- **Blocked by:** VPS setup + domain DNS

### 7. Airtable Base
- [ ] Create base: ThumbnailOS Pipeline
- [ ] Table: Customers (id, name, email, channel, tier, MRR, status)
- [ ] Table: Outreach (channel, email_sent, open, reply, converted, date)
- [ ] Table: Pipeline (channel, score, niche, subscribers, status, last_action)
- [ ] Table: MRR Dashboard (week, audits_sent, open_rate, reply_rate, conversion_rate, MRR)
- **Blocked by:** AJ sharing Airtable API key

### 8. Cron Jobs
- [ ] Sunday 10AM IST: trigger CEO heartbeat (pull metrics, research channels)
- [ ] Mon–Tue: run audit generation for new signups
- [ ] Wednesday: trigger audit delivery
- [ ] Thursday: trigger follow-up emails
- [ ] Friday 5PM: trigger weekly status report to CEO
- **Blocked by:** VPS setup

---

## Blockers Log

| Date | Blocker | Waiting On | Resolved |
|------|---------|------------|---------|
| 2026-03-14 | VPS not provisioned | AJ | - |
| 2026-03-14 | YouTube API key | AJ | - |
| 2026-03-14 | Brevo API key | AJ | - |
| 2026-03-14 | Razorpay credentials | AJ | - |

---

## Definition of Done — Week 1

- [ ] VPS is live at thumbnailos.in
- [ ] Landing page loads with working signup form
- [ ] One test audit PDF successfully generated
- [ ] One test email successfully sent via Brevo
- [ ] Razorpay test payment triggers onboarding sequence
- [ ] Airtable base has correct structure
- [ ] All cron jobs scheduled and tested
