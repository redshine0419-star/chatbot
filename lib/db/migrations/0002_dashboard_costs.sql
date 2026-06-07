-- dashboard_costs: monthly cost ledger
CREATE TABLE IF NOT EXISTS dashboard_costs (
  id SERIAL PRIMARY KEY,
  month TEXT NOT NULL,
  service TEXT NOT NULL DEFAULT 'general',
  item TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
