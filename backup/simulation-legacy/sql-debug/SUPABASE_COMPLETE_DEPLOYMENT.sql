-- COMPLETE SUPABASE DEPLOYMENT
-- Copy and paste this entire file into Supabase Dashboard SQL Editor
-- This will create all missing components and fix the vitals restoration

-- ============================================================================
-- STEP 1: CREATE SIMULATION_TEMPLATE_SNAPSHOTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS simulation_template_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL,
    table_name TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_simulation_template_snapshots_template_id 
ON simulation_template_snapshots(template_id);

CREATE INDEX IF NOT EXISTS idx_simulation_template_snapshots_table_name 
ON simulation_template_snapshots(template_id, table_name);

-- Enable RLS (Row Level Security)
ALTER TABLE simulation_template_snapshots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view snapshots for their tenant simulations" ON simulation_template_snapshots;
DROP POLICY IF EXISTS "Users can create snapshots for their tenant simulations" ON simulation_template_snapshots;
DROP POLICY IF EXISTS "Users can update snapshots for their tenant simulations" ON simulation_template_snapshots;
DROP POLICY IF EXISTS "Users can delete snapshots for their tenant simulations" ON simulation_template_snapshots;
DROP POLICY IF EXISTS "Users can view snapshots for their tenant templates" ON simulation_template_snapshots;
DROP POLICY IF EXISTS "Users can create snapshots for their tenant templates" ON simulation_template_snapshots;
DROP POLICY IF EXISTS "Users can update snapshots for their tenant templates" ON simulation_template_snapshots;
DROP POLICY IF EXISTS "Users can delete snapshots for their tenant templates" ON simulation_template_snapshots;

-- Create RLS policies
CREATE POLICY "Users can view snapshots for their tenant templates" 
ON simulation_template_snapshots FOR SELECT 
USING (
  template_id IN (
    SELECT id FROM simulation_templates 
    WHERE tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  )
);

CREATE POLICY "Users can create snapshots for their tenant templates" 
ON simulation_template_snapshots FOR INSERT 
WITH CHECK (
  template_id IN (
    SELECT id FROM simulation_templates 
    WHERE tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  )
);

CREATE POLICY "Users can update snapshots for their tenant templates" 
ON simulation_template_snapshots FOR UPDATE 
USING (
  template_id IN (
    SELECT id FROM simulation_templates 
    WHERE tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  )
);

CREATE POLICY "Users can delete snapshots for their tenant templates" 
ON simulation_template_snapshots FOR DELETE 
USING (
  template_id IN (
    SELECT id FROM simulation_templates 
    WHERE tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  )
);

-- Grant permissions
GRANT ALL ON simulation_template_snapshots TO authenticated;

-- ============================================================================
-- STEP 2: CREATE SAVE_TEMPLATE_SNAPSHOT_V2 FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION save_template_snapshot_v2(p_template_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_table_name TEXT;
  v_record_count INTEGER;
  v_total_records INTEGER := 0;
  v_tables_processed TEXT[] := '{}';
  v_snapshot_stats JSONB := '{}';
BEGIN
  RAISE NOTICE '📸 Starting template snapshot creation for %', p_template_id;

  -- Get tenant_id from the simulation template
  SELECT tenant_id INTO v_tenant_id
  FROM simulation_templates
  WHERE id = p_template_id;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Simulation not found'
    );
  END IF;

  RAISE NOTICE '🏢 Creating snapshot for tenant: %', v_tenant_id;

  -- Clear any existing snapshots for this template
  DELETE FROM simulation_template_snapshots WHERE template_id = p_template_id;
  RAISE NOTICE '🗑️ Cleared existing snapshots';

  -- Dynamically discover and snapshot all patient-related tables
  FOR v_table_name IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name LIKE 'patient%'
      AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = information_schema.tables.table_name 
          AND column_name = 'tenant_id'
      )
  LOOP
    -- Snapshot all records for this tenant
    EXECUTE format('
      INSERT INTO simulation_template_snapshots (template_id, table_name, data)
      SELECT $1, $2, row_to_json(t.*)
      FROM %I t
      WHERE t.tenant_id = $3
    ', v_table_name)
    USING p_template_id, v_table_name, v_tenant_id;
    
    GET DIAGNOSTICS v_record_count = ROW_COUNT;
    v_total_records := v_total_records + v_record_count;
    v_tables_processed := array_append(v_tables_processed, v_table_name);
    v_snapshot_stats := v_snapshot_stats || jsonb_build_object(v_table_name, v_record_count);
    
    RAISE NOTICE '📦 Captured % records from %', v_record_count, v_table_name;
  END LOOP;

  RAISE NOTICE '✅ Template snapshot complete! % records from % tables', v_total_records, array_length(v_tables_processed, 1);

  RETURN jsonb_build_object(
    'success', true,
    'template_id', p_template_id,
    'tenant_id', v_tenant_id,
    'total_records', v_total_records,
    'tables_processed', v_tables_processed,
    'snapshot_stats', v_snapshot_stats,
    'message', format('Template snapshot saved: %s records from %s tables', v_total_records, array_length(v_tables_processed, 1)),
    'timestamp', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error creating template snapshot: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE,
    'template_id', p_template_id
  );
END;
$$;

-- ============================================================================
-- STEP 3: CREATE RESET_SIMULATION_FOR_NEXT_SESSION_V2 FUNCTION (WITH VITALS FIX)
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_simulation_for_next_session_v2(p_simulation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id UUID;
  v_tenant_id UUID;
  v_snapshot JSONB;
  v_table_name TEXT;
  v_record JSONB;
  v_total_cleared INTEGER := 0;
  v_total_restored INTEGER := 0;
  v_count INTEGER;
  v_stats JSONB := '{}';
  
  -- For vitals cyclical distribution
  v_simulation_patients UUID[];
BEGIN
  RAISE NOTICE '🚀 Starting smart session reset for simulation %', p_simulation_id;

  -- Get simulation metadata (use LIMIT 1 to handle potential duplicates)
  SELECT template_id, tenant_id INTO v_template_id, v_tenant_id
  FROM simulation_active
  WHERE id = p_simulation_id
  LIMIT 1;

  IF v_template_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Simulation not found or no template associated'
    );
  END IF;

  RAISE NOTICE '📋 Found template: % for tenant: %', v_template_id, v_tenant_id;

  -- Get the template snapshot (handle potential duplicates)
  SELECT jsonb_object_agg(table_name, records) INTO v_snapshot
  FROM (
    SELECT 
      table_name,
      jsonb_agg(data ORDER BY created_at) as records
    FROM simulation_template_snapshots
    WHERE template_id = v_template_id
    GROUP BY table_name
  ) grouped_records;

  IF v_snapshot IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No template snapshot found'
    );
  END IF;

  RAISE NOTICE '📊 Template snapshot contains % tables', jsonb_object_keys(v_snapshot);

  -- SMART CLEANUP: Clear everything except medications (preserve medication IDs for barcodes)
  FOR v_table_name IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name LIKE 'patient_%'
      AND table_name NOT IN ('patient_medications')
  LOOP
    -- Skip if table doesn't have tenant_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = v_table_name AND column_name = 'tenant_id') THEN
      CONTINUE;
    END IF;
    
    -- Clear tenant data
    EXECUTE format('DELETE FROM %I WHERE tenant_id = $1', v_table_name) USING v_tenant_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total_cleared := v_total_cleared + v_count;
    
    RAISE NOTICE '🗑️ Cleared % records from %', v_count, v_table_name;
  END LOOP;

  -- SMART RESTORATION: Restore all data from template snapshot
  IF v_snapshot IS NOT NULL THEN
    FOR v_table_name IN SELECT jsonb_object_keys(v_snapshot)
    LOOP
      RAISE NOTICE '📦 Restoring template records for %', v_table_name;
      
      -- Special handling for patient_vitals - distribute across simulation patients
      IF v_table_name = 'patient_vitals' THEN
        DECLARE
          v_vitals_counter integer := 0;
          v_patient_index integer;
          v_simulation_patient_uuid uuid;
        BEGIN
          -- Get all simulation patients in order
          SELECT array_agg(p.id ORDER BY p.created_at, p.id) INTO v_simulation_patients
          FROM patients p
          WHERE p.tenant_id = v_tenant_id;
          
          RAISE NOTICE '🩺 Processing % vitals records for % simulation patients', 
                       jsonb_array_length(v_snapshot->v_table_name), 
                       COALESCE(array_length(v_simulation_patients, 1), 0);
          
          -- Skip if no patients in simulation
          IF v_simulation_patients IS NULL OR array_length(v_simulation_patients, 1) = 0 THEN
            RAISE NOTICE '⚠️ No patients in simulation tenant - skipping vitals';
            CONTINUE;
          END IF;
          
          -- Process each vitals record and distribute across patients
          FOR v_record IN SELECT * FROM jsonb_array_elements(v_snapshot->v_table_name)
          LOOP
            v_vitals_counter := v_vitals_counter + 1;
            v_patient_index := ((v_vitals_counter - 1) % array_length(v_simulation_patients, 1)) + 1;
            v_simulation_patient_uuid := v_simulation_patients[v_patient_index];
            
            -- Insert vitals using explicit field mapping (like duplicate_patient_to_tenant)
            BEGIN
              INSERT INTO patient_vitals (
                patient_id,
                tenant_id,
                temperature,
                blood_pressure_systolic,
                blood_pressure_diastolic,
                heart_rate,
                respiratory_rate,
                oxygen_saturation,
                oxygen_delivery,
                recorded_at
              ) VALUES (
                v_simulation_patient_uuid,
                v_tenant_id,
                (v_record->>'temperature')::DECIMAL,
                (v_record->>'blood_pressure_systolic')::INTEGER,
                (v_record->>'blood_pressure_diastolic')::INTEGER,
                (v_record->>'heart_rate')::INTEGER,
                (v_record->>'respiratory_rate')::INTEGER,
                (v_record->>'oxygen_saturation')::INTEGER,
                v_record->>'oxygen_delivery',
                COALESCE((v_record->>'recorded_at')::TIMESTAMPTZ, NOW())
              );
              
              v_total_restored := v_total_restored + 1;
            EXCEPTION WHEN OTHERS THEN
              RAISE NOTICE '❌ VITALS INSERT FAILED: % - SQLSTATE: % - Record: %', SQLERRM, SQLSTATE, v_record;
            END;
          END LOOP;
          
          RAISE NOTICE '  ✅ Restored % vitals records across % patients', v_vitals_counter, array_length(v_simulation_patients, 1);
        END;
      ELSE
        -- Regular restore for other tables (record by record)
        FOR v_record IN SELECT * FROM jsonb_array_elements(v_snapshot->v_table_name)
        LOOP
          -- Make sure tenant_id is correct
          IF EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = v_table_name AND column_name = 'tenant_id') THEN
            v_record := v_record || jsonb_build_object('tenant_id', v_tenant_id);
          END IF;
          
          -- Dynamically insert record (works with any table schema)
          BEGIN
            -- Regular restore for other tables
            EXECUTE format('
              INSERT INTO %I 
              SELECT * FROM jsonb_populate_record(null::%I, $1)
            ', v_table_name, v_table_name)
            USING v_record;
            
            v_total_restored := v_total_restored + 1;
          EXCEPTION WHEN OTHERS THEN
            -- Log but continue (some records may conflict)
            RAISE NOTICE '❌ INSERT FAILED in %: % - SQLSTATE: %', v_table_name, SQLERRM, SQLSTATE;
          END;
        END LOOP;
      END IF;
      
      RAISE NOTICE '  📦 Processed template records for %', v_table_name;
    END LOOP;
  END IF;
  
  -- Count preserved medications and restored data
  SELECT count(*) INTO v_count FROM patient_medications WHERE tenant_id = v_tenant_id;
  v_stats := v_stats || jsonb_build_object('medications_preserved', v_count);
  RAISE NOTICE '💊 Preserved % medications (IDs unchanged)', v_count;
  
  -- Count vitals (handle both tenant_id and patient_id cases)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patient_vitals' AND column_name = 'tenant_id') THEN
    -- patient_vitals has tenant_id - direct count
    SELECT count(*) INTO v_count FROM patient_vitals WHERE tenant_id = v_tenant_id;
    v_stats := v_stats || jsonb_build_object('vitals_restored', v_count);
    RAISE NOTICE '📊 Restored % vitals (direct tenant_id)', v_count;
  ELSE
    -- patient_vitals only has patient_id - count via patient join
    SELECT count(*) INTO v_count 
    FROM patient_vitals pv 
    JOIN patients p ON p.id = pv.patient_id 
    WHERE p.tenant_id = v_tenant_id;
    v_stats := v_stats || jsonb_build_object('vitals_restored', v_count);
    RAISE NOTICE '📊 Restored % vitals (via patient join)', v_count;
  END IF;
  
  -- Update simulation metadata
  UPDATE simulation_active
  SET
    session_number = COALESCE(session_number, 0) + 1,
    last_reset_at = now(),
    reset_count = COALESCE(reset_count, 0) + 1,
    updated_at = now()
  WHERE id = p_simulation_id;

  RAISE NOTICE '🎉 Smart session reset complete!';
  
  RETURN jsonb_build_object(
    'success', true,
    'simulation_id', p_simulation_id,
    'tenant_id', v_tenant_id,
    'reset_type', 'smart_session_reset_v2',
    'total_cleared', v_total_cleared,
    'total_restored', v_total_restored,
    'stats', v_stats,
    'message', 'Smart reset complete. Medications preserved, all other data restored to snapshot state.',
    'timestamp', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error during smart reset: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE,
    'simulation_id', p_simulation_id
  );
END;
$$;

-- ============================================================================
-- STEP 4: GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION save_template_snapshot_v2(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_simulation_for_next_session_v2(UUID) TO authenticated;

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================
-- 
-- This deployment includes:
-- 1. simulation_template_snapshots table with RLS policies
-- 2. save_template_snapshot_v2 function for creating snapshots
-- 3. reset_simulation_for_next_session_v2 function with vitals fix
-- 4. All necessary permissions
-- 
-- After deployment:
-- 1. Create a new template snapshot
-- 2. Test simulation reset - vitals should now restore properly!
-- ============================================================================