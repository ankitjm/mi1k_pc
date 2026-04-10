-- =============================================================================
-- Migration: 001_initial
-- Description: Create initial ThumbnailOS schema
-- Applied by: psql -U thumbnailos -d thumbnailos -f db/migrations/001_initial.sql
-- =============================================================================

-- Track applied migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     TEXT        PRIMARY KEY,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Guard: skip if already applied
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM schema_migrations WHERE version = '001_initial') THEN
        RAISE NOTICE 'Migration 001_initial already applied — skipping.';
        RETURN;
    END IF;

    -- -------------------------------------------------------------------------
    -- Extensions
    -- -------------------------------------------------------------------------
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    -- -------------------------------------------------------------------------
    -- customers
    -- -------------------------------------------------------------------------
    CREATE TABLE customers (
        id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        email                   TEXT        NOT NULL UNIQUE,
        name                    TEXT        NOT NULL,
        channel_url             TEXT        NOT NULL,
        channel_id              TEXT,
        razorpay_customer_id    TEXT        UNIQUE,
        plan                    TEXT        NOT NULL DEFAULT 'free'
                                            CHECK (plan IN ('free','starter','pro')),
        subscription_status     TEXT        NOT NULL DEFAULT 'none'
                                            CHECK (subscription_status IN
                                                ('none','created','active','cancelled','halted')),
        onboarding_completed    BOOLEAN     NOT NULL DEFAULT FALSE,
        audit_count             INTEGER     NOT NULL DEFAULT 0,
        source                  TEXT,
        notes                   TEXT,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_customers_email              ON customers (email);
    CREATE INDEX idx_customers_razorpay_cust_id   ON customers (razorpay_customer_id);
    CREATE INDEX idx_customers_channel_id         ON customers (channel_id);
    CREATE INDEX idx_customers_subscription_status ON customers (subscription_status);

    -- -------------------------------------------------------------------------
    -- subscriptions
    -- -------------------------------------------------------------------------
    CREATE TABLE subscriptions (
        id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id                 UUID        REFERENCES customers (id) ON DELETE SET NULL,
        razorpay_subscription_id    TEXT        NOT NULL UNIQUE,
        razorpay_customer_id        TEXT,
        razorpay_plan_id            TEXT,
        status                      TEXT        NOT NULL DEFAULT 'created'
                                                CHECK (status IN
                                                    ('created','active','cancelled','halted','expired')),
        current_period_start        TIMESTAMPTZ,
        current_period_end          TIMESTAMPTZ,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_subscriptions_customer_id  ON subscriptions (customer_id);
    CREATE INDEX idx_subscriptions_rzp_sub_id   ON subscriptions (razorpay_subscription_id);
    CREATE INDEX idx_subscriptions_rzp_cust_id  ON subscriptions (razorpay_customer_id);
    CREATE INDEX idx_subscriptions_status       ON subscriptions (status);

    -- -------------------------------------------------------------------------
    -- subscription_charges
    -- -------------------------------------------------------------------------
    CREATE TABLE subscription_charges (
        id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        razorpay_subscription_id    TEXT        NOT NULL REFERENCES subscriptions (razorpay_subscription_id),
        razorpay_payment_id         TEXT        NOT NULL UNIQUE,
        amount_paise                INTEGER     NOT NULL,
        currency                    TEXT        NOT NULL DEFAULT 'INR',
        charged_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_charges_rzp_sub_id ON subscription_charges (razorpay_subscription_id);

    -- -------------------------------------------------------------------------
    -- audits
    -- -------------------------------------------------------------------------
    CREATE TABLE audits (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id     UUID        REFERENCES customers (id) ON DELETE SET NULL,
        channel_url     TEXT        NOT NULL,
        channel_id      TEXT,
        channel_title   TEXT,
        video_count     INTEGER     NOT NULL DEFAULT 0,
        avg_score       NUMERIC(4,2),
        pdf_path        TEXT,
        status          TEXT        NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending','running','done','failed')),
        error_message   TEXT,
        triggered_by    TEXT        DEFAULT 'system',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_audits_customer_id ON audits (customer_id);
    CREATE INDEX idx_audits_channel_id  ON audits (channel_id);
    CREATE INDEX idx_audits_status      ON audits (status);
    CREATE INDEX idx_audits_created_at  ON audits (created_at DESC);

    -- -------------------------------------------------------------------------
    -- outreach
    -- -------------------------------------------------------------------------
    CREATE TABLE outreach (
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

    CREATE INDEX idx_outreach_status     ON outreach (outreach_status);
    CREATE INDEX idx_outreach_channel_id ON outreach (channel_id);
    CREATE INDEX idx_outreach_email      ON outreach (email);
    CREATE INDEX idx_outreach_follow_up  ON outreach (follow_up_at)
        WHERE follow_up_at IS NOT NULL AND outreach_status NOT IN ('converted','rejected','unsubscribed');

    -- -------------------------------------------------------------------------
    -- pipeline_channels
    -- -------------------------------------------------------------------------
    CREATE TABLE pipeline_channels (
        id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        channel_id          TEXT        NOT NULL UNIQUE,
        channel_name        TEXT        NOT NULL,
        channel_url         TEXT        NOT NULL,
        subscriber_count    BIGINT,
        avg_views           BIGINT,
        niche               TEXT,
        country             TEXT,
        ctr_score           NUMERIC(4,2),
        language            TEXT        DEFAULT 'en',
        email               TEXT,
        qualified           BOOLEAN     DEFAULT NULL,
        disqualified_reason TEXT,
        added_to_outreach   BOOLEAN     NOT NULL DEFAULT FALSE,
        last_fetched_at     TIMESTAMPTZ,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_pipeline_channels_qualified ON pipeline_channels (qualified)
        WHERE qualified IS NOT NULL;
    CREATE INDEX idx_pipeline_channels_niche     ON pipeline_channels (niche);
    CREATE INDEX idx_pipeline_channels_sub_count ON pipeline_channels (subscriber_count DESC);
    CREATE INDEX idx_pipeline_channels_outreach  ON pipeline_channels (added_to_outreach)
        WHERE added_to_outreach = FALSE;

    -- -------------------------------------------------------------------------
    -- Record migration
    -- -------------------------------------------------------------------------
    INSERT INTO schema_migrations (version) VALUES ('001_initial');
    RAISE NOTICE 'Migration 001_initial applied successfully.';
END;
$$;
