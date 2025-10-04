-- Alternative simpler RLS policy for patient_vitals (if the main one doesn't work)
-- This is a more permissive policy for testing

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage vitals for their tenant patients" ON "public"."patient_vitals";
DROP POLICY IF EXISTS "Users can view vitals for their tenant patients" ON "public"."patient_vitals";
DROP POLICY IF EXISTS "Users can insert vitals for their tenant patients" ON "public"."patient_vitals";
DROP POLICY IF EXISTS "Users can update vitals for their tenant patients" ON "public"."patient_vitals";

-- Simple policy: Allow authenticated users to manage vitals (for testing)
CREATE POLICY "Authenticated users can manage patient_vitals"
ON "public"."patient_vitals"
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Ensure RLS is enabled
ALTER TABLE "public"."patient_vitals" ENABLE ROW LEVEL SECURITY;

-- If you want to temporarily disable RLS for testing (NOT recommended for production):
-- ALTER TABLE "public"."patient_vitals" DISABLE ROW LEVEL SECURITY;