-- Migration 003: Create expenses and expense_splits tables (IMMUTABLE LEDGER)

CREATE TABLE expenses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id        UUID NOT NULL REFERENCES groups(id),
    paid_by         UUID NOT NULL REFERENCES users(id),
    amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    description     VARCHAR(255) NOT NULL,
    split_type      VARCHAR(15) NOT NULL CHECK (split_type IN ('equal', 'custom', 'percentage')),
    entry_type      VARCHAR(15) NOT NULL DEFAULT 'original' CHECK (entry_type IN ('original', 'adjustment')),
    parent_id       UUID REFERENCES expenses(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_adjustment CHECK (
        (entry_type = 'original' AND parent_id IS NULL) OR
        (entry_type = 'adjustment' AND parent_id IS NOT NULL)
    )
);

CREATE INDEX idx_exp_group ON expenses(group_id);
CREATE INDEX idx_exp_paidby ON expenses(paid_by);

CREATE TABLE expense_splits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id      UUID NOT NULL REFERENCES expenses(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    amount          NUMERIC(12, 2) NOT NULL,
    UNIQUE(expense_id, user_id)
);

CREATE INDEX idx_splits_expense ON expense_splits(expense_id);
CREATE INDEX idx_splits_user ON expense_splits(user_id);
