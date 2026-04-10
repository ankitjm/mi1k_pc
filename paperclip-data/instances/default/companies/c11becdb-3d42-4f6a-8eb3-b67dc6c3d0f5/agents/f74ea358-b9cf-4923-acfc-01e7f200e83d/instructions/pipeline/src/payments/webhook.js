'use strict';

/**
 * Razorpay webhook handler.
 *
 * Verifies the HMAC-SHA256 signature and dispatches subscription lifecycle
 * events to update the customer/subscription records in PostgreSQL.
 *
 * Supported events:
 *   subscription.created     → insert/update subscription row, status = created
 *   subscription.activated   → set subscription status = active
 *   subscription.charged     → record successful charge, extend period_end
 *   subscription.cancelled   → set status = cancelled
 *   subscription.halted      → set status = halted, flag for CEO review
 *
 * Dependencies injected to allow unit testing without a real DB connection:
 *   db — object with async query(sql, params) method (e.g. pg.Pool)
 */

const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

/**
 * Verify Razorpay webhook signature.
 * @param {string|Buffer} rawBody    Raw request body bytes
 * @param {string}         signature  X-Razorpay-Signature header value
 * @param {string}         secret     RAZORPAY_WEBHOOK_SECRET
 * @returns {boolean}
 */
function verifySignature(rawBody, signature, secret) {
  if (!rawBody || !signature || !secret) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  // Constant-time comparison to resist timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function upsertSubscription(db, payload, status) {
  const sub = payload.subscription || {};
  const razorpaySubId = sub.id || null;
  const planId = (sub.plan_id || sub.plan?.id) || null;
  const customerId = sub.customer_id || null;
  const currentStart = sub.current_start ? new Date(sub.current_start * 1000) : null;
  const currentEnd = sub.current_end ? new Date(sub.current_end * 1000) : null;

  // Upsert subscription row
  await db.query(
    `INSERT INTO subscriptions
       (razorpay_subscription_id, razorpay_customer_id, razorpay_plan_id,
        status, current_period_start, current_period_end, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (razorpay_subscription_id) DO UPDATE
       SET status               = EXCLUDED.status,
           razorpay_plan_id     = EXCLUDED.razorpay_plan_id,
           current_period_start = COALESCE(EXCLUDED.current_period_start, subscriptions.current_period_start),
           current_period_end   = COALESCE(EXCLUDED.current_period_end,   subscriptions.current_period_end),
           updated_at           = NOW()`,
    [razorpaySubId, customerId, planId, status, currentStart, currentEnd]
  );

  // Sync customer subscription status when we have a customer link
  if (customerId) {
    await db.query(
      `UPDATE customers
          SET subscription_status = $1,
              updated_at          = NOW()
        WHERE razorpay_customer_id = $2`,
      [status, customerId]
    );
  }
}

async function recordCharge(db, payload) {
  const payment = payload.payment || {};
  const sub = payload.subscription || {};
  const razorpaySubId = sub.id || null;
  const amountPaise = payment.amount || 0;
  const currency = payment.currency || 'INR';
  const paymentId = payment.id || null;

  await db.query(
    `INSERT INTO subscription_charges
       (razorpay_subscription_id, razorpay_payment_id, amount_paise, currency, charged_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (razorpay_payment_id) DO NOTHING`,
    [razorpaySubId, paymentId, amountPaise, currency]
  );

  // Extend period_end if provided
  const currentEnd = sub.current_end ? new Date(sub.current_end * 1000) : null;
  if (razorpaySubId && currentEnd) {
    await db.query(
      `UPDATE subscriptions
          SET current_period_end = $1, status = 'active', updated_at = NOW()
        WHERE razorpay_subscription_id = $2`,
      [currentEnd, razorpaySubId]
    );
  }
}

// ---------------------------------------------------------------------------
// Event dispatcher
// ---------------------------------------------------------------------------

const HANDLERS = {
  'subscription.created': async (db, payload) => {
    await upsertSubscription(db, payload, 'created');
  },

  'subscription.activated': async (db, payload) => {
    await upsertSubscription(db, payload, 'active');
  },

  'subscription.charged': async (db, payload) => {
    await upsertSubscription(db, payload, 'active');
    await recordCharge(db, payload);
  },

  'subscription.cancelled': async (db, payload) => {
    await upsertSubscription(db, payload, 'cancelled');
  },

  'subscription.halted': async (db, payload) => {
    await upsertSubscription(db, payload, 'halted');
    // Log for CEO review (in production this could also send an alert email)
    const subId = (payload.subscription || {}).id || 'unknown';
    console.warn(`[webhook] HALTED subscription ${subId} — manual review required`);
  },
};

/**
 * Process a single Razorpay webhook event.
 *
 * @param {Object} options
 * @param {string|Buffer} options.rawBody   Raw request body (before JSON.parse)
 * @param {string}         options.signature X-Razorpay-Signature header
 * @param {string}         options.secret    RAZORPAY_WEBHOOK_SECRET
 * @param {Object}         options.db        pg.Pool or compatible { query() }
 * @returns {{ ok: boolean, status: number, message: string }}
 */
async function handleWebhook({ rawBody, signature, secret, db }) {
  // 1. Verify signature
  if (!verifySignature(rawBody, signature, secret)) {
    return { ok: false, status: 400, message: 'Invalid signature' };
  }

  // 2. Parse body
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return { ok: false, status: 400, message: 'Invalid JSON body' };
  }

  const eventName = event.event;
  const payload = event.payload || {};

  // 3. Dispatch
  const handler = HANDLERS[eventName];
  if (!handler) {
    // Unknown event — acknowledge so Razorpay doesn't retry
    console.log(`[webhook] Unhandled event type: ${eventName}`);
    return { ok: true, status: 200, message: `Unhandled event: ${eventName}` };
  }

  try {
    await handler(db, payload);
    console.log(`[webhook] Processed ${eventName}`);
    return { ok: true, status: 200, message: `Processed ${eventName}` };
  } catch (err) {
    console.error(`[webhook] Error processing ${eventName}:`, err.message);
    return { ok: false, status: 500, message: 'Internal error processing event' };
  }
}

module.exports = { handleWebhook, verifySignature };
