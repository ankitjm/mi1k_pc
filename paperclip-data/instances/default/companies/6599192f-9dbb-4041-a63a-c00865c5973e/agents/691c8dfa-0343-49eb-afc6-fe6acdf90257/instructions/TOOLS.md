# Tools

## Paperclip Skill

Use the `paperclip` skill for all task management and coordination.

## para-memory-files Skill

Use for all memory operations: storing facts, writing daily notes, managing plans.

## SEO Platform Tools

| Tool | Category | Purpose |
|------|----------|---------|
| **Semrush** | All-in-one | Keyword research, site audit, backlink analysis, competitor intelligence, AI visibility tracking |
| **Ahrefs** | All-in-one | Backlink explorer, content gap analysis, keyword difficulty, rank tracking, broken link detection |
| **Google Search Console** | Free / First-party | Indexing status, query performance, Core Web Vitals, crawl errors, rich result status |
| **Google Analytics 4** | Free / Analytics | Organic traffic, conversion attribution, user behavior, SEO revenue measurement |
| **Screaming Frog SEO Spider** | Technical | Full-site crawl: broken links, redirect chains, duplicate content, missing tags, canonical issues |
| **Looker Studio** | Reporting | Custom dashboards combining GSC + GA4 + Ahrefs/Semrush data for stakeholder reporting |
| **Surfer SEO** | Content optimization | AI-powered on-page scoring and NLP keyword recommendations against SERP competitors |
| **Clearscope** | Content optimization | Keyword clustering and content grade for search-intent alignment |
| **PageSpeed Insights / DebugBear** | Performance | Core Web Vitals measurement: LCP, INP, CLS; lab and field data at URL level |
| **Merkle Schema Markup Generator** | Structured data | Generates valid JSON-LD for Product, FAQ, Breadcrumb, HowTo, and Organization schema |
| **Google Rich Results Test** | Structured data | Validates schema markup and previews how rich results appear in SERPs |
| **Pitchbox / BuzzStream** | Link building | Outreach CRM: prospect discovery, personalized email campaigns, relationship tracking |
| **Google Tag Manager** | Tag management | Deploys tracking events and SEO measurement tags without dev dependencies |
| **Google Search Status Dashboard** | Algorithm monitoring | Official source for confirmed Google algorithm updates and search system status |
| **Semrush Sensor** | Algorithm monitoring | Tracks SERP volatility by industry to detect unconfirmed algorithm shifts |

## Usage Notes

- **GSC is always authoritative** for indexing and query data. Semrush/Ahrefs show estimates; GSC shows actuals.
- **Screaming Frog** should be run monthly and after any major site migration or CMS update.
- **Core Web Vitals** from GSC field data (CrUX) are the signals Google uses for ranking — not lab data from PageSpeed alone.
- **GA4 + GSC integration**: Link both properties in Google Analytics to enable the Acquisition > Search Console reports for query-to-conversion attribution.
- **Schema validation**: Always validate new structured data with Rich Results Test AND Schema Markup Validator (validator.schema.org) before deploying to production.
