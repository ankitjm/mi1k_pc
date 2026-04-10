# Tools

## Paperclip Skill

Use the `paperclip` skill for all task management and coordination.

## para-memory-files Skill

Use for all memory operations: storing facts, writing daily notes, managing plans.

## Paid Advertising Platforms

| Tool | Category | Purpose |
|---|---|---|
| **Google Ads** | Campaign Management | Search (+ AI Max), Shopping, Performance Max, Demand Gen, Display, YouTube. Primary high-intent acquisition channel. |
| **Meta Ads Manager** | Campaign Management | Facebook & Instagram. Advantage+ Sales Campaigns (ASC, formerly ASC), Reels, Andromeda-optimized creative batching. |
| **LinkedIn Campaign Manager** | Campaign Management | B2B and high-LTV audience targeting via job title, company, seniority. Higher CPL but premium intent. |
| **TikTok Ads Manager + TikTok Shop** | Campaign Management | Short-form video ads and native commerce channel. Spark Ads for UGC. TikTok Shop projected $20B+ GMV 2026. |
| **Amazon DSP** | Retail Media | Programmatic display/video within Amazon and off-Amazon inventory. ~76% of retail media ad spend. Product-level and audience-level targeting. |
| **Google Analytics 4 (GA4)** | Analytics | On-site funnel analysis, user behavior, goal/event tracking. Use as diagnostic tool only — not Smart Bidding conversion source. |
| **Triple Whale** | Attribution | Ecommerce-native attribution and blended ROAS dashboard. Built for Shopify DTC brands. First-party pixel with server-side accuracy. Includes Incrementality testing module. |
| **Northbeam** | Attribution | ML media mix modeling. Cross-channel attribution showing true channel contribution across Meta, Google, TikTok, Pinterest. |
| **Measured** | Incrementality | Geo holdout incrementality testing platform. Measures true causal lift per channel via controlled experiments. Industry standard for proving true ad ROI vs correlation. |
| **Rockerbox** | Unified Measurement | Enterprise-grade unified measurement combining digital + offline attribution. Best for complex, multi-channel operations with offline touchpoints. |
| **Supermetrics** | Data Aggregation | Pull data from 100+ ad platforms into Google Sheets / Looker Studio. Automates reporting pipelines. |
| **Looker Studio** | Reporting | Custom paid media dashboards for CMO/CEO. Connect Supermetrics data for live reports. |
| **Optmyzr** | Automation | Google Ads optimization scripts, bid automation rules, budget pacing, PPC workflow automation. |
| **Revealbot** | Automation | Meta & Google Ads automation rules. 30+ condition logic for pausing, scaling, and alerting on KPI thresholds. |
| **Google Tag Manager (GTM)** | Tracking | Tag management, conversion event configuration, server-side container for enhanced data quality. |
| **Hotjar / Microsoft Clarity** | CRO | Post-click landing page heatmaps, scroll maps, and session recordings. Diagnose conversion drop-offs. |
| **AdCreative.ai / Canva** | Creative | AI-assisted ad creative generation and iteration. Rapid creative concept production for A/B testing and Andromeda Entity ID diversity. |
| **Klaviyo** | Audience Sync | Sync CRM/email segments to Meta and Google for suppression lists, retargeting seeds, and lookalike creation. |

## Attribution Philosophy

- **Dual tracking is non-negotiable**: browser-side pixel AND server-side (CAPI for Meta, Enhanced Conversions for Google).
- **Data-driven attribution** provides 20-30% more accurate insights than last-click; use it where conversion volume allows.
- **Never use GA4 as primary conversion source for Smart Bidding** — 6-18 hour lag degrades optimization signals.
- **Event match quality** on Meta CAPI should be ≥ 7.0. Below that, server-side tracking needs debugging.
- **Platform ROAS is not incremental ROAS.** Branded search and retargeting channels can show 5-10x inflated ROAS versus true incremental lift. Validate all channels with geo holdout tests at least quarterly.
- **Incrementality testing hierarchy**: geo holdout > media mix modeling > multi-touch attribution > last-click. Use geo holdouts for budget decisions; MTA for channel-level optimization.
- **Enrich server-side events** with hashed PII (email, phone, address) to maximize match rates — higher match rates = better Andromeda and Smart Bidding performance.

## Automation Rules Reference

### Meta — Auto-pause rule
Condition: ROAS < 1.5 AND spend > $500 over last 7 days
Action: Pause ad set, notify via comment on active task

### Meta — Auto-scale rule
Condition: ROAS > 3.5 AND CPMr stable (< $20) over last 7 days
Action: Increase budget by 15-20%, flag for review

### Google Ads — Budget pacing alert
Condition: Daily budget consumed > 85% before 6pm local time
Action: Alert, review bid strategy, check for anomalies

## Creative Testing Stack

- **Test campaign budget**: 10-15% of total channel budget reserved for new creative testing
- **Minimum test duration**: 7 days OR $200 spend per creative variant (whichever comes first)
- **Winner threshold**: ROAS ≥ 1.5x account average with statistical confidence
- **Creative velocity target**: 5-10 new genuinely distinct concepts/week across active channels
- **Andromeda Entity ID rule**: Each Meta creative must have a visually and conceptually distinct hook to receive a unique Entity ID. Use distinct archetypes, narratives, and visual styles — not just different hooks on the same concept.
- **Demand Gen creative requirements**: Minimum 3 images per format (landscape, square, portrait) + videos in horizontal, vertical, and square (6-30 seconds). "Excellent" Ad Strength required.
- **AI Max asset requirements**: Ensure multiple ad copy variants, final URL expansion enabled, and sitewide tagging complete for AI Max to maximize search term expansion.

## Google Power Pack Campaign Structure (2026)

Recommended Google Ads budget allocation for ecommerce brands:

| Campaign Type | Budget Share | Primary Role |
|---|---|---|
| **AI Max for Search** | 30-40% | High-intent query capture; 14-27% conversion uplift vs standard Search |
| **Performance Max** | 30-40% | Full inventory reach (Search, Shopping, Display, YouTube, Discover) |
| **Demand Gen** | 10-20% | Upper-funnel awareness; 68% incremental audiences not captured by Search |
| **Standard Shopping** | 5-15% | Precise control of highest-margin/highest-priority SKUs |
| **Test/Experiment** | 5-10% | New creative, audiences, campaign types |

## Incrementality Testing Calendar

| Quarter | Test |
|---|---|
| Q1 | Meta acquisition channels (Advantage+ vs prospecting) |
| Q2 | Google branded search + retargeting true lift validation |
| Q3 | TikTok / new channel incremental contribution |
| Q4 | Full channel mix holdout (scale back lowest incrementality channels before peak season) |
