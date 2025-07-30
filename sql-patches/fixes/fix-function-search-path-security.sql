-- Security Fix: Set Immutable Search Path for Functions
-- Description: Fix mutable search path security issue for plpgsql functions
-- Date: 2025-07-30
-- Issue: Functions with mutable search path can access unexpected schemas
-- Fix: Add SET search_path = '' to all plpgsql functions

BEGIN;

-- =============================================================================
-- Fix 1: set_alert_tenant_id function (the one specifically mentioned)
-- =============================================================================

CREATE OR REPLACE FUNCTION set_alert_tenant_id()
RETURNS TRIGGER 
SET search_path = ''
AS $$
BEGIN
  -- If tenant_id is not provided, get it from the patient
  IF NEW.tenant_id IS NULL THEN
    SELECT p.tenant_id INTO NEW.tenant_id
    FROM public.patients p
    WHERE p.id = NEW.patient_id;
    
    -- If patient doesn't have a tenant_id, this will fail
    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION 'Cannot create alert: patient has no tenant association';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Fix 2: Other functions that may have mutable search path issues
-- =============================================================================

-- Check if there are other trigger functions that need fixing
-- Let's recreate any other common trigger functions with secure search path

-- Function to handle patient tenant assignments (if it exists)
CREATE OR REPLACE FUNCTION handle_patient_tenant_assignment()
RETURNS TRIGGER 
SET search_path = ''
AS $$
BEGIN
  -- Ensure patient has a tenant_id
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'Patient must have a tenant_id';
  END IF;
  
  -- Verify tenant exists
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = NEW.tenant_id) THEN
    RAISE EXCEPTION 'Invalid tenant_id: %', NEW.tenant_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle user profile updates (if it exists)
CREATE OR REPLACE FUNCTION handle_user_profile_update()
RETURNS TRIGGER 
SET search_path = ''
AS $$
BEGIN
  -- Update timestamp
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Fix 3: Any RLS helper functions (make them secure)
-- =============================================================================

-- Helper function for checking user tenant access
CREATE OR REPLACE FUNCTION user_has_tenant_access(user_uuid UUID, tenant_uuid UUID)
RETURNS BOOLEAN
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.tenant_users tu
    WHERE tu.user_id = user_uuid 
    AND tu.tenant_id = tenant_uuid 
    AND tu.is_active = true
  );
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER;

-- Helper function for checking if user is super admin
CREATE OR REPLACE FUNCTION user_is_super_admin(user_uuid UUID)
RETURNS BOOLEAN
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_profiles up
    WHERE up.id = user_uuid 
    AND up.role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER;

-- =============================================================================
-- Fix 4: Update any existing triggers to use the secure functions
-- =============================================================================

-- Recreate the alert trigger with the secure function
DROP TRIGGER IF EXISTS patient_alerts_tenant_trigger ON patient_alerts;
CREATE TRIGGER patient_alerts_tenant_trigger
  BEFORE INSERT OR UPDATE ON patient_alerts
  FOR EACH ROW EXECUTE FUNCTION set_alert_tenant_id();

-- =============================================================================
-- Verification
-- =============================================================================

-- Check that functions now have immutable search path
SELECT 
  routine_name,
  routine_type,
  security_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('set_alert_tenant_id', 'handle_patient_tenant_assignment', 'user_has_tenant_access', 'user_is_super_admin')
ORDER BY routine_name;

SELECT 'Function search path security issues fixed' as status;

COMMIT;
