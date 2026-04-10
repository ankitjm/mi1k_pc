-- =============================================================================
-- ThumbnailOS — PostgreSQL Schema
-- DB: thumbnailos (matches DB_NAME in .env)
-- Run: psql -U thumbnailos -d thumbnailos -f db/schema.sql
-- =============================================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- CUSTOMERS
-- One row per paying or trial customer (founder/channel owner).
-- =============================================================================
CREATE TABLE IF NOT EXISTS customers (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email                   TEXT        NOT NULL UNIQUE,
    name                    TEXT        NOT NULL,
    channel_url             TEXT        NOT NULL,
    channel_id              TEXT,                           -- YouTube channel ID
    razorpay_customer_id    TEXT        UNIQUE,             -- cust_xxx from Razorpay
    plan                    TEXT        NOT NULL DEFAULT 'free'
                                        CHECK (plan IN ('free', 'starter', 'pro')),
    subscription_status     TEXT        NOT NULL DEFAULT 'none'
                                        CHECK (subscription_status IN
                                            ('none','created','active','cancelled','halted')),
    onboarding_completed    BOOLEAN     NOT NULL DEFAULT FALSE,
    audit_count             INTEGER     NOT NULL DEFAULT 0,
    source                  TEXT,                           -- 'landing_page', 'outreach', etc.
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_email              ON customers (email);
CREATE INDEX IF NOT EXISTS idx_customers_razorpay_cust_id  ON customers (razorpay_customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_channel_id        ON customers (channel_id);
CREATE INDEX IF NOT EXISTS idx_customers_subscription_status ON customers (subscription_status);

-- =============================================================================
-- SUBSCRIPTIONS
-- One row per Razorpay subscription lifecycle.
-- =============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id                 UUID        REFERENCES customers (id) ON DELETE SET NULL,
    razorpay_subscription_id    TEXT        NOT NULL UNIQUE,    -- sub_xxx
    razorpay_customer_id        TEXT,                           -- cust_xxx (join key before FK link)
    razorpay_plan_id            TEXT,
    status                      TEXT        NOT NULL DEFAULT 'created'
                                            CHECK (status IN
                                                ('created','active','cancelled','halted','expired')),
    current_period_start        TIMESTAMPTZ,
    current_period_end          TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id   ON subscriptions (customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_rzp_sub_id    ON subscriptions (razorpay_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_rzp_cust_id   ON subscriptions (razorpay_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status        ON subscriptions (status);

-- =============================================================================
-- SUBSCRIPTION_CHARGES
-- One row per successful Razorpay charge event.
-- =============================================================================
CREATE TABLE IF NOT EXISTS subscription_charges (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    razorpay_subscription_id    TEXT        NOT NULL REFERENCES subscriptions (razorpay_subscription_id),
    razorpay_payment_id         TEXT        NOT NULL UNIQUE,    -- pay_xxx
    amount_paise                INTEGER     NOT NULL,           -- amount in smallest currency unit
    currency                    TEXT        NOT NULL DEFAULT 'INR',
    charged_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_charges_rzp_sub_id ON subscription_charges (razorpay_subscription_id);

-- =============================================================================
-- AUDITS
-- One row per thumbnail audit generated for a customer.
-- =============================================================================
CREATE TABLE IF NOT EXISTS audits (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID        REFERENCES customers (id) ON DELETE SET NULL,
    channel_url     TEXT        NOT NULL,
    channel_id      TEXT,
    channel_title   TEXT,
    video_count     INTEGER     NOT NULL DEFAULT 0,
    avg_score       NUMERIC(4,2),                               -- 1.00–10.00
    pdf_path        TEXT,                                       -- server file path to PDF
    status          TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN
                                    ('pending','running','done','failed')),
    error_message   TEXT,
    triggered_by    TEXT        DEFAULT 'system',              -- 'landing_page', 'manual', etc.
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audits_customer_id  ON audits (customer_id);
CREATE INDEX IF NOT EXISTS idx_audits_channel_id   ON audits (channel_id);
CREATE INDEX IF NOT EXISTS idx_audits_status       ON audits (status);
CREATE INDEX IF NOT EXISTS idx_audits_created_at   ON audits (created_at DESC);

-- =============================================================================
-- OUTREACH
-- Tracks cold outreach to prospective customers.
-- =============================================================================
CREATE TABLE IF NOT EXISTS outreach (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_name        TEXT        NOT NULL,
    channel_url         TEXT        NOT NULL,
    channel_id          TEXT        UNIQUE,
    email               TEXT,
    subscriber_count    BIGINT,
    niche               TEXT,
    outreach_status     TEXT        NOT NULL DEFAULT 'new'
                                    CHECK (outreach_status IN
                                        ('new','emailed','replied','converted','rejected','unsubscribed')),
    first_contacted_at  TIMESTAMPTZ,
    last_contacted_at   TIMESTAMPTZ,
    follow_up_at        TIMESTAMPTZ,
    converted_at        TIMESTAMPTZ,
    customer_id         UUID        REFERENCES customers (id) ON DELETE SET NULL,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_status      ON outreach (outreach_status);
CREATE INDEX IF NOT EXISTS idx_outreach_channel_id  ON outreach (channel_id);
CREATE INDEX IF NOT EXISTS idx_outreach_email       ON outreach (email);
CREATE INDEX IF NOT EXISTS idx_outreach_follow_up   ON outreach (follow_up_at)
    WHERE follow_up_at IS NOT NULL AND outreach_status NOT IN ('converted','rejected','unsubscribed');

-- =============================================================================
-- PIPELINE_CHANNELS
-- Research-stage channels (populated by YouTube research script).
-- Separate from outreach — source-of-truth for channel discovery.
-- =============================================================================
CREATE TABLE IF NOT EXISTS pipeline_channels (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id          TEXT        NOT NULL UNIQUE,            -- YouTube channel ID
    channel_name        TEXT        NOT NULL,
    channel_url         TEXT        NOT NULL,
    subscriber_count    BIGINT,
    avg_views           BIGINT,
    niche               TEXT,
    country             TEXT,
    ctr_score           NUMERIC(4,2),                           -- proprietary score 1–10
    language            TEXT        DEFAULT 'en',
    email               TEXT,
    qualified           BOOLEAN     DEFAULT NULL,               -- NULL = not yet reviewed
    disqualified_reason TEXT,
    added_to_outreach   BOOLEAN     NOT NULL DEFAULT FALSE,
    last_fetched_at     TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_channels_qualified    ON pipeline_channels (qualified)
    WHERE qualified IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pipeline_channels_niche        ON pipeline_channels (niche);
CREATE INDEX IF NOT EXISTS idx_pipeline_channels_sub_count    ON pipeline_channels (subscriber_count DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_channels_outreach     ON pipeline_channels (added_to_outreach)
    WHERE added_to_outreach = FALSE;
