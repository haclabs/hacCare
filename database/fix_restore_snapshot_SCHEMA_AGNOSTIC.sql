-- =====================================================
-- SCHEMA-AGNOSTIC RESTORE TO MATCH save_template_snapshot_v2
-- =====================================================
-- This dynamically restores whatever columns exist in each table,
-- matching the dynamic snapshot function that auto-discovers schema

DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP FUNCTION IF EXISTS ' || oid::regprocedure || ' CASCADE;', ' ')
    FROM pg_proc 
    WHERE proname = 'restore_snapshot_to_tenant'
  );
END $$;

CREATE OR REPLACE FUNCTION restore_snapshot_to_tenant(
  p_tenant_id uuid,
  p_snapshot jsonb,
  p_id_mappings jsonb DEFAULT NULL,
  p_barcode_mappings jsonb DEFAULT NULL,
  p_preserve_barcodes boolean DEFAULT false,
  p_skip_patients boolean DEFAULT false
)
RETURNS json AS $$
DECLARE
  v_table_name text;
  v_table_data jsonb;
  v_record jsonb;
  v_patient_mapping jsonb := '{}'::jsonb;
  v_id_mapping jsonb := '{}'::jsonb;  -- Track ALL id mappings for foreign keys
  v_old_patient_id uuid;
  v_new_patient_id uuid;
  v_old_id uuid;
  v_new_id uuid;
  v_count integer;
  v_total_records integer := 0;
  v_columns text[];
  v_placeholders text[];
  v_values text[];
  v_sql text;
  v_col record;
  i integer;
  v_array_elements text;
  v_column_type text;
  v_udt_name text;
BEGIN
  RAISE NOTICE '🔄 Schema-agnostic restore to tenant % (skip_patients=%)', p_tenant_id, p_skip_patients;
  
  -- If we're skipping patients but p_id_mappings provided, use those as patient mapping
  IF p_skip_patients AND p_id_mappings IS NOT NULL THEN
    v_patient_mapping := p_id_mappings;
    v_id_mapping := p_id_mappings;
    RAISE NOTICE '📋 Using existing patient IDs from mapping: %', jsonb_pretty(v_patient_mapping);
  END IF;
  
  -- =====================================================
  -- STEP 1: Restore PATIENTS first to build ID mapping (unless skipping)
  -- =====================================================
  IF p_snapshot ? 'patients' AND NOT p_skip_patients THEN
    RAISE NOTICE '👤 Restoring patients...';
    v_count := 0;
    
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patients')
    LOOP
      v_old_patient_id := (v_record->>'id')::uuid;
      v_new_patient_id := gen_random_uuid();
      
      -- Dynamically build INSERT based on what columns exist in the snapshot
      v_columns := ARRAY[]::text[];
      v_values := ARRAY[]::text[];
      
      -- Always set tenant_id to target tenant
      v_columns := array_append(v_columns, 'tenant_id');
      v_values := array_append(v_values, quote_literal(p_tenant_id));
      
      -- Map old id to new id
      v_columns := array_append(v_columns, 'id');
      v_values := array_append(v_values, quote_literal(v_new_patient_id));
      
      -- Handle patient_id barcode: preserve if requested, otherwise generate new
      v_columns := array_append(v_columns, 'patient_id');
      IF p_preserve_barcodes AND p_barcode_mappings ? v_new_patient_id::text THEN
        -- Use existing barcode from the mapping
        v_values := array_append(v_values, quote_literal(p_barcode_mappings->>v_new_patient_id::text));
        RAISE NOTICE '💾 Preserving barcode for patient %: %', v_new_patient_id, p_barcode_mappings->>v_new_patient_id::text;
      ELSE
        -- Generate NEW patient_id barcode for launch
        v_values := array_append(v_values, quote_literal('P' || floor(random() * 90000 + 10000)::text));
      END IF;
      
      -- Copy all other fields from snapshot (SKIP patient_id)
      FOR v_col IN 
        SELECT key, value 
        FROM jsonb_each(v_record)
        WHERE key NOT IN ('id', 'tenant_id', 'patient_id', 'created_at', 'updated_at')
      LOOP
        v_columns := array_append(v_columns, quote_ident(v_col.key));
        
        -- Handle arrays (like allergies) specially
        IF jsonb_typeof(v_col.value) = 'array' THEN
          v_values := array_append(v_values, 'ARRAY[' || 
            (SELECT string_agg(quote_literal(elem), ',') 
             FROM jsonb_array_elements_text(v_col.value) elem) || ']');
        ELSIF v_col.value = 'null'::jsonb THEN
          v_values := array_append(v_values, 'NULL');
        ELSE
          v_values := array_append(v_values, quote_nullable(v_col.value#>>'{}'));
        END IF;
      END LOOP;
      
      -- Execute dynamic INSERT
      v_sql := format('INSERT INTO patients (%s) VALUES (%s)',
        array_to_string(v_columns, ', '),
        array_to_string(v_values, ', ')
      );
      EXECUTE v_sql;
      
      -- Track ID mapping for patients
      v_patient_mapping := v_patient_mapping || jsonb_build_object(v_old_patient_id::text, v_new_patient_id);
      v_id_mapping := v_id_mapping || jsonb_build_object(v_old_patient_id::text, v_new_patient_id);
      v_count := v_count + 1;
    END LOOP;
    
    v_total_records := v_total_records + v_count;
    RAISE NOTICE '✅ Restored % patients', v_count;
  END IF;
  
  -- =====================================================
  -- STEP 2: Restore ALL other tables dynamically (in dependency order)
  -- =====================================================
  -- Process tables in order: avatar_locations first (referenced by devices/wounds)
  FOR v_table_name IN 
    SELECT key as table_name
    FROM jsonb_object_keys(p_snapshot) key
    WHERE key NOT IN ('patients', 'snapshot_metadata')
    ORDER BY 
      CASE key
        WHEN 'avatar_locations' THEN 1  -- First: locations
        WHEN 'devices' THEN 2           -- Second: devices reference locations
        WHEN 'wounds' THEN 2            -- Second: wounds reference locations
        WHEN 'lab_panels' THEN 3        -- Third: panels
        WHEN 'lab_results' THEN 4       -- Fourth: results reference panels
        ELSE 5                          -- Everything else
      END
  LOOP
    v_table_data := p_snapshot->v_table_name;
    
    IF jsonb_array_length(v_table_data) > 0 THEN
      RAISE NOTICE '📦 Restoring % (% records)...', v_table_name, jsonb_array_length(v_table_data);
      v_count := 0;
      
      FOR v_record IN SELECT * FROM jsonb_array_elements(v_table_data)
      LOOP
        v_columns := ARRAY[]::text[];
        v_values := ARRAY[]::text[];
        
        -- Debug devices specifically
        IF v_table_name = 'devices' THEN
          RAISE NOTICE '🔧 Processing device: type=%, location_id=%', 
            v_record->>'type', v_record->>'location_id';
        END IF;
        
        -- Generate NEW id for this record (map old to new)
        v_old_id := (v_record->>'id')::uuid;
        v_new_id := gen_random_uuid();
        v_columns := array_append(v_columns, 'id');
        v_values := array_append(v_values, quote_literal(v_new_id));
        v_id_mapping := v_id_mapping || jsonb_build_object(v_old_id::text, v_new_id);
        
        -- Set tenant_id if column exists
        IF v_record ? 'tenant_id' THEN
          v_columns := array_append(v_columns, 'tenant_id');
          v_values := array_append(v_values, quote_literal(p_tenant_id));
        END IF;
        
        -- Map patient_id if exists
        IF v_record ? 'patient_id' THEN
          v_old_patient_id := (v_record->>'patient_id')::uuid;
          IF v_patient_mapping ? v_old_patient_id::text THEN
            v_new_patient_id := (v_patient_mapping->>v_old_patient_id::text)::uuid;
            v_columns := array_append(v_columns, 'patient_id');
            v_values := array_append(v_values, quote_literal(v_new_patient_id));
          ELSE
            -- Skip if patient mapping not found
            CONTINUE;
          END IF;
        END IF;
        
        -- Copy all other columns, mapping foreign key UUIDs
        FOR v_col IN 
          SELECT key, value 
          FROM jsonb_each(v_record)
          WHERE key NOT IN ('id', 'tenant_id', 'patient_id', 'created_at', 'updated_at')
        LOOP
          v_columns := array_append(v_columns, quote_ident(v_col.key));
          
          -- Check if this is a foreign key UUID that needs mapping (ends with _id and is a valid UUID)
          IF v_col.key LIKE '%_id' AND v_col.value::text ~ '^"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"$' THEN
            v_old_id := (v_col.value#>>'{}')::uuid;
            IF v_id_mapping ? v_old_id::text THEN
              -- Map to new ID
              v_new_id := (v_id_mapping->>v_old_id::text)::uuid;
              v_values := array_append(v_values, quote_literal(v_new_id));
              -- Debug foreign key mapping
              IF v_table_name = 'devices' AND v_col.key = 'location_id' THEN
                RAISE NOTICE '🗺️  Mapped device.location_id: % → %', v_old_id, v_new_id;
              END IF;
            ELSE
              -- Keep original ID (might be reference to system table)
              v_values := array_append(v_values, quote_nullable(v_col.value#>>'{}'));
              IF v_table_name = 'devices' AND v_col.key = 'location_id' THEN
                RAISE WARNING '⚠️  Device location_id % NOT FOUND in mapping!', v_old_id;
              END IF;
            END IF;
          -- Handle different data types
          ELSIF jsonb_typeof(v_col.value) = 'array' THEN
            -- Check if this is an ENUM array first
            SELECT data_type, udt_name
            INTO v_column_type, v_udt_name
            FROM information_schema.columns
            WHERE table_name = v_table_name
            AND column_name = v_col.key
            AND table_schema = 'public';
            
            -- Build array elements
            SELECT string_agg(quote_literal(elem), ',')
            INTO v_array_elements
            FROM jsonb_array_elements_text(v_col.value) elem;
            
            IF v_array_elements IS NULL OR v_array_elements = '' THEN
              -- Empty array - cast to appropriate type
              IF v_column_type = 'ARRAY' AND v_udt_name LIKE '\_%' THEN
                -- ENUM array (udt_name starts with underscore)
                v_values := array_append(v_values, 'ARRAY[]::' || substring(v_udt_name from 2) || '[]');
              ELSE
                -- Regular text array
                v_values := array_append(v_values, 'ARRAY[]::text[]');
              END IF;
            ELSE
              -- Non-empty array - cast to appropriate type
              IF v_column_type = 'ARRAY' AND v_udt_name LIKE '\_%' THEN
                -- ENUM array (udt_name starts with underscore, e.g., _orientation_enum)
                v_values := array_append(v_values, 'ARRAY[' || v_array_elements || ']::' || substring(v_udt_name from 2) || '[]');
                IF v_table_name = 'devices' THEN
                  RAISE NOTICE '📋 Device ENUM array %: [%] cast to %', v_col.key, v_array_elements, substring(v_udt_name from 2) || '[]';
                END IF;
              ELSE
                -- Regular text array
                v_values := array_append(v_values, 'ARRAY[' || v_array_elements || ']');
                IF v_table_name = 'devices' THEN
                  RAISE NOTICE '📋 Device text array %: [%]', v_col.key, v_array_elements;
                END IF;
              END IF;
            END IF;
          ELSIF jsonb_typeof(v_col.value) = 'object' THEN
            -- JSONB objects like admin_times
            v_values := array_append(v_values, quote_literal(v_col.value::text) || '::jsonb');
          ELSIF v_col.value = 'null'::jsonb THEN
            v_values := array_append(v_values, 'NULL');
          ELSE
            -- Check if this column is a USER-DEFINED type (ENUM)
            SELECT data_type, udt_name
            INTO v_column_type, v_udt_name
            FROM information_schema.columns
            WHERE table_name = v_table_name
            AND column_name = v_col.key
            AND table_schema = 'public';
            
            IF v_column_type = 'USER-DEFINED' THEN
              -- Cast to the specific ENUM type
              v_values := array_append(v_values, quote_nullable(v_col.value#>>'{}') || '::' || v_udt_name);
              IF v_table_name = 'devices' THEN
                RAISE NOTICE '🎯 Casting % to ENUM type %', v_col.key, v_udt_name;
              END IF;
            ELSE
              -- Regular text/numeric value
              v_values := array_append(v_values, quote_nullable(v_col.value#>>'{}'));
            END IF;
          END IF;
        END LOOP;
        
        -- Execute dynamic INSERT
        BEGIN
          v_sql := format('INSERT INTO %I (%s) VALUES (%s)',
            v_table_name,
            array_to_string(v_columns, ', '),
            array_to_string(v_values, ', ')
          );
          
          -- Log SQL for devices specifically
          IF v_table_name = 'devices' THEN
            RAISE NOTICE '🔍 Device INSERT SQL: %', v_sql;
          END IF;
          
          EXECUTE v_sql;
          v_count := v_count + 1;
          
          IF v_table_name = 'devices' THEN
            RAISE NOTICE '✅ Device INSERT succeeded!';
          END IF;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '⚠️ Failed to insert into %: % | SQL: %', v_table_name, SQLERRM, v_sql;
          RAISE WARNING '⚠️ Record data: %', v_record::text;
          RAISE WARNING '⚠️ SQLSTATE: %', SQLSTATE;
        END;
      END LOOP;
      
      v_total_records := v_total_records + v_count;
      RAISE NOTICE '✅ Restored % records to %', v_count, v_table_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '🎉 Restore complete: % total records', v_total_records;
  
  RETURN json_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'records_restored', v_total_records,
    'message', 'Schema-agnostic restore completed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION restore_snapshot_to_tenant(uuid, jsonb, jsonb, jsonb, boolean, boolean) TO authenticated;

COMMENT ON FUNCTION restore_snapshot_to_tenant IS 
'Schema-agnostic restore function that dynamically restores whatever columns exist in the snapshot.
Matches save_template_snapshot_v2 dynamic schema discovery.
Set p_skip_patients=true for reset mode to use existing patients and only restore baseline data.';
