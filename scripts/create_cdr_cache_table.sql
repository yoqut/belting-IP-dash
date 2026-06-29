-- Supabase SQL Editor da ishlatish uchun
CREATE TABLE IF NOT EXISTS cdr_cache (
  cache_date TEXT PRIMARY KEY,   -- "YYYY-MM-DD" (UTC+5)
  pbx_records JSONB NOT NULL DEFAULT '[]',
  mz_records  JSONB NOT NULL DEFAULT '[]',
  cached_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Eski yozuvlarni tez topish uchun indeks
CREATE INDEX IF NOT EXISTS cdr_cache_cached_at_idx ON cdr_cache (cached_at);

-- RLS — service role orqali to'liq kirish
ALTER TABLE cdr_cache ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cdr_cache' AND policyname = 'service role full access'
  ) THEN
    CREATE POLICY "service role full access" ON cdr_cache USING (true) WITH CHECK (true);
  END IF;
END $$;
