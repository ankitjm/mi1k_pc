# Tools

## Paperclip Skill

Use the `paperclip` skill for all task management and coordination.

## para-memory-files Skill

Use for all memory operations: storing facts, writing daily notes, managing plans.

---

## Tools & Stack

### Web Analytics
- **Google Analytics 4 (GA4)** — Primary web analytics platform; use for traffic, conversion events, audience segmentation, and funnel analysis. Export raw events to BigQuery for custom analysis.
- **Looker Studio (Google Data Studio)** — Free dashboarding layer on top of GA4 and BigQuery; use for exec-facing marketing dashboards and scheduled reports.

### Product & Behavioural Analytics
- **Mixpanel** — Event-based product analytics; use for funnel analysis, retention cohorts, and user path analysis at the session and event level.
- **Amplitude** — Enterprise-grade product analytics; warehouse-native, strong experimentation module; preferred for teams needing advanced data governance.
- **PostHog** — Open-source alternative to Mixpanel/Amplitude; good for privacy-first or self-hosted setups.

### Data Infrastructure
- **Google BigQuery** — Cloud data warehouse; all raw event and transaction data lands here. Source of truth for all reporting.
- **dbt (data build tool)** — SQL-based transformation layer; write, test, and document data models that power dashboards. All business logic lives in dbt, not in BI tools.
- **Segment / RudderStack** — Customer Data Platform (CDP); collects first-party events from web, mobile, and server, then routes to BigQuery, Mixpanel, ad platforms. Use for a clean, schema-enforced event taxonomy.

### Marketing Attribution
- **Triple Whale** — E-commerce-focused attribution platform (Shopify-native); provides first-party pixel data, blended ROAS, and creative analytics across paid channels.
- **Northbeam** — ML-powered multi-touch attribution; models complex cross-channel journeys; strong for brands spending $100K+/mo on paid media.
- **Rockerbox** — Enterprise attribution platform supporting both digital and offline media measurement.

### Data Visualization & BI
- **Tableau** — Advanced visual analytics; best for complex multi-source data exploration and executive presentations.
- **Power BI** — Microsoft-ecosystem BI; strong governance features; preferred if org is Microsoft-centric.
- **Looker (Google Cloud)** — Model-driven BI with LookML; enforces consistent metric definitions across the org.

### Experimentation
- **Optimizely** — A/B and multivariate testing with statistical significance calculation; use for CRO experiments.
- **VWO (Visual Website Optimizer)** — A/B testing and heatmaps for conversion rate optimisation.

### Tag Management & Tracking
- **Google Tag Manager (GTM)** — Container for all marketing pixels, GA4 events, and conversion tags. All tracking changes go through GTM — never hardcode pixels.
- **Supermetrics** — Automated data connector; pulls ad platform data (Meta, Google Ads, TikTok) into BigQuery or Looker Studio.

### Competitive Intelligence
- **Similarweb** — Estimate competitor traffic, traffic sources, and audience overlap.
- **SEMrush / Ahrefs** — SEO and paid search competitive analysis; monitor keyword rankings and competitor ad spend.
