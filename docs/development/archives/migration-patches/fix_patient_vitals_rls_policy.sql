-- Fix Row Level Security policy for patient_vitals table
-- This allows users to insert/update/select vitals for patients in their tenant
-- AND allows super_admin users to access all vitals across tenants

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can manage vitals for their tenant patients" ON "public"."patient_vitals";
DROP POLICY IF EXISTS "Users can view vitals for their tenant patients" ON "public"."patient_vitals";
DROP POLICY IF EXISTS "Users can insert vitals for their tenant patients" ON "public"."patient_vitals";
DROP POLICY IF EXISTS "Users can update vitals for their tenant patients" ON "public"."patient_vitals";
DROP POLICY IF EXISTS "super_admin_tenant_access" ON "public"."patient_vitals";

-- Create a simple policy that allows super_admin role access to all tenants
CREATE POLICY "patient_vitals_access" ON "public"."patient_vitals"
FOR ALL USING (
    -- Super admin users can access all vitals across all tenants
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND role = 'super_admin' 
        AND is_active = true
    )
    OR 
    -- Regular users can access vitals from their assigned tenants only
    EXISTS (
        SELECT 1 FROM tenant_users 
        WHERE user_id = auth.uid() 
        AND tenant_id = "patient_vitals".tenant_id 
        AND is_active = true
    )
)
WITH CHECK (
    -- Super admin users can modify all vitals across all tenants
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND role = 'super_admin' 
        AND is_active = true
    )
    OR 
    -- Regular users can modify vitals from their assigned tenants only
    EXISTS (
        SELECT 1 FROM tenant_users 
        WHERE user_id = auth.uid() 
        AND tenant_id = "patient_vitals".tenant_id 
        AND is_active = true
    )
);

-- Ensure RLS is enabled
ALTER TABLE "public"."patient_vitals" ENABLE ROW LEVEL SECURITY;