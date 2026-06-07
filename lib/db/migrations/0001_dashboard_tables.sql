-- dashboard_cycles: create if not exists with SERIAL id
CREATE TABLE IF NOT EXISTS dashboard_cycles (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  issues JSONB NOT NULL DEFAULT '[]'
);

-- Fix id column if table already exists without sequence
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dashboard_cycles'
      AND column_name = 'id'
      AND column_default LIKE 'nextval%'
  ) THEN
    CREATE SEQUENCE IF NOT EXISTS dashboard_cycles_id_seq;
    ALTER TABLE dashboard_cycles ALTER COLUMN id SET DEFAULT nextval('dashboard_cycles_id_seq');
    ALTER SEQUENCE dashboard_cycles_id_seq OWNED BY dashboard_cycles.id;
    SELECT setval('dashboard_cycles_id_seq', COALESCE((SELECT MAX(id) FROM dashboard_cycles), 0) + 1, false);
  END IF;
END;
$$;

-- dashboard_settings
CREATE TABLE IF NOT EXISTS dashboard_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- dashboard_ideas
CREATE TABLE IF NOT EXISTS dashboard_ideas (
  service TEXT PRIMARY KEY,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
