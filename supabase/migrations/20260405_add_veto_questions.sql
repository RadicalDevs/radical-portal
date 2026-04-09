-- Veto vragen functionaliteit
-- Voegt is_veto toe aan apac_questions en veto tracking aan apac_resultaten

-- 1) apac_questions: markeer welke vragen veto vragen zijn
-- De "foute opties" worden opgeslagen in de bestaande options JSONB kolom
-- door is_veto_fout: true toe te voegen aan specifieke opties
ALTER TABLE apac_questions
  ADD COLUMN IF NOT EXISTS is_veto BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) apac_resultaten: track of en welke veto's getriggerd zijn
ALTER TABLE apac_resultaten
  ADD COLUMN IF NOT EXISTS veto_getriggerd BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS veto_details JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 3) Partial index voor snelle filtering op getriggerde veto's
CREATE INDEX IF NOT EXISTS idx_apac_resultaten_veto
  ON apac_resultaten(veto_getriggerd)
  WHERE veto_getriggerd = TRUE;
