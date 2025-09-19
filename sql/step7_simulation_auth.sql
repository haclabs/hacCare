-- Create function to authenticate simulation users
-- This function checks username/password against the simulation_users table for simulation tenants

-- Version 1: With simulation tenant ID parameter
CREATE OR REPLACE FUNCTION authenticate_simulation_user(
    p_username TEXT,
    p_password TEXT,
    p_simulation_tenant_id UUID
) RETURNS TABLE (
    user_id UUID,
    username TEXT,
    email TEXT,
    role TEXT,
    tenant_id UUID,
    tenant_name TEXT,
    simulation_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        su.user_id,
        su.username,
        u.email,
        su.role,
        su.simulation_tenant_id as tenant_id,
        t.name as tenant_name,
        t.simulation_id
    FROM simulation_users su
    JOIN tenants t ON su.simulation_tenant_id = t.id
    JOIN auth.users u ON su.user_id = u.id
    JOIN simulation_user_passwords sup ON su.id = sup.simulation_user_id
    WHERE su.username = p_username 
    AND sup.password = p_password  -- In production, use proper password hashing
    AND su.simulation_tenant_id = p_simulation_tenant_id
    AND t.tenant_type = 'simulation'
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Version 2: Without simulation tenant ID parameter (searches all simulation tenants)
CREATE OR REPLACE FUNCTION authenticate_simulation_user(
    p_username TEXT,
    p_password TEXT
) RETURNS TABLE (
    user_id UUID,
    username TEXT,
    email TEXT,
    role TEXT,
    tenant_id UUID,
    tenant_name TEXT,
    simulation_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        su.user_id,
        su.username,
        u.email,
        su.role,
        su.simulation_tenant_id as tenant_id,
        t.name as tenant_name,
        t.simulation_id
    FROM simulation_users su
    JOIN tenants t ON su.simulation_tenant_id = t.id
    JOIN auth.users u ON su.user_id = u.id
    JOIN simulation_user_passwords sup ON su.id = sup.simulation_user_id
    WHERE su.username = p_username 
    AND sup.password = p_password  -- In production, use proper password hashing
    AND t.tenant_type = 'simulation'
    ORDER BY su.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions for both function signatures
GRANT EXECUTE ON FUNCTION authenticate_simulation_user(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION authenticate_simulation_user(TEXT, TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION authenticate_simulation_user(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION authenticate_simulation_user(TEXT, TEXT) TO anon;