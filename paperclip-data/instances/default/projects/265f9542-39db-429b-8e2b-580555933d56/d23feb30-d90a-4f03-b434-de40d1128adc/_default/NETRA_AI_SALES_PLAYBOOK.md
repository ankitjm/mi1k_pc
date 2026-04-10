# Netra AI MVP — Sales & Setup Playbook

**Version:** 1.0  
**Date:** April 2026  
**Audience:** Sales Team & Customers  

---

## What is Netra AI?

Netra AI is a **WhatsApp-based AI assistant service** that automatically responds to customer messages using advanced language models. It's designed to help businesses:

- **Respond faster** to customer inquiries (24/7 availability)
- **Reduce support costs** by automating routine responses
- **Capture leads** automatically (all conversations logged)
- **Scale customer support** without hiring more people

**The Service:** We provide a complete, turnkey installation of Netra AI on your infrastructure. You get a working demo environment in 1 week, ready for live customer deployment.

**Price:** Rs.9,999 for setup + Rs.X/month for ongoing support and WhatsApp API costs

---

## The Customer Journey: How It Works

### Step 1: Customer Sends a Message
Customer messages your WhatsApp Business number:
```
Customer: "What are your business hours?"
```

### Step 2: Netra AI Processes the Message
- Message arrives at your Netra AI server
- AI reads the message and understands the intent
- AI generates a relevant, personalized response

### Step 3: Instant Response
Netra AI sends back:
```
Netra AI: "We're open Mon-Fri 9AM-6PM IST. How can I help?"
```

### Step 4: Lead Captured
- Conversation is logged to your Google Sheets
- You can analyze all interactions
- Export leads for follow-up

---

## Use Cases

### 1. Customer Support Automation
- **FAQ responses** (hours, pricing, policies)
- **Order status** inquiries
- **Complaint triage** (route complex issues to humans)

### 2. Lead Generation
- **Qualify leads** from initial inquiry
- **Collect information** (business name, industry, needs)
- **Auto-schedule** callbacks or demos

### 3. Sales Acceleration
- **Product questions** answered instantly
- **Pricing inquiries** automated
- **Trial signups** processed automatically

---

## What You Get (Rs.9,999 Setup)

### ✅ Infrastructure
- **Private VPS** (hosted in India for data residency)
- **Mistral 7B LLM** (advanced open-source AI model)
- **n8n Workflow Engine** (no-code automation)
- **WhatsApp Business Integration** (sandbox + production setup)
- **Google Sheets Logging** (all conversations exported)

### ✅ Support & Documentation
- **Setup Playbook** (step-by-step for your team)
- **Workflow Template** (ready-to-customize)
- **Training Call** (1 hour with your team)
- **30 days free support** (troubleshooting & tweaks)

### ✅ Demo Environment
- **Live WhatsApp demo** (sandbox account provided)
- **Test customer workflows**
- **Verify quality before going live**

---

## Timeline: From Sale to Live (1 Week)

| Day | Milestone | What Happens |
|-----|-----------|--------------|
| **Day 1** | Infrastructure Setup | VPS provisioned, Netra AI installed, systems tested |
| **Day 2** | WhatsApp Integration | Business account verified, API connected, webhook configured |
| **Day 3** | Workflow Configuration | Your team customizes AI responses for your use case |
| **Day 4** | Testing | End-to-end test with dummy messages, logs verified |
| **Day 5** | Training | 1-hour call with your team, handoff documentation |
| **Day 6-7** | Buffer | Final tweaks, rollout plan, go-live preparation |

---

## Demo Walkthrough (5 Minutes)

### Before Setup

**Your VPS (Private, India-hosted)**
```
┌─────────────────────────┐
│   Your Netra AI Server  │
├─────────────────────────┤
│  ✓ Mistral 7B LLM       │
│  ✓ n8n Workflow Engine  │
│  ✓ Database (Postgres)  │
│  ✓ Monitoring (Logs)    │
└─────────────────────────┘
          ↑
     (Your Control)
```

### During Demo

**WhatsApp → AI → Logs Flow**
```
Customer (WhatsApp)
     ↓
  [n8n Webhook]
     ↓
  [Mistral 7B LLM Processing]
  "Generate response to: 'What's your pricing?'"
     ↓
  [Google Sheets Log]
  → Phone: +91-9123456789
  → Message: "What's your pricing?"
  → Response: "Starting at Rs.99/month. Learn more..."
  → Timestamp: 2026-04-09 14:32:15 IST
     ↓
Customer Receives Response
```

### After Setup

Your team:
- ✅ Logs into **n8n Dashboard** (private, password-protected)
- ✅ Customizes **AI personality** (tone, knowledge, rules)
- ✅ Monitors **Google Sheets** for all conversations
- ✅ Analyzes **response quality** and customer satisfaction

---

## Pricing & Payment

### Setup Cost: Rs.9,999 (One-time)
Includes:
- Infrastructure setup
- WhatsApp Business Account setup
- n8n workflow template creation
- Training call
- 30 days free support

### Monthly Costs (Ongoing)
| Item | Cost | Notes |
|------|------|-------|
| VPS Hosting | Rs.800 | CPX11 instance (upgradable) |
| WhatsApp API | Rs.0-2,000 | Free for first 1,000 msgs/month |
| Support | Rs.0 | First 30 days free; Rs.500-1,000/month after |
| **Total** | **Rs.800-2,800** | **Depends on message volume** |

**Example:** If you send 3,000 WhatsApp messages per month:
- VPS: Rs.800
- WhatsApp: Rs.1,500 (overage charges)
- Total: Rs.2,300/month

---

## Setup Instructions for Your Team

### Phase 1: Pre-Setup (Your Side)
1. **Decide on WhatsApp Number** — Use existing or new WhatsApp Business account
2. **Identify Key Contacts** — Who will manage the system day-to-day?
3. **Document AI Knowledge** — Write down your FAQ, policies, product info

### Phase 2: Installation (Our Side)
1. **We provision VPS** in India (Mumbai)
2. **We install Netra AI** (Mistral LLM + n8n + database)
3. **We connect WhatsApp API**
4. **We create workflow template** based on your FAQ
5. **We test end-to-end** with dummy messages

### Phase 3: Handoff (Your Side)
1. **Receive dashboard access** (n8n URL, username/password)
2. **Review workflow template** — See how it works
3. **Customize AI responses** — Adjust tone, knowledge, rules
4. **Attend training call** — 1 hour with Netra AI team
5. **Test with dummy account** — Send/receive test messages
6. **Go live** — Enable live WhatsApp integration

---

## FAQ: Common Questions

### Q: Is my data private?
**A:** Yes. The server is hosted on your private VPS (India-based). Only you and your team have access. We never store your conversations on shared servers.

### Q: Can I customize the AI responses?
**A:** Absolutely. The workflow is fully customizable via n8n. You can:
- Change AI personality (formal/casual/friendly)
- Add custom rules (if customer mentions X, respond with Y)
- Integrate with your CRM or database
- Set up escalation to human agents

### Q: What if the AI gives a wrong answer?
**A:** The AI learns from your feedback:
1. You can edit responses in Google Sheets
2. Mark which ones were wrong
3. The system learns and improves
4. You can also manually review responses before they're sent

### Q: What languages does Netra AI support?
**A:** Currently **English** (primary). Indian language support (Hindi, Tamil, etc.) coming in next release.

### Q: Can I switch from Gupshup to Meta WhatsApp BSP?
**A:** Yes. We start with Gupshup (faster deployment) but you can migrate to Meta WhatsApp Business API anytime. Same workflow, same data.

### Q: What if my VPS goes down?
**A:** Included in the Rs.500-1,000/month support package:
- Automatic backups (daily)
- Uptime monitoring (99.9% SLA)
- Emergency support (4-hour response)
- Disaster recovery (within 24 hours)

---

## Success Metrics: What to Track

After going live, monitor these metrics to measure ROI:

| Metric | Target | How to Measure |
|--------|--------|-----------------|
| **Response Time** | <5 seconds | Google Sheets timestamp |
| **Customer Satisfaction** | >80% positive | Manual review of responses |
| **Automation Rate** | >70% of queries auto-answered | Count auto-responses vs. escalations |
| **Lead Capture** | 100% of WhatsApp convos logged | Sheets row count |
| **Cost Savings** | 50% reduction in support time | Track support hours before/after |

---

## Support & Contact

### During 30-Day Free Support
- **Email:** support@netraai.com
- **WhatsApp:** +91-90XXXXXXXX (emergency)
- **Response Time:** 4 hours (business days)

### Common Support Requests
1. **AI not responding** → Check VPS status, webhook logs
2. **Wrong responses** → Review and edit in n8n workflow
3. **WhatsApp not receiving messages** → Verify API credentials, webhook URL
4. **Performance slow** → Check VPS CPU/memory, upgrade if needed

### Escalation Path
- **Tier 1:** Self-service (Google Sheets, n8n dashboard)
- **Tier 2:** Email support (4-hour response)
- **Tier 3:** Priority support (Rs.500-1,000/month upgrade)
- **Tier 4:** Dedicated engineer (custom pricing)

---

## Next Steps

### Ready to Get Started?
1. **Confirm setup date** — When should we begin?
2. **Provide WhatsApp number** — For Business Account integration
3. **Share your FAQ** — So we can train the AI
4. **Schedule training call** — Pick a date after setup

### Questions?
- Email: sales@netraai.com
- Demo call: [Book here](#)
- WhatsApp: +91-90XXXXXXXX

---

**Netra AI MVP — Powered by Mistral 7B + n8n + WhatsApp**

*Respond faster. Capture more leads. Scale without hiring.*
