# Gupshup WhatsApp Free Tier — Integration Guide

**Status:** Ready for Testing & Demo  
**Timeline:** Can be set up in 1-2 hours (sandbox)  
**Cost:** Free (up to daily message limits)  

---

## Why Gupshup for MVP?

| Feature | Gupshup | Meta WhatsApp BSP |
|---------|---------|------------------|
| **Setup Time** | 15 minutes | 3-5 business days (approval) |
| **Cost** | Free (sandbox) | Free (first 1K msgs), then pay-per-message |
| **Approval** | Instant | Requires Meta verification |
| **Use Case** | Demo, Testing | Production |
| **Recommendation** | Use first for MVP | Migrate for production |

---

## Step 1: Create Gupshup Account

### Sign Up
1. Go to [gupshup.io/whatsapp](https://www.gupshup.io/products/whatsapp)
2. Click **"Start Free"**
3. Enter email, password, company name
4. Verify email (click link in inbox)

### Create WhatsApp Business Account
1. In Gupshup dashboard, click **"Create WhatsApp Business Account"**
2. Fill in:
   - **Business Name:** Netra AI (or your company)
   - **Business Category:** Software/Technology
   - **Business Description:** WhatsApp chatbot service
   - **Phone Number:** Your phone (for verification)
3. Click **"Create Account"**

### Verify Phone Number
1. Gupshup will send OTP to your phone
2. Enter OTP to activate account
3. Account status: `Active`

---

## Step 2: Get API Credentials

### Generate API Key
1. In Gupshup dashboard, go to **Settings → API Keys**
2. Click **"Generate New API Key"**
3. Copy the key (keep it secure!)

Example:
```
API_KEY=eJydUsFuwjAM_...rest_of_key...
```

### Get Phone Number & Partner ID
1. In dashboard, go to **Phone Numbers**
2. Note your **sandbox phone number**: `+1234567890` (Gupshup assigns this)
3. Go to **Account Settings**
4. Note your **Partner ID**: `your-partner-id`

---

## Step 3: Configure Webhook in n8n

### Create Webhook Endpoint in n8n

**What is a webhook?**
A webhook is a URL that Gupshup will POST to whenever a message arrives. n8n will listen on this URL and trigger the workflow.

### Setup Steps

1. **In n8n Dashboard:**
   - Click **"+ New Workflow"**
   - Name it: `Gupshup WhatsApp Webhook`

2. **Add Webhook Trigger Node:**
   - Click **"+ Add node"**
   - Search for **"Webhook"**
   - Select **"Webhook" (incoming)**
   - Configure:
     - **HTTP Method:** POST
     - **Path:** `/gupshup/webhook`
     - **Save & Activate**
   - Copy the **Webhook URL** (shown after activation)

   Example:
   ```
   https://n8n.example.com/webhook/gupshup/webhook
   ```

   For localhost testing:
   ```
   http://localhost:5678/webhook/gupshup/webhook
   ```

3. **Tell Gupshup About Your Webhook:**
   - In Gupshup dashboard, go to **Webhooks**
   - Paste your **Webhook URL**
   - Select events: `Message Received`, `Message Status`
   - Click **"Save"**

4. **Test the Connection:**
   - In Gupshup, send yourself a test message
   - Check n8n — should see the message in the webhook node

---

## Step 4: Message Format from Gupshup

When a customer message arrives, Gupshup will POST JSON like this:

```json
{
  "type": "message",
  "payload": {
    "id": "msg_12345",
    "source": "919876543210",
    "destination": "1234567890",
    "message": {
      "type": "text",
      "text": "What is your pricing?"
    },
    "timestamp": 1649500800
  }
}
```

**Field Explanation:**
- `source`: Customer's WhatsApp number (with country code)
- `destination`: Your Gupshup phone number
- `message.text`: What the customer typed
- `timestamp`: When the message arrived (Unix timestamp)

---

## Step 5: Extract & Process Message

### In n8n Workflow

After the webhook trigger, add a **Set node** to extract the message:

```
Add Node → "Set"
```

**Configure extractions:**

```
new_json_field_1 = {
  "name": "customer_phone",
  "value": $json.payload.source
}

new_json_field_2 = {
  "name": "message_text",
  "value": $json.payload.message.text
}

new_json_field_3 = {
  "name": "message_id",
  "value": $json.payload.id
}

new_json_field_4 = {
  "name": "received_at",
  "value": $json.payload.timestamp
}
```

**Output:**
```json
{
  "customer_phone": "919876543210",
  "message_text": "What is your pricing?",
  "message_id": "msg_12345",
  "received_at": 1649500800
}
```

---

## Step 6: Send Message Back (Mock Response)

### For Testing (Before Ollama Integration)

Add an **HTTP Request node** to send a mock response:

```
Add Node → "HTTP Request"
```

**Configuration:**
- **Method:** POST
- **URL:**
  ```
  https://api.gupshup.io/wa/api/v1/messages
  ```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {{$env.GUPSHUP_API_KEY}}
```

**Body:**
```json
{
  "channel": "whatsapp",
  "source": "{{$json.destination}}",
  "destination": "{{$json.customer_phone}}",
  "message": {
    "type": "text",
    "text": "Thanks for reaching out! This is an automated response. Your message has been received."
  }
}
```

**Response Handling:**
```
Success → Log to Google Sheets
Error → Send alert email
```

---

## Step 7: Send Message via Gupshup API

### Test Message Sending

You can send test messages to yourself using curl:

```bash
curl -X POST "https://api.gupshup.io/wa/api/v1/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GUPSHUP_API_KEY" \
  -d '{
    "channel": "whatsapp",
    "source": "1234567890",
    "destination": "919876543210",
    "message": {
      "type": "text",
      "text": "Hello! This is a test message from Netra AI."
    }
  }'
```

**Expected Response:**
```json
{
  "status": "submitted",
  "messageUid": "msg_67890"
}
```

---

## Step 8: Log to Google Sheets

### Create Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com)
2. Create new sheet: `Netra AI Messages`
3. Create columns:
   ```
   | A | B | C | D | E |
   |---|---|---|---|---|
   | Timestamp | Phone | Message | Response | Status |
   |-----------|-------|---------|----------|--------|
   | | | | | |
   ```

### Generate Google Sheets API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: `Netra AI`
3. Enable Sheets API:
   - Search: **"Google Sheets API"**
   - Click **Enable**
4. Create Service Account:
   - Go to **Credentials → Create Credentials**
   - Select **Service Account**
   - Name: `netra-ai-bot`
   - Grant role: **Editor**
5. Generate JSON key:
   - In service account, go to **Keys → Add Key → JSON**
   - Download the JSON file
   - Keep it secret!

### Add to n8n Workflow

After logging the message, add a **Google Sheets node**:

```
Add Node → "Google Sheets"
```

**Configuration:**
- **Operation:** Append row
- **Sheet ID:** (from URL: docs.google.com/spreadsheets/d/{SHEET_ID}/...)
- **Range:** `A:E`
- **Rows to append:**
  ```
  [
    [
      "{{new Date().toISOString()}}",
      "{{$json.customer_phone}}",
      "{{$json.message_text}}",
      "{{$json.response}}",
      "sent"
    ]
  ]
  ```

---

## Step 9: Complete Workflow (Template)

### Visual Workflow

```
┌──────────────────┐
│ Gupshup Webhook  │
│ (Message In)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Extract Message  │
│ (Set Node)       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Generate Response│
│ (Mock/Ollama)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Send via Gupshup │
│ (HTTP Request)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Log to Sheets    │
│ (Google Sheets)  │
└──────────────────┘
```

### Workflow Code (JSON)

```json
{
  "name": "Gupshup WhatsApp Chatbot (MVP)",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "gupshup/webhook",
        "httpMethod": "POST",
        "headers": {"Content-Type": "application/json"}
      }
    },
    {
      "name": "Extract Message",
      "type": "n8n-nodes-base.set",
      "parameters": {
        "assignments": [
          {"name": "phone", "value": "{{$json.payload.source}}"},
          {"name": "text", "value": "{{$json.payload.message.text}}"},
          {"name": "id", "value": "{{$json.payload.id}}"}
        ]
      }
    },
    {
      "name": "Mock Response",
      "type": "n8n-nodes-base.set",
      "parameters": {
        "assignments": [
          {"name": "response", "value": "Thank you for your message! We'll get back to you soon."}
        ]
      }
    },
    {
      "name": "Send via Gupshup",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://api.gupshup.io/wa/api/v1/messages",
        "method": "POST",
        "headers": {
          "Content-Type": "application/json",
          "Authorization": "Bearer {{$env.GUPSHUP_API_KEY}}"
        },
        "body": {
          "channel": "whatsapp",
          "source": "{{$json.destination}}",
          "destination": "{{$json.phone}}",
          "message": {"type": "text", "text": "{{$json.response}}"}
        }
      }
    },
    {
      "name": "Log to Google Sheets",
      "type": "n8n-nodes-base.googleSheets",
      "parameters": {
        "operation": "appendOrUpdate",
        "sheetId": "{{$env.GOOGLE_SHEET_ID}}",
        "range": "A:E",
        "columns": ["Timestamp", "Phone", "Message", "Response", "Status"]
      }
    }
  ]
}
```

---

## Testing Checklist

- [ ] Gupshup account created and verified
- [ ] API key generated and saved
- [ ] Phone number obtained (sandbox)
- [ ] n8n webhook deployed and URL copied
- [ ] Webhook URL added to Gupshup settings
- [ ] Test message sent from Gupshup to n8n (webhook received)
- [ ] Mock response sent back to Gupshup
- [ ] Message logged to Google Sheets
- [ ] Response received on WhatsApp device
- [ ] End-to-end flow working (message → response in <5 seconds)

---

## Troubleshooting

### "Webhook not receiving messages"
- Check Gupshup dashboard: **Webhooks → Status** (should be `Active`)
- Verify webhook URL is correct
- Check n8n: **Workflow → Logs** (look for POST requests)
- For localhost: Use ngrok to expose local n8n: `ngrok http 5678`

### "Response not sending"
- Verify API key in n8n environment variables
- Check Gupshup API response: `HTTP 200` = success
- Review n8n logs for HTTP errors

### "Slow responses"
- Current: ~2-3 seconds (n8n overhead)
- Will improve to <1s once Ollama integration is optimized
- Profile n8n workflow nodes for bottlenecks

### "Messages not logged to Sheets"
- Verify Google Sheets API credentials are correct
- Check that service account email has access to the sheet
- Review n8n Google Sheets node configuration

---

## Migration Path: Gupshup → Meta WhatsApp BSP

Once the MVP is validated and you're ready for production:

1. **Create Meta Business Account** (requires business verification)
2. **Apply for WhatsApp Business API** (3-5 day approval)
3. **Update n8n webhook URL** (just change the endpoint)
4. **Migrate conversation history** (export from Sheets, import to Meta)
5. **Keep the same workflow** (rest of the pipeline stays unchanged)

**Estimated time:** 1-2 days, zero downtime

---

## Next Steps

1. **Create Gupshup account** (15 minutes)
2. **Deploy n8n locally or on VPS**
3. **Configure webhook**
4. **Test end-to-end** (message → response → logs)
5. **Add Ollama LLM** (replace mock response)
6. **Demo to stakeholders**
7. **Once approved:** Migrate to Meta WhatsApp BSP for production

---

**Ready to test?** Start with Gupshup. It's the fastest path to a working MVP. 🚀
