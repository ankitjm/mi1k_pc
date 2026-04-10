-- ThumbnailOS — PostgreSQL Schema
-- Run once on fresh DB: psql $DATABASE_URL -f db-schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Leads (free signup / audit request)
CREATE TABLE IF NOT EXISTS leads (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    channel_url TEXT NOT NULL,
    tier        TEXT NOT NULL DEFAULT 'free',   -- free | pro
    status      TEXT NOT NULL DEFAULT 'pending', -- pending | in_progress | sent | active | churned
    mrr         INTEGER DEFAULT 0,              -- in INR
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leads_email_idx ON leads(email);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);

-- Audits (generated PDF reports)
CREATE TABLE IF NOT EXISTS audits (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id    UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    pdf_path   TEXT,
    score      NUMERIC(3,1),
    sent_at    TIMESTAMPTZ,
    opened_at  TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audits_lead_id_idx ON audits(lead_id);

-- Payments (Razorpay)
CREATE TABLE IF NOT EXISTS payments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razorpay_id  TEXT NOT NULL UNIQUE,
    email        TEXT NOT NULL,
    amount       INTEGER NOT NULL,  -- in paise
    status       TEXT NOT NULL,     -- captured | refunded | failed
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payments_email_idx ON payments(email);

-- Outreach (cold outreach tracking)
CREATE TABLE IF NOT EXISTS outreach (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_url  TEXT NOT NULL,
    email        TEXT,
    email_sent   BOOLEAN DEFAULT FALSE,
    opened       BOOLEAN DEFAULT FALSE,
    replied      BOOLEAN DEFAULT FALSE,
    converted    BOOLEAN DEFAULT FALSE,
    sent_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS outreach_channel_idx ON outreach(channel_url);

-- Auto-update updated_at on leads
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
