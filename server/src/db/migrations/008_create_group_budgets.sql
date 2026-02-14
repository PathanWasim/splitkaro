-- 008: Group Budgets
CREATE TABLE group_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    monthly_limit NUMERIC(12,2) NOT NULL,
    month_year VARCHAR(7) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, month_year)
);

CREATE INDEX idx_budget_group ON group_budgets(group_id);
CREATE INDEX idx_budget_month ON group_budgets(group_id, month_year);
