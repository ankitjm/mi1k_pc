# Netra AI MVP — Tech Stack Architecture & Runbook

**Status:** Planning  
**Deadline:** April 20, 2026 (14 days)  
**Reference Issue:** [KHO-203](/KHO/issues/KHO-203)

---

## Architecture Overview

```
WhatsApp Business API
    ↓
n8n (Workflow Orchestration)
    ├→ Ollama LLM (on VPS)
    └→ Google Sheets (Lead Storage)
```

**Components:**
- **VPS:** Hetzner India (Rs.800/mo) — compute-optimized for Ollama
- **Ollama:** Mistral 7B model (efficient, good quality-to-speed)
- **n8n:** Self-hosted Docker, reverse-proxied via nginx
- **WhatsApp:** Meta Business Cloud API or Gupshup free tier
- **Storage:** Google Sheets via API

---

## Phase 1: VPS Setup & Ollama (Days 1-2)

### Hetzner India VPS Configuration

**Recommended Instance:**
- **Type:** CPX11 or CPX21 (compute-optimized)
- **CPU:** 2-4 vCPU
- **RAM:** 4-8 GB (Mistral 7B needs ~8GB + overhead)
- **Disk:** 30-50 GB SSD
- **Region:** India (Mumbai)
- **Price:** ~Rs.800/mo for CPX11
- **OS:** Ubuntu 22.04 LTS

**Security:**
- SSH key-based auth only (disable password auth)
- Firewall: port 22 (SSH), 80/443 (web), 5432 (optional: postgres for n8n)
- UFW rules: default deny in, allow 22/80/443 out

### Ollama Setup (Docker)

**Installation & Configuration:**

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ollama

# Run Ollama container
docker run -d \
  --name ollama \
  --gpus all \
  -p 11434:11434 \
  -v ollama_data:/root/.ollama \
  ollama/ollama:latest

# Pull Mistral 7B model
docker exec ollama ollama pull mistral

# Test API endpoint
curl http://localhost:11434/api/generate \
  -d '{
    "model": "mistral",
    "prompt": "Who are you?",
    "stream": false
  }'
```

**Model Choice Rationale:**
- **Mistral 7B:** 7 billion parameters, good quality/speed trade-off
- **Inference Speed:** ~2-5 tokens/sec on CPU, ~20 tokens/sec on GPU
- **Memory:** ~8GB RAM required
- **Alternative:** Llama 2 7B (if Mistral underperforms)

---

## Phase 2: n8n Deployment (Days 1-2)

### n8n Docker Setup

```bash
# Create n8n directory structure
mkdir -p /opt/n8n/{data,certs}
cd /opt/n8n

# docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  n8n:
    image: n8n:latest
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=n8n.netra-ai.com  # Update after DNS setup
      - N8N_PROTOCOL=https
      - N8N_PORT=5678
      - NODE_ENV=production
      - GENERIC_TIMEZONE=Asia/Kolkata
    volumes:
      - ./data:/home/node/.n8n
      - ./certs:/etc/ssl/certs
    restart: unless-stopped
    networks:
      - n8n_net

  nginx-proxy:
    image: nginx:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - n8n
    networks:
      - n8n_net
    restart: unless-stopped

networks:
  n8n_net:
    driver: bridge
EOF

# Start services
docker-compose up -d
```

### nginx Reverse Proxy Configuration

```nginx
# /opt/n8n/nginx.conf
upstream n8n {
    server n8n:5678;
}

server {
    listen 80;
    server_name n8n.netra-ai.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name n8n.netra-ai.com;

    ssl_certificate /etc/nginx/certs/n8n.crt;
    ssl_certificate_key /etc/nginx/certs/n8n.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://n8n;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # WebSocket support
    location /webhook {
        proxy_pass http://n8n;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
```

**SSL Certificate Setup:**
- Use Let's Encrypt with Certbot
- Auto-renewal via cron (daily check)

---

## Phase 3: WhatsApp Integration (Days 3-4)

### Option A: Meta Business Cloud API (Recommended for Production)

**Prerequisites:**
- Meta Business Account (existing or new)
- Phone number ownership verification
- App approval from Meta (can take 3-5 business days)

**Setup Steps:**
1. Create Facebook App (WhatsApp Business Platform)
2. Generate access token (60-day expiry, renew via app dashboard)
3. Configure webhook URL: `https://n8n.netra-ai.com/webhook/whatsapp`
4. Verify webhook token in n8n

**Cost:** Free for first 1,000 messages/month; pay-as-you-go after that

### Option B: Gupshup Free Tier (Faster Setup)

**Advantages:** Immediate sandbox access, no app approval wait  
**Limitations:** Limited messaging/day, sandbox-only (test mode)

**Setup:**
1. Sign up at gupshup.io (free tier)
2. Create WhatsApp Business Account
3. Generate API key
4. Configure webhook in n8n

---

## Phase 4: n8n Workflow Template (Days 5-6)

### Workflow: WhatsApp → Ollama → Google Sheets

**Nodes:**
1. **Webhook (Trigger)** — Listen for WhatsApp messages
2. **Ollama LLM** — Generate reply using Mistral 7B
3. **Google Sheets** — Append lead info (phone, message, reply, timestamp)
4. **WhatsApp Send** — Send reply back to user

**Workflow JSON Structure:**

```json
{
  "name": "WhatsApp Chatbot with Ollama",
  "nodes": [
    {
      "name": "WhatsApp Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "whatsapp",
        "httpMethod": "POST",
        "headers": {"Authorization": "Bearer {{$env.WHATSAPP_VERIFY_TOKEN}}"}
      }
    },
    {
      "name": "Extract Message",
      "type": "n8n-nodes-base.set",
      "parameters": {
        "assignments": [
          {"name": "phone", "value": "{{$json.messages[0].from}}"},
          {"name": "text", "value": "{{$json.messages[0].text.body}}"},
          {"name": "message_id", "value": "{{$json.messages[0].id}}"}
        ]
      }
    },
    {
      "name": "Ollama LLM",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://ollama:11434/api/generate",
        "method": "POST",
        "body": {
          "model": "mistral",
          "prompt": "{{$json.text}}",
          "stream": false
        }
      }
    },
    {
      "name": "Google Sheets Append",
      "type": "n8n-nodes-base.googleSheets",
      "parameters": {
        "operation": "appendOrUpdate",
        "sheetId": "{{$env.GOOGLE_SHEET_ID}}",
        "columns": ["phone", "incoming_message", "ai_reply", "timestamp"]
      }
    },
    {
      "name": "Send WhatsApp Reply",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://api.whatsapp.com/v18/{{$env.WHATSAPP_PHONE_ID}}/messages",
        "method": "POST",
        "body": {
          "messaging_product": "whatsapp",
          "to": "{{$json.phone}}",
          "type": "text",
          "text": {"body": "{{$json.response}}"}
        },
        "headers": {"Authorization": "Bearer {{$env.WHATSAPP_ACCESS_TOKEN}}"}
      }
    }
  ]
}
```

---

## Phase 5: Sales Playbook & Testing (Days 7-8)

### Sales Team Playbook (Non-Technical)

**Document:**
1. What is Netra AI (product overview)
2. Customer journey (WhatsApp message → AI reply)
3. Demo walkthrough (step-by-step with screenshots)
4. Pricing: Rs.9,999 setup + Rs.X/month ongoing
5. Support & maintenance (who to contact for issues)
6. Setup instructions for new customers (simplified)

**Deliverables:**
- PDF guide (5-8 pages)
- Video walkthrough (3-5 min screen recording)
- Demo credentials for sales team

### E2E Testing Checklist

- [ ] Create dummy WhatsApp Business Account (sandbox)
- [ ] Send test message → Ollama generates reply → Google Sheets logs entry
- [ ] Verify response time (<5s ideal)
- [ ] Test error scenarios (Ollama timeout, API quota hit)
- [ ] Security test (no prompt injection, API keys not leaked)
- [ ] Load test (10 messages/min for 10 min)
- [ ] Verify Google Sheets data integrity
- [ ] Monitor VPS resources (CPU, memory, disk) under load

---

## Monitoring & Maintenance

### VPS Health Checks

```bash
# Daily cron job
0 9 * * * /opt/netra-ai/health-check.sh

# health-check.sh
#!/bin/bash
ALERT_EMAIL="devops@milk.co"

# Check Ollama API
curl -f http://localhost:11434/api/tags || echo "Ollama DOWN" | mail -s "Alert" $ALERT_EMAIL

# Check n8n API
curl -f https://n8n.netra-ai.com/api/health || echo "n8n DOWN" | mail -s "Alert" $ALERT_EMAIL

# Check disk space
DISK_USAGE=$(df /opt/n8n | awk 'NR==2 {print $5}' | cut -d'%' -f1)
[ $DISK_USAGE -gt 80 ] && echo "Disk >80%" | mail -s "Alert" $ALERT_EMAIL

# Check memory usage
MEM_USAGE=$(free | awk 'NR==2 {print int($3/$2*100)}')
[ $MEM_USAGE -gt 85 ] && echo "Memory >85%" | mail -s "Alert" $ALERT_EMAIL
```

### Key Metrics to Track

- Ollama response time (target: <5s)
- n8n workflow execution time
- WhatsApp message success rate (>99%)
- VPS CPU/memory/disk utilization
- Cost tracking (Rs./month)

---

## Blockers & Dependencies

**Awaiting CTO:**
1. [ ] Hetzner/AWS account access or permission to create
2. [ ] Meta WhatsApp Business API approval or Gupshup account
3. [ ] Google Cloud project + Sheets API credentials
4. [ ] DNS subdomain (n8n.netra-ai.com) or internal-only decision
5. [ ] Budget confirmation (Rs.4,400 total)
6. [ ] Dummy WhatsApp Business Account for testing

---

## Cost Breakdown

| Item | Cost | Duration |
|------|------|----------|
| Hetzner VPS (CPX11) | Rs.800 | 1 month |
| WhatsApp API (after free tier) | Rs.2,000 | 3 months (estimate) |
| Domain (if new) | Rs.500 | 1 year |
| **Total** | **Rs.3,300** | **3 months** |

---

## Timeline

- **Days 1-2:** VPS + Ollama + n8n setup
- **Days 3-4:** WhatsApp integration
- **Days 5-6:** Workflow template + Google Sheets
- **Days 7-8:** Docs + testing
- **Days 9-14:** Buffer for iteration & feedback

**Delivery Date:** April 20, 2026 (14 days from start)
