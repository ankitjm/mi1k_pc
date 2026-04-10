# Razorpay Subscription Setup Guide
## ThumbnailOS — End-to-End Configuration for a Non-Technical Operator

This guide walks you through everything: creating subscription plans in the Razorpay dashboard, configuring webhooks, and wiring plan IDs into the application. Follow these steps exactly. You do not need a developer to complete this.

---

## Before You Start

You will need:
- A Razorpay account (go to razorpay.com → Sign Up → complete KYC)
- Business type: Individual or Sole Proprietorship is fine for starting
- Bank account linked for payouts
- Your ThumbnailOS backend URL (e.g., `https://thumbnailos.in/api/webhooks/razorpay`)

You will **not** need:
- Any coding skills
- Access to the server

---

## Part 1: Create Subscription Plans

Razorpay subscriptions require you to create "Plans" first — a Plan defines the price, billing interval, and name. Customers then subscribe to a Plan.

### Step 1 — Go to the Plans section

1. Log in at dashboard.razorpay.com
2. In the left sidebar, click **Subscriptions**
3. Click **Plans** in the sub-menu
4. Click the blue **+ Create New Plan** button (top right)

---

### Step 2 — Create the Starter Plan (₹999/month)

Fill in the form exactly as shown:

| Field | Value |
|---|---|
| Plan Name | ThumbnailOS Starter |
| Plan Description | Weekly CTR reports for up to 5 videos |
| Billing Amount | 999 |
| Currency | INR |
| Billing Period | Monthly |
| Billing Frequency | 1 (bills every 1 month) |
| Trial Period | 0 (leave blank or enter 0 — no free trial) |

Click **Create Plan**.

You will see a confirmation screen showing a **Plan ID** that starts with `plan_`. It looks like: `plan_Abc123XyzDEF456`

**Copy this Plan ID and save it** — you will need it in Part 3.

---

### Step 3 — Create the Pro Plan (₹2,499/month)

Click **+ Create New Plan** again.

| Field | Value |
|---|---|
| Plan Name | ThumbnailOS Pro |
| Plan Description | Daily monitoring, redesign concepts, WhatsApp alerts |
| Billing Amount | 2499 |
| Currency | INR |
| Billing Period | Monthly |
| Billing Frequency | 1 |
| Trial Period | 0 |

Click **Create Plan**.

**Copy this Plan ID** as well (it will also start with `plan_`).

---

### Step 4 — Verify both plans exist

Go to **Subscriptions → Plans**. You should see two plans listed:
- ThumbnailOS Starter — ₹999 / month
- ThumbnailOS Pro — ₹2,499 / month

Both plans will show status **Active**. If either shows **Inactive**, click the plan name and toggle it to Active.

---

## Part 2: Configure Webhooks

Webhooks let Razorpay notify ThumbnailOS the moment a payment succeeds or fails. Without this, the system cannot automatically activate a customer's account.

### Step 5 — Open Webhook settings

1. In the left sidebar, click **Settings**
2. Click **Webhooks**
3. Click **+ Add New Webhook**

---

### Step 6 — Configure the webhook

| Field | Value |
|---|---|
| Webhook URL | `https://thumbnailos.in/api/webhooks/razorpay` |
| Secret | Generate a random string (e.g., use [random.org](https://random.org) or any password generator — 32 characters, alphanumeric). **Save this secret** — it goes in `.env` too. |
| Alert Email | your email address |

**Enable these events** (tick each checkbox):

- `subscription.activated` — fires when a new subscription is first activated
- `subscription.charged` — fires every time a recurring payment succeeds
- `subscription.cancelled` — fires when a customer cancels
- `subscription.halted` — fires when a subscription is suspended (e.g., repeated payment failures)
- `payment.captured` — fires when any payment is captured (belt-and-suspenders for missed `subscription.charged` events)
- `payment.failed` — fires when a payment attempt fails

Leave all other events unchecked unless instructed otherwise.

Click **Save**.

---

### Step 7 — Verify webhook delivery

After saving, you will see your webhook listed with a status indicator. Razorpay will send a test ping automatically. If the status shows a red error, it means your backend URL is not yet reachable — this is expected until the server is deployed. The webhook configuration is still saved correctly; it will start delivering events as soon as the URL goes live.

---

## Part 3: Wire Plan IDs into the Application

The application reads plan IDs from environment variables. This is how you tell it which Razorpay plan to link to which pricing tier.

### Step 8 — Open your `.env` file

On your server (or in your deployment settings), open the file called `.env`. It is usually in the root of the project folder.

Add or update these lines:

```
# Razorpay Credentials
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXX
RAZORPAY_KEY_SECRET=your_key_secret_here

# Subscription Plan IDs
RAZORPAY_PLAN_ID_STARTER=plan_REPLACE_WITH_YOUR_STARTER_PLAN_ID
RAZORPAY_PLAN_ID_PRO=plan_REPLACE_WITH_YOUR_PRO_PLAN_ID

# Webhook Secret (must match what you entered in Step 6)
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

**Where to find your Key ID and Key Secret:**
1. In the Razorpay dashboard, go to **Settings → API Keys**
2. If no keys exist, click **Generate Test Mode API Keys**
3. Copy the **Key ID** (starts with `rzp_test_` in test mode, `rzp_live_` in live mode) and the **Key Secret**
4. The Key Secret is shown **only once** — copy it immediately

---

### Step 9 — How to find the Plan IDs again (if you lost them)

1. Go to **Subscriptions → Plans**
2. Click the plan name
3. The Plan ID is shown at the top of the plan detail page (starts with `plan_`)

---

## Part 4: Test Mode vs Live Mode

### Understanding the difference

| | Test Mode | Live Mode |
|---|---|---|
| Payments | Fake (no real money moves) | Real money |
| Key prefix | `rzp_test_` | `rzp_live_` |
| Plan IDs | Different from live | Different from test |
| Webhooks | Fire for test events | Fire for real events |

**Test mode and live mode are completely separate.** Plans created in test mode do not carry over to live mode. You will need to create the two plans again in live mode (same steps, Part 1).

---

### Step 10 — How to switch to live mode

You stay in test mode until you are ready to charge real customers.

**Pre-conditions before going live:**
1. KYC is complete and approved (Razorpay sends an email when this is done — typically 1–3 business days)
2. You have run at least one successful test subscription end-to-end
3. Webhook URL is live and confirmed working

**To switch:**
1. Click the **Test Mode** toggle at the top of the Razorpay dashboard — it will flip to **Live Mode**
2. Go to **Settings → API Keys** → Generate Live Mode API Keys
3. Repeat Part 1 (create both plans in live mode) and note the new Plan IDs
4. Update `.env` with the live Key ID, Key Secret, and new Plan IDs
5. Restart the server

---

### Step 11 — Test the full payment flow (before going live)

Use Razorpay's test card details to simulate a subscription:

| Field | Test Value |
|---|---|
| Card Number | 4111 1111 1111 1111 |
| Expiry | Any future date |
| CVV | Any 3-digit number |
| OTP | 1234 (Razorpay test OTP) |

For UPI test payments, use the UPI ID: `success@razorpay`

To test a failed payment, use card: `4000 0000 0000 0002`

---

## Quick Reference — What Goes Where

| Variable | Where to get it | Where it goes |
|---|---|---|
| `RAZORPAY_KEY_ID` | Dashboard → Settings → API Keys | `.env` |
| `RAZORPAY_KEY_SECRET` | Dashboard → Settings → API Keys (once only) | `.env` |
| `RAZORPAY_PLAN_ID_STARTER` | Dashboard → Subscriptions → Plans → Starter | `.env` |
| `RAZORPAY_PLAN_ID_PRO` | Dashboard → Subscriptions → Plans → Pro | `.env` |
| `RAZORPAY_WEBHOOK_SECRET` | You set it when creating the webhook | `.env` + Razorpay webhook config |

---

## Checklist — Ready to Accept Payments?

- [ ] Starter plan created in Razorpay (₹999/month)
- [ ] Pro plan created in Razorpay (₹2,499/month)
- [ ] Both Plan IDs copied into `.env`
- [ ] Webhook URL configured with correct events enabled
- [ ] Webhook secret saved in `.env`
- [ ] API keys (Key ID + Key Secret) in `.env`
- [ ] Test subscription completed successfully with test card
- [ ] Webhook delivery confirmed in Razorpay dashboard logs
- [ ] KYC approved (required before live mode)
- [ ] Live mode plan IDs created and added to `.env` (when ready to go live)

---

*Last updated: March 2026. Razorpay dashboard UI may change — if a step looks different, look for the same concept (Plans, Webhooks, API Keys) in the current UI.*
