# ThumbnailOS — Brevo Campaign Structure

_Ready to import once Brevo account is live. Status: designed, not yet live._
_Updated: March 2026_

---

## Account Setup Requirements (Before Import)

Before importing any campaign or sequence:

1. **From address:** `audit@thumbnailos.in` — set up once domain is registered
2. **Sender name:** `ThumbnailOS` (not a person's name — brand trust, not personal)
3. **Reply-to:** `hi@thumbnailos.in` — monitored by CEO agent
4. **Unsubscribe footer:** Required by Brevo. Use: "You received this because you requested a free audit at thumbnailos.in. [Unsubscribe]"
5. **DKIM/SPF:** Must be configured for thumbnailos.in before first send. Brevo walks through this in Settings → Senders & Domains.

---

## Segment Definitions

Create these segments in Brevo before importing campaigns:

| Segment Name | Definition | Used In |
|---|---|---|
| `free_signup_undelivered` | Signed up for free audit, audit not yet sent | Campaign 1 |
| `free_audit_delivered` | Free audit sent, no paid conversion | Campaigns 2, 3 |
| `paid_starter` | Active Starter plan (₹999/mo) | Campaigns 4, 5 |
| `paid_pro` | Active Pro plan (₹2,499/mo) | Campaign 5 |
| `churned` | Was paid, now unsubscribed | (retention, future) |
| `cold_outreach` | Channels identified by Growth Agent, never signed up | Campaign 0 |

---

## Campaign 0 — Cold Outreach (Growth → Free Signup)

**Trigger:** Growth Agent identifies a target channel and adds their email to Brevo list `cold_outreach`
**From:** `audit@thumbnailos.in`
**Sender name:** `ThumbnailOS`
**List:** `cold_outreach`
**Send time:** Tuesday or Wednesday, 10–11am IST (highest open rates for Indian creators)
**Sequence:** 2 emails (Email 1 + one follow-up if no open within 72 hours)

---

### Email C0-1: Cold Outreach — First Touch

**Subject line variants (A/B test):**
- A: `Your thumbnails are losing you {{estimated_views}} views per video`
- B: `Free CTR audit for {{channel_name}} — takes 2 minutes`
- C: `We analysed {{channel_name}}'s thumbnails — here's what we found`

**Subject personalisation:** `{{channel_name}}` = channel display name from Growth Agent's data

**Body:**

```
Hi {{creator_first_name}},

We ran a quick thumbnail analysis on {{channel_name}} using ThumbnailOS.

Your current CTR is around {{estimated_ctr}}%. For a channel in your niche with {{subscriber_count}} subscribers, that number should be closer to {{target_ctr}}%.

The gap is costing you roughly {{estimated_missed_views}} views per video — every upload.

We built a free tool that gives you a full 3-video thumbnail audit in under 24 hours:
→ thumbnailos.in/free-audit

No credit card. No sales call. Just a PDF with exactly what's wrong and how to fix it.

— ThumbnailOS team

P.S. If you've already hit 5%+ CTR and thumbnails are working great, ignore this — it's not for you.
```

**Plain-text version:** Always include a plain-text version for deliverability.

**Personalisation fields required:** `creator_first_name`, `channel_name`, `estimated_ctr`, `subscriber_count`, `target_ctr`, `estimated_missed_views`

---

### Email C0-2: Cold Outreach — Follow-Up (72h after C0-1, if no open)

**Subject:** `Re: {{channel_name}} thumbnail audit`

**Body:**

```
Just following up on my note from {{days_ago}} days ago.

If {{channel_name}}'s thumbnails are already performing well, no worries — skip this.

If CTR has been nagging at you, the free audit is here: thumbnailos.in/free-audit

Takes 2 minutes to request. We'll handle the rest.

— ThumbnailOS
```

**Send condition:** Only if C0-1 was NOT opened. Do not send if opened but not clicked.

---

## Campaign 1 — Audit Delivery (Free Signup → Audit Sent)

**Trigger:** Creator submits free audit request form at thumbnailos.in
**From:** `audit@thumbnailos.in`
**List:** `free_signup_undelivered`
**Sequence:** 2 emails

---

### Email C1-1: Audit Request Confirmation

**Trigger:** Immediately on form submission
**Subject:** `Your {{channel_name}} thumbnail audit is in the queue`

**Body:**

```
Hi {{creator_first_name}},

Got it — your free thumbnail audit for {{channel_name}} is in the queue.

What happens next:
→ We analyse your 3 most recent videos against our CTR rubric
→ You get a full PDF audit within 24 hours
→ It'll land in this inbox from audit@thumbnailos.in

While you wait: the #1 mistake we see in 80% of Indian creator thumbnails is no face on screen. If you can fix nothing else, add your face to your next video's thumbnail.

Speak soon,
ThumbnailOS

---
thumbnailos.in
```

**No CTA in this email** — just reassurance and one free tip. Don't sell yet.

---

### Email C1-2: Audit Delivery Email

**Trigger:** When Delivery Agent marks audit as approved and ready to send
**Subject:** `Your free thumbnail audit is ready — {{channel_name}}`

**Body:**

```
Hi {{creator_first_name}},

Your ThumbnailOS audit for {{channel_name}} is attached.

The short version:

Your current CTR: {{current_ctr}}%
Your potential CTR: {{potential_ctr}}%
Gap per video: ~{{missed_views}} extra views

The biggest issue we found: {{top_problem_sentence}}

The full audit (attached) covers your 3 most recent videos with specific problems and fixes for each one.

One thing to try this week:
{{top_fix_sentence}}

That's it. No catch. If you want us to do this every week with redesign concepts included, reply to this email and ask about our Starter plan.

— ThumbnailOS

[Download your audit → thumbnailos.in/my-audit/{{audit_token}}]

---
Questions? Just reply to this email.
thumbnailos.in | First month 50% off with code AUDIT50
```

**Personalisation fields:** `creator_first_name`, `channel_name`, `current_ctr`, `potential_ctr`, `missed_views`, `top_problem_sentence`, `top_fix_sentence`, `audit_token`

**Attachment:** PDF audit. Max 5MB. If larger, link instead of attach.

**WhatsApp notification:** Send WhatsApp message simultaneously with this email (see WhatsApp section below).

---

## Campaign 2 — Day 3 Follow-Up (Post-Audit, No Conversion)

**Trigger:** 3 days after C1-2 is sent, if no paid conversion
**Segment:** `free_audit_delivered`
**Subject:** `Did you try any of the thumbnail fixes?`

**Body:**

```
Hi {{creator_first_name}},

Quick check-in — did you get a chance to try any of the fixes from your audit?

If you did, your CTR should start moving within the next 2–3 uploads. YouTube's algorithm picks up thumbnail changes within 24–48 hours.

If you haven't had time yet — that's exactly the problem we solve with our Starter plan.

For ₹999/month, every week you get:
✓ CTR report on your 3 most recent videos
✓ Thumbnail redesign concepts (ready for Canva)
✓ What to change before your next upload

Your first month is 50% off with code AUDIT50 — that's ₹499 for the first 4 weeks.

→ thumbnailos.in/start

If the free audit wasn't useful, reply and tell me why. I read every reply.

— ThumbnailOS
```

**CTA:** Single link to pricing/signup. No multiple CTAs.

**Send condition:** Only if creator has NOT clicked the pricing link or signed up in the previous 3 days.

---

### Email C2-2: Day 7 Follow-Up (If Still No Conversion)

**Trigger:** 7 days after C1-2, if no paid conversion AND C2-1 was opened
**Subject:** `One more thing about your {{channel_name}} thumbnails`

**Body:**

```
Hi {{creator_first_name}},

One thing I didn't mention in your audit:

The thumbnails that hurt your CTR the most aren't the newest ones — they're your most-watched older videos. Those get permanent traffic from search and suggested. Every day they run with a weak thumbnail is a day you're leaving views on the table.

Our Starter plan includes a monthly backlog review — we flag which older videos are worth redesigning first.

₹999/month. Cancel anytime. First month 50% off: AUDIT50

→ thumbnailos.in/start

That's my last email on this. If the timing isn't right, no worries — come back when it is.

— ThumbnailOS
```

**Send condition:** Only if C2-1 was opened. Do not send to people who haven't opened previous emails — reduces spam complaints.

---

## Campaign 3 — Welcome Sequence (Paid Conversion — Starter)

**Trigger:** Creator completes Razorpay checkout for Starter (₹999/mo)
**Segment:** `paid_starter`
**Sequence:** 3 emails over first week

---

### Email C3-1: Welcome + What Happens Next

**Trigger:** Immediately on Razorpay webhook → subscription active
**Subject:** `Welcome to ThumbnailOS Starter — here's what happens now`

**Body:**

```
Hi {{creator_first_name}},

Welcome to ThumbnailOS Starter. You're in.

Here's exactly what happens each week:

Day 1–2: We analyse your 3 most recent uploads
Day 3: You get a CTR report + thumbnail redesign concepts via email
Day 4–7: You implement, we're available on WhatsApp if you have questions

Your first weekly report arrives within 48 hours.

One thing that helps us a lot: reply to this email with your channel's Canva brand kit (fonts, colours) if you have one. It makes our redesign concepts much more useful.

If you don't have a brand kit yet, no problem — we'll help you build one in your first report.

— ThumbnailOS

WhatsApp us: [link]
```

---

### Email C3-2: First Report Delivery

**Trigger:** When first weekly report is ready (within 48h of signup)
**Subject:** `Your first weekly CTR report — {{channel_name}}`

_(Same structure as C1-2 but with redesign concepts included as second PDF attachment)_

---

### Email C3-3: End of Week 1 Check-In

**Trigger:** 7 days after C3-1
**Subject:** `Week 1 complete — how are the numbers looking?`

**Body:**

```
Hi {{creator_first_name}},

Week 1 done. Quick check-in:

→ Did you implement any of last week's redesign concepts?
→ Have you seen any CTR movement on those videos?

Reply with your numbers — we track this for you and include it in your monthly progress summary.

Your Week 2 report arrives in the next 48 hours.

If you want to discuss anything before then, WhatsApp is the fastest way to reach us.

— ThumbnailOS
```

---

## Campaign 4 — Onboarding (Pro Plan)

**Trigger:** Creator upgrades to Pro (₹2,499/mo) or signs up directly
**Segment:** `paid_pro`

---

### Email C4-1: Pro Welcome

**Trigger:** Immediately on Pro subscription activation
**Subject:** `ThumbnailOS Pro is live for {{channel_name}}`

**Body:**

```
Hi {{creator_first_name}},

Pro is live. Here's what you now have:

✓ Daily CTR monitoring — we catch drops before they compound
✓ Unlimited redesign concepts — request anytime via WhatsApp
✓ Monthly backlog review — we identify which older videos to redesign first
✓ Priority WhatsApp — response within 4 hours on weekdays

Your dedicated WhatsApp line: [link]

Save that number. Everything goes through there.

First check-in from us: within 24 hours.

— ThumbnailOS
```

---

## WhatsApp Notification Templates

_To be sent via Brevo Conversations or WhatsApp Business API when account is live._

### WA-1: Audit Delivery Notification

```
Hi {{first_name}} 👋

Your free ThumbnailOS audit for *{{channel_name}}* is ready.

Current CTR: {{current_ctr}}%
Potential CTR: {{potential_ctr}}%

Check your email (audit@thumbnailos.in) for the full PDF.

Questions? Reply here.
```

### WA-2: Weekly Report Notification (Starter)

```
Hi {{first_name}},

Your weekly CTR report for *{{channel_name}}* is in your inbox.

Top finding this week: {{one_line_finding}}

Redesign concepts attached in the email.
```

### WA-3: Pro Daily Alert (CTR Drop)

```
⚠️ CTR Alert — *{{channel_name}}*

*{{video_title}}* dropped from {{prev_ctr}}% to {{curr_ctr}}% in the last 24h.

This could be:
- A thumbnail split test the algorithm is running
- A competing video cannibalising your search slot
- A thumbnail that needs updating

Want us to pull a redesign concept today? Reply YES.
```

---

## Send Timing Guide

| Campaign | Best Day | Best Time (IST) | Reasoning |
|---|---|---|---|
| Cold outreach C0-1 | Tue / Wed | 10–11am | Creators check email mid-morning |
| Cold outreach C0-2 | Fri | 9–10am | End-of-week urgency |
| Audit delivery C1-2 | Any | Within 24h of signup | Expectation set in C1-1 |
| Day 3 follow-up C2-1 | Day+3 | 11am | Avoid Mon morning inbox clutter |
| Day 7 follow-up C2-2 | Day+7 | 11am | Same |
| Welcome emails | Immediate | — | Triggered; time-sensitive |

---

## Brevo Import Checklist

Before going live:

- [ ] Brevo account created (AJ action required)
- [ ] thumbnailos.in domain verified in Brevo (DKIM + SPF configured)
- [ ] `audit@thumbnailos.in` added as verified sender
- [ ] All 6 segments created with correct filter logic
- [ ] Personalisation tokens tested with a dummy contact
- [ ] Unsubscribe link tested — confirms removal from correct list
- [ ] WhatsApp Business account connected to Brevo Conversations (or separate WA API key)
- [ ] Razorpay webhook → Brevo API integration configured (auto-move to paid segments on checkout)
- [ ] Audit PDF attachment tested: renders correctly, ₹ symbol displays, no garbled text
- [ ] Plain-text versions added to all emails
- [ ] Reply-to `hi@thumbnailos.in` set on all campaigns
