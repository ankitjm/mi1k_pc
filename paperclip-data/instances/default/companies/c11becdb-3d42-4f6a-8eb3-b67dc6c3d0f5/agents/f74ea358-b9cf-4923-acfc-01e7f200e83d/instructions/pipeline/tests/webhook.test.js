'use strict';

/**
 * Unit tests for the Razorpay webhook handler.
 * Run: node --test tests/webhook.test.js
 *
 * No network calls. DB is a mock with recorded query calls.
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const { handleWebhook, verifySignature } = require('../src/payments/webhook');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_SECRET = 'test_webhook_secret_32chars_xxxx';

function sign(body) {
  return crypto.createHmac('sha256', TEST_SECRET).update(body).digest('hex');
}

function makeDb() {
  const calls = [];
  return {
    calls,
    query(sql, params) {
      calls.push({ sql: sql.trim().split('\n')[0], params });
      return Promise.resolve({ rows: [] });
    },
  };
}

function makeEvent(eventName, subId = 'sub_test123', customerId = 'cust_test456', extra = {}) {
  return JSON.stringify({
    event: eventName,
    payload: {
      subscription: {
        id: subId,
        customer_id: customerId,
        plan_id: 'plan_test',
        current_start: 1700000000,
        current_end: 1702592000,
        ...extra.subscription,
      },
      payment: {
        id: 'pay_test789',
        amount: 49900,
        currency: 'INR',
        ...extra.payment,
      },
    },
  });
}

// ---------------------------------------------------------------------------
// verifySignature
// ---------------------------------------------------------------------------

describe('verifySignature', () => {
  it('returns true for a valid signature', () => {
    const body = 'hello world';
    const sig = sign(body);
    assert.equal(verifySignature(body, sig, TEST_SECRET), true);
  });

  it('returns false for a tampered body', () => {
    const sig = sign('original body');
    assert.equal(verifySignature('tampered body', sig, TEST_SECRET), false);
  });

  it('returns false for wrong secret', () => {
    const body = 'hello';
    const sig = sign(body);
    assert.equal(verifySignature(body, sig, 'wrong_secret'), false);
  });

  it('returns false for missing params', () => {
    assert.equal(verifySignature(null, 'sig', TEST_SECRET), false);
    assert.equal(verifySignature('body', null, TEST_SECRET), false);
    assert.equal(verifySignature('body', 'sig', null), false);
  });
});

// ---------------------------------------------------------------------------
// handleWebhook — authentication
// ---------------------------------------------------------------------------

describe('handleWebhook — signature', () => {
  it('rejects invalid signature with 400', async () => {
    const body = makeEvent('subscription.activated');
    const result = await handleWebhook({
      rawBody: body,
      signature: 'bad_sig',
      secret: TEST_SECRET,
      db: makeDb(),
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
  });

  it('rejects malformed JSON with 400', async () => {
    const body = 'not-json';
    const result = await handleWebhook({
      rawBody: body,
      signature: sign(body),
      secret: TEST_SECRET,
      db: makeDb(),
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
  });
});

// ---------------------------------------------------------------------------
// handleWebhook — subscription.created
// ---------------------------------------------------------------------------

describe('handleWebhook — subscription.created', () => {
  it('returns 200 and writes to DB', async () => {
    const body = makeEvent('subscription.created');
    const db = makeDb();
    const result = await handleWebhook({
      rawBody: body,
      signature: sign(body),
      secret: TEST_SECRET,
      db,
    });
    assert.equal(result.ok, true);
    assert.equal(result.status, 200);
    // Should have called INSERT on subscriptions and UPDATE on customers
    assert.ok(db.calls.length >= 2, 'expected at least 2 DB queries');
    assert.ok(db.calls[0].sql.startsWith('INSERT INTO subscriptions'));
    assert.ok(db.calls[0].params.includes('created'));
  });
});

// ---------------------------------------------------------------------------
// handleWebhook — subscription.activated
// ---------------------------------------------------------------------------

describe('handleWebhook — subscription.activated', () => {
  it('sets status active in DB', async () => {
    const body = makeEvent('subscription.activated');
    const db = makeDb();
    const result = await handleWebhook({
      rawBody: body,
      signature: sign(body),
      secret: TEST_SECRET,
      db,
    });
    assert.equal(result.ok, true);
    assert.ok(db.calls[0].params.includes('active'));
  });
});

// ---------------------------------------------------------------------------
// handleWebhook — subscription.charged
// ---------------------------------------------------------------------------

describe('handleWebhook — subscription.charged', () => {
  it('upserts subscription and records charge', async () => {
    const body = makeEvent('subscription.charged');
    const db = makeDb();
    const result = await handleWebhook({
      rawBody: body,
      signature: sign(body),
      secret: TEST_SECRET,
      db,
    });
    assert.equal(result.ok, true);
    // INSERT subscriptions, UPDATE customers, INSERT charges, UPDATE period_end
    assert.ok(db.calls.length >= 3, 'expected at least 3 DB queries for charged event');
    const chargeCall = db.calls.find((c) => c.sql.startsWith('INSERT INTO subscription_charges'));
    assert.ok(chargeCall, 'should insert into subscription_charges');
    assert.ok(chargeCall.params.includes(49900), 'should record amount');
  });
});

// ---------------------------------------------------------------------------
// handleWebhook — subscription.cancelled
// ---------------------------------------------------------------------------

describe('handleWebhook — subscription.cancelled', () => {
  it('sets status cancelled in DB', async () => {
    const body = makeEvent('subscription.cancelled');
    const db = makeDb();
    const result = await handleWebhook({
      rawBody: body,
      signature: sign(body),
      secret: TEST_SECRET,
      db,
    });
    assert.equal(result.ok, true);
    assert.ok(db.calls[0].params.includes('cancelled'));
  });
});

// ---------------------------------------------------------------------------
// handleWebhook — subscription.halted
// ---------------------------------------------------------------------------

describe('handleWebhook — subscription.halted', () => {
  it('sets status halted in DB', async () => {
    const body = makeEvent('subscription.halted');
    const db = makeDb();
    const result = await handleWebhook({
      rawBody: body,
      signature: sign(body),
      secret: TEST_SECRET,
      db,
    });
    assert.equal(result.ok, true);
    assert.ok(db.calls[0].params.includes('halted'));
  });
});

// ---------------------------------------------------------------------------
// handleWebhook — unknown event
// ---------------------------------------------------------------------------

describe('handleWebhook — unknown event', () => {
  it('acknowledges unknown events with 200 (no retry)', async () => {
    const body = JSON.stringify({ event: 'payment.captured', payload: {} });
    const result = await handleWebhook({
      rawBody: body,
      signature: sign(body),
      secret: TEST_SECRET,
      db: makeDb(),
    });
    assert.equal(result.ok, true);
    assert.equal(result.status, 200);
    assert.ok(result.message.includes('Unhandled'));
  });
});

// ---------------------------------------------------------------------------
// handleWebhook — DB error handling
// ---------------------------------------------------------------------------

describe('handleWebhook — DB errors', () => {
  it('returns 500 if DB throws', async () => {
    const body = makeEvent('subscription.activated');
    const failDb = {
      query() { return Promise.reject(new Error('DB connection refused')); },
    };
    const result = await handleWebhook({
      rawBody: body,
      signature: sign(body),
      secret: TEST_SECRET,
      db: failDb,
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, 500);
  });
});
