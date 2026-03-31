-- Add cv_url column to kandidaten table
ALTER TABLE kandidaten ADD COLUMN IF NOT EXISTS cv_url TEXT;

-- Create storage bucket for CV uploads (private — requires auth)
INSERT INTO storage.buckets (id, name, public)
VALUES ('cv-uploads', 'cv-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for cv-uploads bucket
-- Candidates can upload their own CV
CREATE POLICY "Candidates can upload own CV"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'cv-uploads'
    AND (storage.foldername(name))[1] IN (
      SELECT kandidaat_id::text FROM portal_users WHERE auth_user_id = auth.uid()
    )
  );

-- Candidates can read their own CV
CREATE POLICY "Candidates can read own CV"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'cv-uploads'
    AND (storage.foldername(name))[1] IN (
      SELECT kandidaat_id::text FROM portal_users WHERE auth_user_id = auth.uid()
    )
  );

-- Candidates can update (overwrite) their own CV
CREATE POLICY "Candidates can update own CV"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'cv-uploads'
    AND (storage.foldername(name))[1] IN (
      SELECT kandidaat_id::text FROM portal_users WHERE auth_user_id = auth.uid()
    )
  );

-- Service role has full access (for admin/CRM operations)
CREATE POLICY "Service role full access cv-uploads"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'cv-uploads')
  WITH CHECK (bucket_id = 'cv-uploads');
