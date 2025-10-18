-- ===========================================================================
-- FIX: Tenant Type Check Constraint Issue (SIMPLE APPROACH)
-- ===========================================================================
-- Purpose: Fix check constraint violation when creating simulation tenants
-- Issue: The tenants table has an existing tenant_type column (text) with
--        a check constraint that doesn't include simulation types
-- Solution: Update the check constraint to include new simulation types
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Step 1: Drop the old check constraint if it exists
-- ---------------------------------------------------------------------------
DO $$ 
BEGIN
  -- Drop existing check constraint on tenant_type
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tenants_tenant_type_check'
  ) THEN
    ALTER TABLE tenants DROP CONSTRAINT tenants_tenant_type_check;
    RAISE NOTICE 'Dropped old tenant_type check constraint';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Step 2: Add new check constraint with simulation types included
-- ---------------------------------------------------------------------------
ALTER TABLE tenants
ADD CONSTRAINT tenants_tenant_type_check 
CHECK (tenant_type IN (
  'production',
  'institution', 
  'hospital',
  'clinic',
  'simulation_template',
  'simulation_active'
));

-- ---------------------------------------------------------------------------
-- Step 4: Ensure other simulation columns exist
-- ---------------------------------------------------------------------------
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS is_simulation boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS simulation_config jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS auto_cleanup_at timestamptz,
ADD COLUMN IF NOT EXISTS simulation_id uuid;

-- ---------------------------------------------------------------------------
-- Step 5: Create indexes if they don't exist
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tenants_type ON tenants(tenant_type);
CREATE INDEX IF NOT EXISTS idx_tenants_simulation ON tenants(is_simulation) WHERE is_simulation = true;

-- ---------------------------------------------------------------------------
-- Verify the fix
-- ---------------------------------------------------------------------------
DO $$ 
BEGIN
  RAISE NOTICE 'Tenant type constraint fix completed successfully';
  RAISE NOTICE 'You can now create simulation templates and active simulations';
END $$;
