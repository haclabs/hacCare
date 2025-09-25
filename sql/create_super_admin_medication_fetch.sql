-- Create RPC function for super admins to fetch medications across tenants
-- This bypasses RLS policies for authorized users

-- Drop existing function first to handle return type changes
DROP FUNCTION IF EXISTS fetch_medications_for_tenant(UUID);

CREATE OR REPLACE FUNCTION fetch_medications_for_tenant(target_tenant_id UUID)
RETURNS TABLE (
    medication_id UUID,
    patient_id UUID,
    name TEXT,
    dosage TEXT,
    frequency TEXT,
    route TEXT,
    prescribed_by TEXT,
    start_date DATE,
    tenant_id UUID,
    patient_first_name TEXT,
    patient_last_name TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    current_user_id UUID;
    user_role TEXT;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Check if user is super admin or admin
    SELECT role INTO user_role 
    FROM user_profiles 
    WHERE id = current_user_id;
    
    -- Only allow super_admin and admin roles to use this function
    IF user_role NOT IN ('super_admin', 'admin') THEN
        RAISE EXCEPTION 'Insufficient permissions. Only super admins and admins can access cross-tenant data.';
    END IF;
    
    -- Return medications for the specified tenant with patient info
    RETURN QUERY
    SELECT 
        pm.id as medication_id,
        pm.patient_id,
        pm.name,
        pm.dosage,
        pm.frequency,
        pm.route,
        pm.prescribed_by,
        pm.start_date,
        pm.tenant_id,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name
    FROM patient_medications pm
    LEFT JOIN patients p ON pm.patient_id = p.id
    WHERE pm.tenant_id = target_tenant_id
    AND pm.status = 'Active'
    ORDER BY pm.name;
END;
$$;