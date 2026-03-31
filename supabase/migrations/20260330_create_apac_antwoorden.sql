-- =============================================================================
-- Migration: apac_antwoorden — Individuele antwoorden per vraag opslaan
-- =============================================================================

CREATE TABLE IF NOT EXISTS apac_antwoorden (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES portal_sessions(id) ON DELETE CASCADE,
  kandidaat_id UUID NOT NULL REFERENCES kandidaten(id) ON DELETE CASCADE,
  question_id  UUID NOT NULL REFERENCES apac_questions(id) ON DELETE CASCADE,
  answer_value NUMERIC NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index voor snelle lookups per sessie en per vraag
CREATE INDEX idx_apac_antwoorden_session ON apac_antwoorden(session_id);
CREATE INDEX idx_apac_antwoorden_question ON apac_antwoorden(question_id);
CREATE INDEX idx_apac_antwoorden_kandidaat ON apac_antwoorden(kandidaat_id);

-- Unieke constraint: één antwoord per vraag per sessie
ALTER TABLE apac_antwoorden
  ADD CONSTRAINT uq_apac_antwoorden_session_question UNIQUE (session_id, question_id);

-- =============================================================================
-- RLS policies
-- =============================================================================

ALTER TABLE apac_antwoorden ENABLE ROW LEVEL SECURITY;

-- Admins kunnen alles lezen
CREATE POLICY "Admins can read apac_antwoorden"
  ON apac_antwoorden
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- Service role kan inserten (via server actions)
CREATE POLICY "Service role can insert apac_antwoorden"
  ON apac_antwoorden
  FOR INSERT
  TO service_role
  WITH CHECK (true);
