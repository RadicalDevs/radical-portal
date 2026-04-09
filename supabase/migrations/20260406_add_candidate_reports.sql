-- =============================================================================
-- Kandidaat Rapport Generator + Matching Engine — Database Migratie
-- =============================================================================

-- 1. kandidaat_brondata — ruwe data bronnen per kandidaat
CREATE TABLE IF NOT EXISTS kandidaat_brondata (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kandidaat_id  UUID NOT NULL REFERENCES kandidaten(id) ON DELETE CASCADE,
  bron_type     TEXT NOT NULL,          -- 'cv_tekst' | 'linkedin_profiel' | 'transcriptie'
  bron_label    TEXT,                   -- "Intake gesprek 12 mrt", etc.
  inhoud        TEXT NOT NULL,
  metadata      JSONB DEFAULT '{}',
  content_hash  TEXT NOT NULL,          -- SHA-256 prefix (16 chars)
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(kandidaat_id, bron_type, content_hash)
);

CREATE INDEX IF NOT EXISTS idx_brondata_kandidaat ON kandidaat_brondata(kandidaat_id);
CREATE INDEX IF NOT EXISTS idx_brondata_type ON kandidaat_brondata(bron_type);

-- RLS
ALTER TABLE kandidaat_brondata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access kandidaat_brondata"
  ON kandidaat_brondata FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Admins can read kandidaat_brondata"
  ON kandidaat_brondata FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- 2. kandidaat_rapporten — LLM-gegenereerde rapporten
CREATE TABLE IF NOT EXISTS kandidaat_rapporten (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kandidaat_id      UUID UNIQUE NOT NULL REFERENCES kandidaten(id) ON DELETE CASCADE,
  rapport_versie    INTEGER NOT NULL DEFAULT 1,
  status            TEXT NOT NULL DEFAULT 'generating',  -- 'generating' | 'ready' | 'error'
  secties           JSONB NOT NULL DEFAULT '{}',
  brondata_hashes   TEXT[] NOT NULL DEFAULT '{}',
  model_gebruikt    TEXT,
  tokens_gebruikt   INTEGER,
  generatie_duur_ms INTEGER,
  error_bericht     TEXT,
  gegenereerd_op    TIMESTAMPTZ DEFAULT now(),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rapporten_kandidaat ON kandidaat_rapporten(kandidaat_id);

-- RLS
ALTER TABLE kandidaat_rapporten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access kandidaat_rapporten"
  ON kandidaat_rapporten FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Admins can read kandidaat_rapporten"
  ON kandidaat_rapporten FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- 3. kandidaat_transcripties — interview transcripties
CREATE TABLE IF NOT EXISTS kandidaat_transcripties (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kandidaat_id  UUID NOT NULL REFERENCES kandidaten(id) ON DELETE CASCADE,
  titel         TEXT NOT NULL,
  transcript    TEXT NOT NULL,
  bron          TEXT DEFAULT 'handmatig',  -- 'handmatig' | 'fireflies' | 'carv'
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transcripties_kandidaat ON kandidaat_transcripties(kandidaat_id);

-- RLS
ALTER TABLE kandidaat_transcripties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access kandidaat_transcripties"
  ON kandidaat_transcripties FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage kandidaat_transcripties"
  ON kandidaat_transcripties FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM portal_users
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- 4. rapport_settings — configuratie voor rapport generatie
CREATE TABLE IF NOT EXISTS rapport_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_generatie  BOOLEAN DEFAULT false,
  model_voorkeur  TEXT DEFAULT 'gemini-2.0-flash',  -- 'gemini-2.0-flash' | 'gpt-4o-mini' | 'grok-3-mini'
  fallback_models TEXT[] DEFAULT ARRAY['gpt-4o-mini', 'grok-3-mini'],
  updated_by      TEXT,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE rapport_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access rapport_settings"
  ON rapport_settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage rapport_settings"
  ON rapport_settings FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM portal_users
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default settings
INSERT INTO rapport_settings (auto_generatie, model_voorkeur, fallback_models)
VALUES (false, 'gemini-2.0-flash', ARRAY['gpt-4o-mini', 'grok-3-mini'])
ON CONFLICT DO NOTHING;
