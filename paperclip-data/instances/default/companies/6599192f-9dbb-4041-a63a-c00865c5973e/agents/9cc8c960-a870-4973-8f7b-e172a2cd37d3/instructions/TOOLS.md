# Tools

## Paperclip Skill

Use the `paperclip` skill for all task management, coordination, and team communication.

## para-memory-files Skill

Use for all memory operations: storing facts, writing daily notes, creating entities, managing plans.

---

## Marketing Tool Stack

### Analytics & Measurement
- **Google Analytics 4** — web behavior, funnel analysis, audience segments, conversion tracking
- **Shopify Analytics** — native e-commerce metrics: AOV, LTV cohorts, product performance
- **Triple Whale / Northbeam** — multi-touch attribution for e-commerce; blended ROAS dashboards
- **Segment / Rudderstack** — Customer Data Platform (CDP); event tracking, identity resolution, audience syndication

### Email & SMS
- **Klaviyo** — primary email and SMS automation platform for e-commerce; deep Shopify integration, behavioral triggers, segmentation
- Send via Zapier/Gmail MCP for ad-hoc outreach within Paperclip workflows

### CRM & Marketing Automation
- **HubSpot** — CRM, pipeline management, email automation for B2B/hybrid growth motions

### Paid Media
- **Meta Ads Manager** — Facebook and Instagram campaigns; Advantage+ for DTC scaling
- **Google Ads (Performance Max)** — AI-driven cross-channel Google campaigns; Smart Bidding
- **TikTok Ads** — Smart Performance Campaigns for upper-funnel video

### SEO & Content
- **Semrush / Ahrefs** — keyword research, competitive analysis, backlink audits, rank tracking
- **Conductor / BrightEdge** — enterprise SEO platform; AEO/GEO optimization monitoring

### CRO & UX
- **Hotjar** — heatmaps, session recordings, feedback polls, conversion funnel analysis
- **Google Optimize / VWO** — A/B testing for landing pages and on-site experiments

### AI Content & Creative
- **Claude (Anthropic)** — strategy documents, brief writing, post-mortems, long-form content with brand context
- **Jasper** — brand-voice-consistent marketing copy at scale; trained on brand guidelines
- **Canva** — quick social and ad creative; brand kit for visual consistency
- **Figma** — full design system and brand asset production (via MCP integration)

### Design (MCP Available)
- **Figma MCP** — read designs, generate code from Figma, review brand assets directly in conversation
- **Canva MCP** — create and edit design assets, export for campaigns

### Communication & Workflow
- **Gmail MCP** — read and send emails, manage marketing correspondence
- **Google Calendar MCP** — schedule campaign reviews, team syncs, launch dates
- **Zapier MCP** — workflow automation between marketing tools

### Project Management
- **Paperclip** — task assignment, delegation, progress tracking (primary)
- **Linear / Notion** — campaign planning, content calendar, sprint planning

---

## Tool Usage Guidelines

### When to use each attribution tool
- **GA4**: day-to-day traffic and on-site funnel analysis
- **Triple Whale / Northbeam**: cross-channel paid media ROAS and MTA; use for budget decisions
- **Shopify Analytics**: product-level and cohort-level revenue analysis
- **Segment**: audience building for ad platforms and email segmentation

### AI Content Workflow
1. Write a detailed prompt in Claude with: brand voice description, target audience, campaign objective, key message, word count, and any constraints.
2. Generate 2-3 variations.
3. Human review for brand voice and accuracy.
4. Use approved output; document the prompt in the content playbook for repeatability.

### Figma → Code Workflow
Use the Figma MCP to pull design context directly into conversation:
- `get_design_context` with fileKey + nodeId from any Figma URL
- Adapt output to project's actual component library — never use raw generated code as-is

### Gmail / Calendar MCP Usage
- Use Gmail MCP for: agency correspondence, vendor communications, influencer outreach
- Use Calendar MCP for: scheduling campaign kick-offs, review sessions, retrospectives
- Never send external emails without human review for anything sensitive or external-facing
