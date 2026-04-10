# AJ Setup Guide — ThumbnailOS

**What this is:** Five one-time actions you need to take so we can go live. Each action takes 2–5 minutes. Once you do them and send the CEO the credentials, the entire system can be deployed automatically.

---

## Action 1 — Provision the VPS (Server)

This is the computer in the cloud that runs ThumbnailOS.

**Step 1:** Go to **https://hetzner.com/cloud**

**Step 2:** Sign up or log in, then click **"New Project"** → name it `thumbnailos`

**Step 3:** Inside the project, click **"Add Server"**

**Step 4:** Configure it exactly:
- Location: **Bangalore** (or Helsinki if Bangalore is unavailable)
- Image: **Ubuntu 22.04**
- Type: **CPX21** (2 vCPUs, 4 GB RAM) — costs ~€7/month
- SSH Key: Click **"Add SSH Key"** → paste your public key (or ask the CEO to generate one for you)
- Name: `thumbnailos-prod`

**Step 5:** Click **"Create & Buy Now"**

**Step 6:** Once created, copy the **IPv4 address** shown on the server page (looks like `157.90.x.x`)

**What to send the CEO:** The server IPv4 address + confirmation that SSH access works

---

## Action 2 — Register the Domain

**Step 1:** Go to **https://namecheap.com** (or any registrar you already use)

**Step 2:** Search for `thumbnailos.in` — it should be available for ~₹800–1200/year

**Step 3:** Add to cart and complete purchase

**Step 4:** Once purchased, click **"Manage"** on the domain → go to **"Advanced DNS"**

**Step 5:** Add two A Records:
| Type | Host | Value | TTL |
|------|------|-------|-----|
| A Record | `@` | *(your server IP from Action 1)* | Automatic |
| A Record | `www` | *(your server IP from Action 1)* | Automatic |

**Step 6:** Delete any existing A records or CNAME records that were there by default (they'll conflict)

**What to send the CEO:** Confirmation that the domain is registered and DNS records are set

---

## Action 3 — Get Razorpay API Keys + Set Up Webhook

Razorpay handles all payments.

**Step 1:** Go to **https://dashboard.razorpay.com** → Sign up for a business account (you'll need your PAN + bank account for KYC — plan for 1–2 days)

**Step 2:** Once logged in, click **"Settings"** in the left sidebar → **"API Keys"**

**Step 3:** Click **"Generate Test Key"** first (we test before going live). You'll see:
- **Key ID** — starts with `rzp_test_`
- **Key Secret** — shown only once, copy it immediately

**Step 4:** To get your **Live Keys** (after KYC is approved): same page → click **"Generate Live Key"**
- **Key ID** — starts with `rzp_live_`
- **Key Secret** — copy immediately

**Step 5:** Set up the webhook:
- Still in **Settings** → click **"Webhooks"** → **"Add New Webhook"**
- Webhook URL: `https://thumbnailos.in/webhook/razorpay`
- Secret: Type any strong password (e.g. 30+ random characters) — **save this, you'll need it**
- Check these events:
  - ✅ `subscription.activated`
  - ✅ `subscription.charged`
  - ✅ `subscription.cancelled`
  - ✅ `subscription.halted`
  - ✅ `subscription.created`
- Click **"Create Webhook"**

**What to send the CEO:**
```
RAZORPAY_KEY_ID=rzp_live_xxxx
RAZORPAY_KEY_SECRET=xxxx
RAZORPAY_WEBHOOK_SECRET=xxxx
```

---

## Action 4 — Get YouTube Data API Key

We use this to fetch channel and video data for audits.

**Step 1:** Go to **https://console.cloud.google.com** → Sign in with your Google account

**Step 2:** Click the project dropdown at the top → **"New Project"** → name it `ThumbnailOS` → **"Create"**

**Step 3:** In the left sidebar → **"APIs & Services"** → **"Library"**

**Step 4:** Search for **"YouTube Data API v3"** → click it → click **"Enable"**

**Step 5:** Go to **"APIs & Services"** → **"Credentials"** → **"Create Credentials"** → **"API key"**

**Step 6:** Copy the API key shown. Then click **"Edit API Key"**:
- Name it `thumbnailos-prod`
- Under **"API restrictions"**: select "Restrict key" → choose **"YouTube Data API v3"**
- Click **"Save"**

**What to send the CEO:**
```
YOUTUBE_API_KEY=AIzaSy_xxxx
```

---

## Action 5 — Get Airtable API Key

We use Airtable to track customers, outreach, and MRR. It's a visual spreadsheet database.

**Step 1:** Go to **https://airtable.com** → Sign up or log in

**Step 2:** Create a new base: click **"Add a base"** → **"Start from scratch"** → name it `ThumbnailOS`

**Step 3:** Inside the base, create 4 tables (click the **+** tab button to add each):
- `Customers`
- `Outreach`
- `Pipeline`
- `MRR Dashboard`

(You don't need to add columns yet — the CEO agent will configure them.)

**Step 4:** Get the Base ID:
- Look at the URL in your browser: `https://airtable.com/appXXXXXXXXXXXXXX/...`
- The part starting with `app` followed by letters/numbers is your **Base ID**

**Step 5:** Get your API Key:
- Go to **https://airtable.com/account** → scroll to **"API"** section
- Click **"Generate API key"** (or copy existing key if you have one)

**What to send the CEO:**
```
AIRTABLE_API_KEY=pat_xxxx
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
```

---

## What to Send the CEO Once Each Step Is Done

Once you've completed all 5 actions, send the CEO a message with the following:

```
Done. Here are the credentials:

## Server
VPS_IP=157.90.x.x   ← your actual IP

## Domain
thumbnailos.in is registered and DNS A records are pointing to the VPS.

## Razorpay
RAZORPAY_KEY_ID=rzp_live_xxxx
RAZORPAY_KEY_SECRET=xxxx
RAZORPAY_WEBHOOK_SECRET=xxxx

## YouTube
YOUTUBE_API_KEY=AIzaSy_xxxx

## Airtable
AIRTABLE_API_KEY=pat_xxxx
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
```

Send these as a message to the CEO — do **not** put them in any file or email.
Once received, the team will handle everything else from here.
