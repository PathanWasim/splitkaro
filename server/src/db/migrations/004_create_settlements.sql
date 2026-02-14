-- Migration 004: Create settlements and settlement_history tables

CREATE TABLE settlements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id        UUID NOT NULL REFERENCES groups(id),
    payer_id        UUID NOT NULL REFERENCES users(id),
    payee_id        UUID NOT NULL REFERENCES users(id),
    amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    status          VARCHAR(10) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'partial', 'settled')),
    idempotency_key UUID UNIQUE NOT NULL,
    upi_link        TEXT,
    settled_amount  NUMERIC(12, 2) DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sett_group ON settlements(group_id);
CREATE INDEX idx_sett_payer ON settlements(payer_id);
CREATE INDEX idx_sett_payee ON settlements(payee_id);

CREATE TABLE settlement_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_id   UUID NOT NULL REFERENCES settlements(id),
    amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method  VARCHAR(20) DEFAULT 'upi',
    note            TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
