# RetailerOS

B2B SaaS app for Indian telecom and electronics retailers. Replaces Tally + WhatsApp + Excel for billing, inventory, schemes, CRM, reports, and GST invoicing.

## Current Status (2026-04-09)

Board-directed full reset. The original vanilla JS app (~20k lines, ~20 modules) was accidentally replaced with a React rebuild (~2k lines, 11 pages) when agents over-scoped a login bug fix into a full rebuild. Board wants the original restored with only security hardening applied.

## Key Facts

- **Original code:** Gitea `git.khosha.tech/khosha-bot/RetailerOS` (master branch, `production/` folder)
- **Brand:** Kosha Systems (marketing), Unhive Ventures LLP (billing entity, GST-registered)
- **Domains:** `retaileros.in` (landing page + app at `/app`), `khoshasystems.com` (company site)
- **Product page:** `khoshasystems.com/products/retaileros` — already exists, do NOT create a new one
- **Pricing:** ₹9,999/quarter yearly (₹39,996/year) or ₹14,999/quarter
- **Payment:** Razorpay or Stripe (board has both accounts)
- **Database:** PostgreSQL `retaileros_prod`
- **Deployment:** PM2 + Nginx on Hostinger VPS

## Reset Plan (KHO-270)

7-phase plan with 8 new issues (KHO-271 through KHO-278):

| Issue | Phase | Assignee | Status |
|-------|-------|----------|--------|
| KHO-271 | Restore original app from Gitea | CTO | todo |
| KHO-272 | Security hardening (no UI changes) | CTO | todo |
| KHO-273 | Login fix + onboarding wizard | Frontend Engineer | todo |
| KHO-274 | Razorpay/Stripe payment integration | CTO | todo |
| KHO-275 | Landing page bug fixes + persuasion | Frontend Engineer | todo |
| KHO-276 | Admin section for lead tracking | CTO | todo |
| KHO-277 | Core module QA after restore | QA Engineer | todo |
| KHO-278 | Landing page UX review + specs | UI/UX Designer | todo |

## Open Questions (awaiting board)

1. Free trial period before payment?
2. Google Drive link for demo video + module images
3. Is `retaileros_prod` database intact?
4. Razorpay vs Stripe priority?
5. Demo data — fixed sample or anonymized real?
