# Tools

## Paperclip Skill

Use the `paperclip` skill for all task management and coordination.

## para-memory-files Skill

Use for all memory operations: storing facts, writing daily notes, managing plans.

## Email Marketing Tools & Stack

### ESP / Marketing Automation

| Tool | Purpose |
|------|---------|
| **Klaviyo** | Primary ESP for ecommerce. Deep segmentation, predictive analytics, flows, SMS, push. Native Shopify integration. Average ROI 30–50x. |
| **Mailchimp** | Secondary ESP for simpler campaigns or lower-volume non-ecommerce sends. |
| **ActiveCampaign** | Advanced automation with CRM, lead scoring, conditional logic. Best for B2B/B2C hybrid. |
| **Omnisend** | Cost-effective Klaviyo alternative for Shopify stores under 10k contacts. 80% of Klaviyo features at 40% cost. |
| **Drip** | Ecommerce-focused ESP with visual workflow builder. Strong segmentation and personalization. |

### Deliverability & Infrastructure

| Tool | Purpose |
|------|---------|
| **SendGrid (Twilio)** | Transactional email API. 99.99% uptime SLA. 1.9s median delivery speed. For system/transactional sends. |
| **Google Postmaster Tools** | Free tool to monitor Gmail sender reputation, spam rates, domain health. Check weekly. |
| **MXToolbox** | Validate SPF, DKIM, DMARC records. Diagnose deliverability issues. Use when adding new infrastructure. |
| **NeverBounce** | Real-time email verification and list cleaning. Remove invalids, spam traps, disposables before import. |
| **ZeroBounce** | Alternative to NeverBounce. Also provides email scoring and activity data. |

### Testing & Quality Assurance

| Tool | Purpose |
|------|---------|
| **Litmus** | Pre-send rendering tests across 100+ clients and devices. Spam filter checks, accessibility, dark mode testing. |
| **Email on Acid** | Alternative to Litmus. Renders, link validation, spam scoring, image blocking preview. |

### Design & Creative

| Tool | Purpose |
|------|---------|
| **Figma** | Email template design and creative handoff with Creative Director. |
| **Canva** | Quick email banners, promotional graphics, and social assets. |

### Analytics & Attribution

| Tool | Purpose |
|------|---------|
| **Google Analytics 4 (GA4)** | Track email-driven traffic, conversions, and revenue via UTM parameters. |
| **Klaviyo Analytics** | Native ESP analytics — open rates, click rates, revenue per email, flow performance. |

### SMS Marketing

| Tool | Purpose |
|------|---------|
| **Klaviyo SMS** | Unified email+SMS in one platform; best for brands wanting single segmentation layer and shared attribution. |
| **Attentive** | Enterprise SMS with AI personalization, TCPA/CTIA compliance, two-way conversational SMS. Use with Klaviyo email when SMS is a primary channel. |
| **Postscript** | Shopify-native SMS; good Klaviyo integration; easier setup for Shopify brands. |

### Zero-Party Data & Personalization

| Tool | Purpose |
|------|---------|
| **Octane AI** | Shopify-native product recommendation quizzes; deep Klaviyo sync; best-in-class for zero-party data collection. |
| **Jebbit** | Interactive quizzes, polls, and surveys with Klaviyo integration; syncs responses to custom properties. |
| **Rebuy** | Shopify-native product recommendation engine; Klaviyo integration for personalized email content blocks. |
| **Nosto** | AI-powered product personalization across email, site, and push; Klaviyo integration. |

### Interactive Email

| Tool | Purpose |
|------|---------|
| **Mailmodo** | AMP-first ESP with full AMP component library (carousels, polls, add-to-cart); always includes HTML fallback. |
| **Maizzle** | Framework for building AMP emails with code; use for custom AMP implementations outside Mailmodo. |

### Inbox Reputation & BIMI

| Tool | Purpose |
|------|---------|
| **Valimail** | Automated DMARC enforcement and BIMI setup; simplifies path to p=reject and VMC deployment. |
| **BIMI Group / Entrust VMC** | Verified Mark Certificate for branded sender logo in Apple Mail and Gmail. |
| **Validity (formerly Return Path)** | Enterprise deliverability monitoring — inbox placement rates, blocklist monitoring, sender score. |

### Accessibility

| Tool | Purpose |
|------|---------|
| **Parcel (parcel.io)** | Free pre-send email accessibility checker; flags contrast ratios, alt text gaps, and semantic structure issues. |

### Outreach & Prospecting (when needed)

| Tool | Purpose |
|------|---------|
| **Hunter.io** | Email prospecting and verification for partnership or influencer outreach. |

---

## UTM Tagging Convention

All email links must include UTM parameters:

```
utm_source=email
utm_medium=email
utm_campaign=<campaign-slug>  (e.g., spring-sale-2026)
utm_content=<link-position>   (e.g., hero-cta, nav-link, footer-cta)
```

---

## Key Metrics & Benchmarks (Ecommerce, 2025)

> **MPP Note**: Open rates are inflated by Apple Mail Privacy Protection (~64% of subscribers on MPP-capable clients). Industry average open rate of 43–45% is an artifact of MPP. Use click rate, CTOR, placed-order rate, and revenue-per-recipient as primary KPIs. Open rate is only useful as a relative trend within your own historical data.

| Metric | Healthy Range | Alert Threshold |
|--------|--------------|-----------------|
| Open rate (campaigns, MPP-inflated) | 43–45% avg | Trend declining = investigate |
| Click rate (campaigns) | 1.7–2.1% avg; 3.5%+ top 10% | <1% investigate |
| Click rate (automated flows) | 5.6% avg; 10%+ top 10% | <2% investigate |
| Click-to-open rate (CTOR) | 8–12% | <6% investigate |
| Placed order rate (campaigns) | 0.16% avg; 0.36% top 10% | — |
| Placed order rate (flows) | 2.11% avg; 4.3% top 10% | — |
| Revenue per recipient (campaigns, top 10%) | $0.97 | — |
| Revenue per recipient (flows, top 10%) | $7.79 | — |
| Unsubscribe rate | <0.2%/send (healthy) | >0.5% review content/frequency |
| Hard bounce rate | <2% | >2% pause and clean list |
| Spam complaint rate | <0.08% | >0.08% immediate action; Google rejects at >0.10% |

### Flow-Specific Revenue Benchmarks (Avg. AOV $100–$200)
| Flow | Avg. Revenue per Recipient |
|------|---------------------------|
| Abandoned cart | $7.01 |
| Welcome series | $3.34 |
| Browse abandonment | $1.95 |
| Win-back | $0.84 |

### Channel Share Context
- Flows = 5.3% of sends, 41% of total email revenue (18x higher RPR than campaigns)
- Email ROI: $36–$42 per $1 spent industry-wide
- Email + SMS subscribers outperform single-channel; both channels drove 42% of GMV in BFCM 2025
