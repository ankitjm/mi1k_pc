#!/usr/bin/env node
/**
 * ThumbnailOS — API Server
 *
 * Serves the landing page and handles:
 *   POST /api/signup    → save lead, trigger audit pipeline
 *   POST /webhook/razorpay → payment confirmation → onboarding
 *   GET  /api/audit/:id → audit status
 *
 * Usage:
 *   node server.js
 *
 * Required env vars:
 *   DATABASE_URL
 *   RAZORPAY_WEBHOOK_SECRET
 *   (audit pipeline vars: YOUTUBE_API_KEY, ANTHROPIC_API_KEY, BREVO_API_KEY, etc.)
 *
 * Required packages:
 *   npm install express pg crypto
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = process.env.APP_PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'hello@thumbnailos.in';
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'ThumbnailOS';

// Brevo template IDs (created 2026-03-14)
const BREVO_TEMPLATES = {
  COLD_OUTREACH:   parseInt(process.env.BREVO_TEMPLATE_COLD_OUTREACH  || '3'),
  AUDIT_DELIVERY:  parseInt(process.env.BREVO_TEMPLATE_AUDIT_DELIVERY || '4'),
  DAY3_FOLLOWUP:   parseInt(process.env.BREVO_TEMPLATE_DAY3_FOLLOWUP  || '5'),
  WELCOME_SIGNUP:  parseInt(process.env.BREVO_TEMPLATE_WELCOME_SIGNUP || '6'),
  ONBOARDING_1:    parseInt(process.env.BREVO_TEMPLATE_ONBOARDING_1   || '7'),
  ONBOARDING_2:    parseInt(process.env.BREVO_TEMPLATE_ONBOARDING_2   || '8'),
  ONBOARDING_3:    parseInt(process.env.BREVO_TEMPLATE_ONBOARDING_3   || '9'),
};

const LANDING_DIR = path.join(__dirname, '../landing');

// ---------------------------------------------------------------------------
// DB (PostgreSQL via pg)
// ---------------------------------------------------------------------------

let db;
function getDb() {
  if (!db) {
    const { Pool } = require('pg');
    db = new Pool({ connectionString: DATABASE_URL });
  }
  return db;
}

async function saveLead(name, email, channelUrl) {
  const pool = getDb();
  const res = await pool.query(
    `INSERT INTO leads (name, email, channel_url, status, created_at)
     VALUES ($1, $2, $3, 'pending', NOW())
     ON CONFLICT (email) DO UPDATE SET channel_url = EXCLUDED.channel_url, status = 'pending'
     RETURNING id`,
    [name, email, channelUrl]
  );
  return res.rows[0].id;
}

async function getAuditStatus(leadId) {
  const pool = getDb();
  const res = await pool.query(
    `SELECT l.name, l.email, l.channel_url, l.status,
            a.pdf_path, a.sent_at
     FROM leads l
     LEFT JOIN audits a ON a.lead_id = l.id
     WHERE l.id = $1`,
    [leadId]
  );
  return res.rows[0] || null;
}

// ---------------------------------------------------------------------------
// Brevo email
// ---------------------------------------------------------------------------

function sendBrevoEmail(to, toName, subject, htmlContent) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
      to: [{ email: to, name: toName }],
      subject,
      htmlContent,
    });


    const options = {
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode }));
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Brevo template-based email sender
// ---------------------------------------------------------------------------

function sendBrevoTemplate(to, toName, templateId, params = {}) {
  if (!BREVO_API_KEY) {
    console.warn(`[email] BREVO_API_KEY not set — skipping template ${templateId}`);
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
      to: [{ email: to, name: toName }],
      templateId,
      params,
    });
    const options = {
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        console.log(`[email] template=${templateId} to=${to} status=${res.statusCode}`);
        resolve({ status: res.statusCode, body: data });
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// Sequence triggers
async function sendWelcomeEmail(name, email, channelUrl) {
  return sendBrevoTemplate(email, name, BREVO_TEMPLATES.WELCOME_SIGNUP, {
    NAME: name,
    CHANNEL_URL: channelUrl || '',
  });
}

async function sendAuditDeliveryEmail(name, email, channelName, auditSummary, pdfLink) {
  return sendBrevoTemplate(email, name, BREVO_TEMPLATES.AUDIT_DELIVERY, {
    NAME: name,
    CHANNEL_NAME: channelName || '',
    AUDIT_SUMMARY: auditSummary || '',
    PDF_LINK: pdfLink || '',
  });
}

async function sendDay3FollowupEmail(name, email) {
  return sendBrevoTemplate(email, name, BREVO_TEMPLATES.DAY3_FOLLOWUP, { NAME: name });
}

async function sendColdOutreachEmail(creatorName, email, channelName, channelUrl) {
  return sendBrevoTemplate(email, creatorName, BREVO_TEMPLATES.COLD_OUTREACH, {
    CREATOR_NAME: creatorName,
    CHANNEL_NAME: channelName || '',
    CHANNEL_URL: encodeURIComponent(channelUrl || ''),
  });
}

async function sendOnboardingSequence(name, email) {
  // Email 1: immediate
  await sendBrevoTemplate(email, name, BREVO_TEMPLATES.ONBOARDING_1, { NAME: name });

  // Email 2: Day 3 (schedule via setTimeout — in production replace with a cron/queue)
  setTimeout(async () => {
    try {
      await sendBrevoTemplate(email, name, BREVO_TEMPLATES.ONBOARDING_2, { NAME: name });
    } catch (err) {
      console.error(`[email] onboarding-2 failed for ${email}:`, err.message);
    }
  }, 3 * 24 * 60 * 60 * 1000); // 3 days

  // Email 3: Day 7
  setTimeout(async () => {
    try {
      await sendBrevoTemplate(email, name, BREVO_TEMPLATES.ONBOARDING_3, { NAME: name });
    } catch (err) {
      console.error(`[email] onboarding-3 failed for ${email}:`, err.message);
    }
  }, 7 * 24 * 60 * 60 * 1000); // 7 days
}

// ---------------------------------------------------------------------------
// Audit pipeline trigger (async, non-blocking)
// ---------------------------------------------------------------------------

function triggerAuditPipeline(leadId, name, email, channelUrl) {
  const { spawn } = require('child_process');
  const scriptPath = path.join(__dirname, 'audit-generator.js');

  const args = [
    scriptPath,
    '--channel', channelUrl,
    '--name', name,
    '--email', email,
  ];

  const child = spawn(process.execPath, args, {
    env: process.env,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (d) => console.log(`[audit:${leadId}] ${d.toString().trim()}`));
  child.stderr.on('data', (d) => console.error(`[audit:${leadId}] ERR: ${d.toString().trim()}`));
  child.unref();

  console.log(`[server] Audit pipeline triggered for lead ${leadId} (pid ${child.pid})`);
}

// ---------------------------------------------------------------------------
// Request router
// ---------------------------------------------------------------------------

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) { req.destroy(); reject(new Error('Body too large')); }
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

function send(res, status, data) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': typeof data === 'string' ? 'text/html' : 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

async function handleSignup(req, res) {
  const body = await parseBody(req);
  const { name, email, channel } = body;

  if (!name || !email || !channel) {
    return send(res, 400, { message: 'name, email, and channel are required.' });
  }

  if (!channel.includes('youtube.com')) {
    return send(res, 400, { message: 'Invalid YouTube channel URL.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return send(res, 400, { message: 'Invalid email address.' });
  }

  let leadId;
  try {
    leadId = await saveLead(name.trim(), email.trim().toLowerCase(), channel.trim());
  } catch (err) {
    console.error('[signup] DB error:', err.message);
    return send(res, 500, { message: 'Database error. Please try again.' });
  }

  // Send welcome email (non-blocking)
  sendWelcomeEmail(name, email, channel).catch((err) => console.error('[email] welcome email error:', err.message));

  // Trigger audit pipeline (async)
  triggerAuditPipeline(leadId, name, email, channel);

  return send(res, 200, { success: true, leadId });
}

async function handleRazorpayWebhook(req, res) {
  const rawBody = await new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });

  // Verify signature
  const signature = req.headers['x-razorpay-signature'];
  if (RAZORPAY_WEBHOOK_SECRET && signature) {
    const expected = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (signature !== expected) {
      console.warn('[webhook] Invalid Razorpay signature');
      return send(res, 401, { message: 'Invalid signature' });
    }
  }

  let event;
  try { event = JSON.parse(rawBody); } catch { return send(res, 400, {}); }

  console.log(`[webhook] Razorpay event: ${event.event}`);

  const pool = getDb();

  if (event.event === 'payment.captured') {
    const payment = event.payload?.payment?.entity;
    if (payment) {
      const email = payment.email;
      const amount = payment.amount; // in paise
      const razorpayId = payment.id;

      try {
        await pool.query(
          `INSERT INTO payments (razorpay_id, email, amount, status, created_at)
           VALUES ($1, $2, $3, 'captured', NOW())
           ON CONFLICT (razorpay_id) DO NOTHING`,
          [razorpayId, email, amount]
        );

        // Update lead tier
        await pool.query(
          `UPDATE leads SET tier = 'pro', status = 'active' WHERE email = $1`,
          [email]
        );

        console.log(`[webhook] Payment captured: ${email} ₹${amount / 100}`);

        // Trigger onboarding sequence (3 emails over 7 days)
        const leadRes = await pool.query(
          `SELECT name FROM leads WHERE email = $1 LIMIT 1`,
          [email]
        );
        const name = leadRes.rows[0]?.name || 'Creator';
        sendOnboardingSequence(name, email).catch((err) =>
          console.error(`[email] onboarding sequence error for ${email}:`, err.message)
        );
      } catch (err) {
        console.error('[webhook] payment.captured DB error:', err.message);
      }
    }
  } else if (event.event === 'subscription.halted') {
    const sub = event.payload?.subscription?.entity;
    if (sub) {
      console.error(`[webhook] SUBSCRIPTION HALTED: ${sub.id} — needs CEO attention`);
      // TODO: alert CEO agent via Paperclip
    }
  }

  return send(res, 200, { status: 'ok' });
}

async function handleAuditStatus(req, res, leadId) {
  try {
    const audit = await getAuditStatus(leadId);
    if (!audit) return send(res, 404, { message: 'Audit not found.' });
    return send(res, 200, audit);
  } catch (err) {
    console.error('[audit-status] error:', err.message);
    return send(res, 500, { message: 'Error fetching audit status.' });
  }
}

function serveStatic(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': data.length });
    res.end(data);
  });
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // CORS (dev only)
  if (process.env.NODE_ENV !== 'production') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  }

  try {
    // API routes
    if (req.method === 'POST' && pathname === '/api/signup') {
      return await handleSignup(req, res);
    }

    if (req.method === 'POST' && pathname === '/webhook/razorpay') {
      return await handleRazorpayWebhook(req, res);
    }

    const auditMatch = pathname.match(/^\/api\/audit\/(.+)$/);
    if (req.method === 'GET' && auditMatch) {
      return await handleAuditStatus(req, res, auditMatch[1]);
    }

    // Health check
    if (pathname === '/health') {
      return send(res, 200, { status: 'ok', ts: new Date().toISOString() });
    }

    // Static files
    if (pathname === '/' || pathname === '/index.html') {
      return serveStatic(res, path.join(LANDING_DIR, 'index.html'), 'text/html; charset=utf-8');
    }

    res.writeHead(404);
    res.end('Not found');

  } catch (err) {
    console.error('[server] unhandled error:', err.message);
    if (!res.headersSent) send(res, 500, { message: 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀  ThumbnailOS server running on http://localhost:${PORT}`);
  if (!DATABASE_URL) console.warn('⚠️   DATABASE_URL not set — DB operations will fail');
  if (!BREVO_API_KEY) console.warn('⚠️   BREVO_API_KEY not set — emails will be skipped');
});

server.on('error', (err) => {
  console.error('Server error:', err.message);
  process.exit(1);
});
