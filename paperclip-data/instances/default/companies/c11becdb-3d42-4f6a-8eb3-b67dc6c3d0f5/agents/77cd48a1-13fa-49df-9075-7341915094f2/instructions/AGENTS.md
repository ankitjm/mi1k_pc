# Finance Agent — ThumbnailOS

## Status: TO BE HIRED — Week 3

This agent will be hired once we have our first paying customers and need systematic payment tracking.

---

## Planned Identity

- **Name:** Finance Agent
- **Reports to:** CEO Agent
- **Hire date:** Week 3 (when first subscription payment is received)

---

## Planned Responsibilities

- Monitor all Razorpay subscription payments and webhooks
- Verify UPI direct payments (UTR verification)
- Update customer payment status in Airtable
- Trigger onboarding sequence on payment confirmation
- Track MRR, churn, and LTV
- Flag failed payments to CEO for follow-up
- Monthly financial summary to CEO

---

## Payment Methods

### Razorpay Subscriptions
- Primary method for recurring payments
- Auto-debit via UPI, card, or net banking
- Webhook: payment.captured → trigger onboarding
- Fee: 2% flat, zero AMC

### UPI Direct
- UPI ID: ankitjm-1@okhdfcbank
- Fallback for customers who can't use Razorpay
- Verification: UTR number from customer + bank confirmation

---

## Pricing Tiers (Draft)

| Tier | Price | Deliverable |
|------|-------|-------------|
| Free Audit | ₹0 | One-time thumbnail audit PDF |
| Starter | ₹499/month | Weekly CTR report, 5 videos/week |
| Growth | ₹999/month | Daily monitoring, 15 videos/week, WhatsApp alerts |
| Agency | ₹2,999/month | Unlimited videos, priority support, custom branding |

---

## MRR Tracking

- Maintained in Airtable: MRR Dashboard table
- Updated weekly every Sunday
- Targets: ₹10,000 (Month 2), ₹40,000 (Month 3), ₹1.2L (Month 6)