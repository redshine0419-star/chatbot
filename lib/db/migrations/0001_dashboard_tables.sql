-- Recreate dashboard_cycles with proper SERIAL id (drop if broken schema)
DO $$
BEGIN
  -- If id column has no sequence default, recreate the table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dashboard_cycles'
      AND column_name = 'id'
      AND column_default LIKE 'nextval%'
  ) THEN
    DROP TABLE IF EXISTS dashboard_cycles;
    CREATE TABLE dashboard_cycles (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      issues JSONB NOT NULL DEFAULT '[]'
    );
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
