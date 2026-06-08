-- Reset dashboard_cycles with proper SERIAL id
DROP TABLE IF EXISTS dashboard_cycles;
CREATE TABLE dashboard_cycles (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  issues JSONB NOT NULL DEFAULT '[]'
);

-- Ensure other dashboard tables exist
CREATE TABLE IF NOT EXISTS dashboard_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dashboard_ideas (
  service TEXT PRIMARY KEY,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
