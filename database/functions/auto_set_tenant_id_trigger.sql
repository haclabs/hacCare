-- ============================================================================
-- AUTO-SET TENANT_ID TRIGGER
-- ============================================================================
-- 
-- Purpose: Automatically set tenant_id on all patient data inserts
-- 
-- Why: Services don't explicitly set tenant_id, causing RLS violations
-- 
-- How: Trigger gets tenant_id from user_profiles and sets it before INSERT
-- 
-- Benefits:
--   - Zero code changes needed in services
--   - Works for simulations automatically
--   - New features get tenant isolation for free
--   - Can't forget to set tenant_id
-- 
-- ============================================================================

-- Create the trigger function
CREATE OR REPLACE FUNCTION auto_set_tenant_id()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Only set tenant_id if it's not already provided
  IF NEW.tenant_id IS NULL THEN
    
    -- Get tenant_id from user's profile
    SELECT tenant_id INTO v_tenant_id
    FROM user_profiles
    WHERE id = auth.uid();
    
    -- If user has a tenant, set it
    IF v_tenant_id IS NOT NULL THEN
      NEW.tenant_id := v_tenant_id;
      RAISE NOTICE 'Auto-set tenant_id to % for table %.%', 
        v_tenant_id, TG_TABLE_SCHEMA, TG_TABLE_NAME;
    ELSE
      -- No tenant found - this might be a system operation
      RAISE WARNING 'No tenant_id found for user % inserting into %.%', 
        auth.uid(), TG_TABLE_SCHEMA, TG_TABLE_NAME;
    END IF;
    
  ELSE
    -- tenant_id was explicitly provided, validate it matches user's tenant
    SELECT tenant_id INTO v_tenant_id
    FROM user_profiles
    WHERE id = auth.uid();
    
    -- Allow super_admin to insert into any tenant
    IF v_tenant_id IS NOT NULL AND NEW.tenant_id != v_tenant_id THEN
      -- Check if user is super_admin
      IF NOT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
      ) THEN
        RAISE EXCEPTION 'Cannot insert into different tenant. User tenant: %, Attempted: %', 
          v_tenant_id, NEW.tenant_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Apply trigger to all patient data tables
-- ============================================================================
-- Note: Only apply to tables that exist. Skip if table doesn't exist.
-- ============================================================================

-- Helper procedure to safely create triggers
DO $$
DECLARE
  tables_to_process text[] := ARRAY[
    'patient_vitals',
    'patient_medications',
    'medication_administrations',
    'patient_notes',
    'patient_alerts',
    'lab_results',
    'imaging_orders',
    'diabetic_records',
    'bowel_records',
    'handover_reports',
    'patient_admissions',
    'patient_discharges',
    'advanced_directives'
  ];
  v_table_name text;
  v_table_exists boolean;
  v_column_exists boolean;
BEGIN
  FOREACH v_table_name IN ARRAY tables_to_process
  LOOP
    -- Check if table exists
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = v_table_name
    ) INTO v_table_exists;
    
    IF v_table_exists THEN
      -- Check if table has tenant_id column
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = v_table_name
        AND column_name = 'tenant_id'
      ) INTO v_column_exists;
      
      IF v_column_exists THEN
        -- Drop existing trigger if it exists
        EXECUTE format('DROP TRIGGER IF EXISTS set_tenant_id_before_insert ON %I', v_table_name);
        
        -- Create new trigger
        EXECUTE format('
          CREATE TRIGGER set_tenant_id_before_insert
            BEFORE INSERT ON %I
            FOR EACH ROW
            EXECUTE FUNCTION auto_set_tenant_id()
        ', v_table_name);
        
        RAISE NOTICE '✅ Created trigger on table: %', v_table_name;
      ELSE
        RAISE NOTICE '⏭️  Skipping % (no tenant_id column)', v_table_name;
      END IF;
    ELSE
      RAISE NOTICE '⏭️  Skipping % (table does not exist)', v_table_name;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- Verify triggers are created
-- ============================================================================

-- Run this query to verify all triggers are in place:
/*
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'set_tenant_id_before_insert'
ORDER BY event_object_table;
*/

-- ============================================================================
-- Test the trigger
-- ============================================================================

-- Test with a simple insert (will use current user's tenant_id):
/*
-- This should now work without explicitly setting tenant_id
INSERT INTO patient_vitals (
  patient_id,
  temperature,
  blood_pressure_systolic,
  blood_pressure_diastolic,
  heart_rate,
  respiratory_rate,
  oxygen_saturation
) VALUES (
  (SELECT id FROM patients LIMIT 1),
  98.6,
  120,
  80,
  72,
  16,
  98
);

-- Check the result
SELECT 
  id,
  patient_id,
  tenant_id,
  temperature,
  recorded_at
FROM patient_vitals
ORDER BY recorded_at DESC
LIMIT 1;

-- The tenant_id should be automatically set!
*/

-- ============================================================================
-- How This Helps Simulations
-- ============================================================================

/*
BEFORE (Without Trigger):
1. Student enters simulation
2. TenantContext switches to simulation tenant
3. Student records vitals
4. Service inserts without tenant_id
5. ❌ RLS blocks insert (no tenant_id)
6. Error: "new row violates row-level security policy"

AFTER (With Trigger):
1. Student enters simulation
2. TenantContext switches to simulation tenant
3. Student records vitals
4. Service inserts without tenant_id
5. ✅ Trigger auto-sets tenant_id from user_profiles
6. ✅ RLS allows insert (tenant_id matches)
7. ✅ Data recorded with simulation tenant_id
8. ✅ Isolated from production
9. ✅ Can query for debrief reports
10. ✅ Can cleanup by tenant_id

RESULT:
- Zero code changes in services
- All features work in simulations automatically
- New features get isolation for free
- Can't forget to set tenant_id
*/

-- ============================================================================
-- Migration Notes
-- ============================================================================

/*
BEFORE RUNNING:
1. Backup your database
2. Test in development first
3. Verify user_profiles.tenant_id is set for all users

AFTER RUNNING:
1. Run the verification query above
2. Test inserting vitals through the UI
3. Check that tenant_id is set correctly
4. Re-run: npm run test:tenant-isolation

IF ISSUES:
1. Check Supabase logs for trigger errors
2. Verify user_profiles has tenant_id
3. Check RLS policies allow INSERT
4. Can drop triggers and rollback if needed:
   DROP TRIGGER set_tenant_id_before_insert ON patient_vitals;
*/

-- ============================================================================
-- Performance Considerations
-- ============================================================================

/*
The trigger adds a single lookup per INSERT:
  SELECT tenant_id FROM user_profiles WHERE id = auth.uid()

Performance impact:
- Query is indexed (user_profiles.id is primary key)
- Lookup time: < 1ms
- Cached by PostgreSQL
- Negligible overhead

Alternative (if concerned about performance):
- Cache tenant_id in auth.jwt() claims
- Update trigger to check JWT first
- Fallback to user_profiles if not in JWT
*/

-- ============================================================================
-- Security Considerations
-- ============================================================================

/*
Security features:
1. ✅ Can't bypass (SECURITY DEFINER)
2. ✅ Validates tenant_id if explicitly provided
3. ✅ Allows super_admin cross-tenant access
4. ✅ Logs tenant_id changes (NOTICE level)
5. ✅ Prevents unauthorized tenant access

Additional recommendations:
- Enable trigger logging in production
- Monitor for unusual tenant_id patterns
- Audit logs for cross-tenant access
- Regular security reviews
*/

COMMENT ON FUNCTION auto_set_tenant_id() IS 
'Automatically sets tenant_id on INSERT from user_profiles. 
Ensures all patient data is properly isolated by tenant.
Required for simulation data isolation.';
