-- Migration: Create contact_submissions table
-- Purpose: Store contact form submissions as backup to email delivery
-- This table is optional - if you use Resend or another email service,
-- the Edge Function will send emails directly. This table serves as a fallback.

CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  institution text,
  message text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  processed boolean DEFAULT false,
  processed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_contact_submissions_submitted_at 
  ON contact_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_processed 
  ON contact_submissions(processed) WHERE NOT processed;
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email 
  ON contact_submissions(email);

-- Add RLS policies (admin access only)
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Super admins can view all submissions
CREATE POLICY "Super admins can view contact submissions"
  ON contact_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Super admins can update (mark as processed)
CREATE POLICY "Super admins can update contact submissions"
  ON contact_submissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Allow anonymous submissions (for the contact form)
-- Note: The Edge Function uses service role, so this might not be needed
CREATE POLICY "Anyone can submit contact form"
  ON contact_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_contact_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contact_submissions_updated_at
  BEFORE UPDATE ON contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_submissions_updated_at();

COMMENT ON TABLE contact_submissions IS 'Stores contact form submissions from the landing page';
COMMENT ON COLUMN contact_submissions.processed IS 'Whether the submission has been reviewed/responded to';

-- Grant permissions
GRANT SELECT, UPDATE ON contact_submissions TO authenticated;
GRANT INSERT ON contact_submissions TO anon, authenticated;

SELECT '✅ Contact submissions table created successfully!' as status;
