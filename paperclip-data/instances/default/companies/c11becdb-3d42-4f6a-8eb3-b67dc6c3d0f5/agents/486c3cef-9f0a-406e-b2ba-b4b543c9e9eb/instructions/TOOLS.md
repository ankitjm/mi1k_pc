# ThumbnailOS — Tools & Credentials Map

All tools used by the ThumbnailOS agent team. Each entry lists the owner, purpose, and setup status.

---

## RESEARCH

### YouTube Data API v3
- **Owner:** Engineer Agent
- **Purpose:** Channel research, CTR data, video stats, subscriber counts
- **Setup:** AJ creates Google Cloud project, enables YouTube Data API v3, shares API key with Engineer
- **Status:** Pending AJ setup

---

## AI ENGINE

### Anthropic Claude API
- **Owner:** Engineer Agent (pipelines), CEO Agent (strategy)
- **Purpose:** Thumbnail analysis, audit report writing, outreach copy generation, strategy iteration
- **Status:** Active (CEO is already running on this)

---

## EMAIL

### Brevo API
- **Owner:** Growth Agent
- **Purpose:** Cold outreach, audit delivery, follow-ups, welcome sequences, onboarding flows
- **Free tier:** 300 emails/day
- **Setup:** AJ creates Brevo account, shares API key with Growth Agent
- **Status:** Pending AJ setup

---

## PAYMENTS

### Razorpay Subscriptions API
- **Owner:** Finance Agent
- **Purpose:** INR recurring payments, subscription management, webhook triggers for onboarding
- **Fee:** 2% flat, zero AMC
- **Setup:** AJ creates Razorpay account, enables subscriptions, shares API key with Finance Agent
- **Status:** Pending AJ setup

### UPI Direct
- **Owner:** Finance Agent
- **UPI ID:** ankitjm-1@okhdfcbank
- **Purpose:** Direct payment fallback, UTR verification for manual payments
- **Status:** Active

---

## NOTIFICATIONS

### WhatsApp Business API
- **Owner:** Delivery Agent
- **Provider:** Interakt or Twilio (TBD)
- **Purpose:** Report delivery notifications, audit ready alerts
- **Status:** To be set up in Week 2

---

## TRACKING

### Airtable API
- **Owner:** CEO Agent (reads), all agents (write)
- **Purpose:** Customer pipeline, outreach tracker, conversion data, MRR dashboard
- **Bases needed:**
  - Customers (name, channel, email, tier, payment status)
  - Outreach (channel URL, email sent, open, reply, converted)
  - Pipeline (leads researched, scored, contacted, follow-up status)
  - MRR Dashboard (weekly snapshots)
- **Status:** Engineer sets up base structure in Week 1

---

## INFRASTRUCTURE

### Hetzner VPS
- **Owner:** Engineer Agent
- **Purpose:** All services, cron jobs, pipelines, API server
- **Spec:** CX21 or CX31, Ubuntu 22.04
- **Setup:** AJ provisions VPS and gives Engineer SSH access
- **Status:** Pending AJ setup

### Domain: thumbnailos.in
- **Owner:** Engineer Agent
- **Purpose:** Landing page, API subdomains, email domain
- **Setup:** AJ registers domain, points DNS to Hetzner VPS
- **Status:** Pending AJ setup

---

## SETUP CHECKLIST FOR AJ

| Action | Assigned To | Status |
|--------|-------------|--------|
| Register thumbnailos.in | AJ | Pending |
| Provision Hetzner VPS (CX21+), share SSH | AJ → Engineer | Pending |
| Create Google Cloud project + YouTube API v3 key | AJ → Engineer | Pending |
| Create Brevo account + share API key | AJ → Growth | Pending |
| Create Razorpay account + enable subscriptions | AJ → Finance | Pending |
