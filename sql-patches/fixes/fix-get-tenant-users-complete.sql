-- Complete fix for get_tenant_users function
-- Issues addressed:
-- 1. Missing is_active column in tenant_users table
-- 2. Type mismatch: VARCHAR(20) vs TEXT for role column
-- 3. Proper column casting and table structure

-- Step 1: Add missing is_active column to tenant_users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenant_users' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE tenant_users ADD COLUMN is_active BOOLEAN DEFAULT true;
        
        -- Update existing records to be active by default
        UPDATE tenant_users SET is_active = true WHERE is_active IS NULL;
        
        -- Add NOT NULL constraint after setting defaults
        ALTER TABLE tenant_users ALTER COLUMN is_active SET NOT NULL;
        
        RAISE NOTICE 'Added is_active column to tenant_users table';
    ELSE
        RAISE NOTICE 'is_active column already exists in tenant_users table';
    END IF;
END $$;

-- Step 2: Drop and recreate the function with correct types
DROP FUNCTION IF EXISTS get_tenant_users(UUID);

CREATE OR REPLACE FUNCTION get_tenant_users(target_tenant_id UUID)
RETURNS TABLE(
  user_id UUID, 
  tenant_id UUID, 
  role VARCHAR(20),  -- Match the CHECK constraint type
  permissions TEXT[], 
  is_active BOOLEAN,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  department TEXT,
  license_number TEXT,
  phone TEXT,
  user_is_active BOOLEAN
) AS $$
DECLARE
  current_user_role TEXT;
  user_can_access BOOLEAN := FALSE;
BEGIN
  -- Get current user's role (with table alias to avoid ambiguity)
  SELECT up.role INTO current_user_role
  FROM user_profiles up
  WHERE up.id = auth.uid();
  
  -- Check if user has permission to view tenant users
  IF current_user_role = 'super_admin' THEN
    user_can_access := TRUE;
  ELSIF current_user_role = 'admin' THEN
    -- Check if admin belongs to the target tenant
    SELECT EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.user_id = auth.uid() 
      AND tu.tenant_id = target_tenant_id 
      AND tu.is_active = true
    ) INTO user_can_access;
  END IF;
  
  IF NOT user_can_access THEN
    RAISE EXCEPTION 'Insufficient permissions to view tenant users';
  END IF;
  
  RETURN QUERY
  SELECT 
    tu.user_id,
    tu.tenant_id,
    tu.role::VARCHAR(20),  -- Explicit cast to match return type
    tu.permissions,
    tu.is_active,
    up.email,
    up.first_name,
    up.last_name,
    up.department,
    up.license_number,
    up.phone,
    up.is_active as user_is_active
  FROM tenant_users tu
  JOIN user_profiles up ON tu.user_id = up.id
  WHERE tu.tenant_id = target_tenant_id
  AND tu.is_active = true
  ORDER BY up.first_name, up.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION get_tenant_users(UUID) TO authenticated;

-- Step 4: Test the function structure
SELECT 'Fixed get_tenant_users function - added is_active column and fixed type mismatch' as status;

-- Step 5: Show table structure for verification
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'tenant_users' 
ORDER BY ordinal_position;
