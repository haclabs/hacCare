-- Migration: Prevent duplicate-key crash in restore_snapshot_to_tenant for
-- singleton-per-patient tables (patient_advanced_directives, patient_admission_records)
-- Date: 2026-08-18
--
-- Bug: restore_snapshot_to_tenant's generic per-table restore loop has a
-- fallback mapping path (used when a snapshot row's patient_id isn't found
-- in v_patient_mapping): if the template has exactly 1 patient and the
-- simulation tenant also has exactly 1 patient, it force-maps the orphaned
-- row onto that single patient. If the snapshot happens to contain more
-- than one row for a table that has a UNIQUE(patient_id) constraint
-- (patient_advanced_directives, patient_admission_records — one row per
-- patient by design), the second INSERT fails with:
--
--   duplicate key value violates unique constraint
--   "patient_advanced_directives_patient_id_key"
--
-- This was being swallowed by the existing EXCEPTION WHEN OTHERS handler
-- (surfaced only as a RAISE WARNING), silently dropping the record instead
-- of crashing — but it still means restore is noisy and non-deterministic
-- about which row "wins".
--
-- Fix: dynamically detect whether the target table has a single-column
-- UNIQUE constraint on patient_id and, if so, append
-- ON CONFLICT (patient_id) DO NOTHING to the generated INSERT so restore
-- is idempotent for these tables instead of erroring.

CREATE OR REPLACE FUNCTION public.restore_snapshot_to_tenant(p_tenant_id uuid, p_snapshot jsonb, p_id_mappings jsonb DEFAULT NULL::jsonb, p_barcode_mappings jsonb DEFAULT NULL::jsonb, p_preserve_barcodes boolean DEFAULT false, p_skip_patients boolean DEFAULT false) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_table_name text;
  v_actual_table_name text;
  v_table_data jsonb;
  v_record jsonb;
  v_patient_mapping jsonb := '{}'::jsonb;
  v_id_mapping jsonb := '{}'::jsonb;
  v_old_patient_id uuid;
  v_new_patient_id uuid;
  v_old_id uuid;
  v_new_id uuid;
  v_count integer;
  v_count_check integer;
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
  v_mapped_count integer;
  v_has_patient_id_unique boolean;
BEGIN
  RAISE NOTICE '🔄 Schema-agnostic restore to tenant % (skip_patients=%, preserve_barcodes=%)', 
    p_tenant_id, p_skip_patients, p_preserve_barcodes;
  
  -- =====================================================
  -- STEP 1: Build patient mapping
  -- =====================================================
  
  IF p_preserve_barcodes AND p_snapshot ? 'patients' THEN
    RAISE NOTICE '💾 Preserving patient barcodes - mapping by demographics (first/last/dob)';
    v_mapped_count := 0;
    
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patients')
    LOOP
      v_old_patient_id := (v_record->>'id')::uuid;
      
      -- Match by demographics – the only stable cross-tenant identifier.
      -- DO NOT use created_at ORDER + OFFSET: simulation patients all share
      -- the same created_at (inserted in one transaction), making OFFSET
      -- non-deterministic and causing cross-patient data mapping.
      SELECT id INTO v_new_patient_id
      FROM patients
      WHERE tenant_id = p_tenant_id
        AND first_name = v_record->>'first_name'
        AND last_name  = v_record->>'last_name'
        AND date_of_birth = (v_record->>'date_of_birth')::date;
      
      IF v_new_patient_id IS NULL THEN
        RAISE EXCEPTION 'Cannot map snapshot patient % % (DOB: %) — no matching patient found in simulation tenant %',
          v_record->>'first_name', v_record->>'last_name', v_record->>'date_of_birth', p_tenant_id;
      END IF;
      
      v_patient_mapping := v_patient_mapping || jsonb_build_object(v_old_patient_id::text, v_new_patient_id);
      v_id_mapping := v_id_mapping || jsonb_build_object(v_old_patient_id::text, v_new_patient_id);
      
      RAISE NOTICE '💾 Mapped snapshot patient % (% %) → existing patient % (barcode preserved)', 
        v_old_patient_id, v_record->>'first_name', v_record->>'last_name', v_new_patient_id;
      v_mapped_count := v_mapped_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Mapped % patients by demographics', v_mapped_count;
    
  ELSIF p_skip_patients AND p_id_mappings IS NOT NULL THEN
    v_patient_mapping := p_id_mappings;
    v_id_mapping := p_id_mappings;
    RAISE NOTICE '📋 Using existing patient IDs from mapping: %', jsonb_pretty(v_patient_mapping);
    
  ELSIF p_snapshot ? 'patients' THEN
    RAISE NOTICE '👤 Creating new patients...';
    v_count := 0;
    
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patients')
    LOOP
      v_old_patient_id := (v_record->>'id')::uuid;
      v_new_patient_id := gen_random_uuid();
      
      v_columns := ARRAY[]::text[];
      v_values := ARRAY[]::text[];
      
      v_columns := array_append(v_columns, 'tenant_id');
      v_values := array_append(v_values, quote_literal(p_tenant_id));
      
      v_columns := array_append(v_columns, 'id');
      v_values := array_append(v_values, quote_literal(v_new_patient_id));
      
      v_columns := array_append(v_columns, 'patient_id');
      IF p_preserve_barcodes AND p_barcode_mappings ? v_new_patient_id::text THEN
        v_values := array_append(v_values, quote_literal(p_barcode_mappings->>v_new_patient_id::text));
        RAISE NOTICE '💾 Preserving barcode for patient %: %', 
          v_new_patient_id, p_barcode_mappings->>v_new_patient_id::text;
      ELSE
        v_values := array_append(v_values, quote_literal('P' || floor(random() * 90000 + 10000)::text));
      END IF;
      
      FOR v_col IN 
        SELECT key, value 
        FROM jsonb_each(v_record)
        WHERE key NOT IN ('id', 'tenant_id', 'patient_id', 'created_at', 'updated_at')
      LOOP
        SELECT COUNT(*) INTO v_count_check
        FROM information_schema.columns
        WHERE table_name = 'patients'
        AND column_name = v_col.key
        AND table_schema = 'public';
        
        IF v_count_check = 0 THEN
          RAISE NOTICE '⚠️  Skipping patient column % - does not exist in patients table', v_col.key;
          CONTINUE;
        END IF;
        
        v_columns := array_append(v_columns, quote_ident(v_col.key));
        
        -- Handle empty arrays correctly
        IF jsonb_typeof(v_col.value) = 'array' THEN
          SELECT string_agg(quote_literal(elem), ',')
          INTO v_array_elements
          FROM jsonb_array_elements_text(v_col.value) elem;
          
          IF v_array_elements IS NULL OR v_array_elements = '' THEN
            -- Empty array - add ARRAY[]::text[]
            v_values := array_append(v_values, 'ARRAY[]::text[]');
          ELSE
            -- Non-empty array
            v_values := array_append(v_values, 'ARRAY[' || v_array_elements || ']');
          END IF;
        ELSIF v_col.value = 'null'::jsonb THEN
          v_values := array_append(v_values, 'NULL');
        ELSE
          v_values := array_append(v_values, quote_nullable(v_col.value#>>'{}'));
        END IF;
      END LOOP;
      
      v_sql := format('INSERT INTO patients (%s) VALUES (%s)',
        array_to_string(v_columns, ', '),
        array_to_string(v_values, ', ')
      );
      EXECUTE v_sql;
      
      v_patient_mapping := v_patient_mapping || jsonb_build_object(v_old_patient_id::text, v_new_patient_id);
      v_id_mapping := v_id_mapping || jsonb_build_object(v_old_patient_id::text, v_new_patient_id);
      v_count := v_count + 1;
    END LOOP;
    
    v_total_records := v_total_records + v_count;
    RAISE NOTICE '✅ Restored % patients', v_count;
  END IF;
  
  -- =====================================================
  -- STEP 2: Restore ALL other tables dynamically
  -- =====================================================
  FOR v_table_name IN 
    SELECT key as table_name
    FROM jsonb_object_keys(p_snapshot) key
    WHERE key NOT IN ('patients', 'snapshot_metadata')
    ORDER BY 
      CASE key
        WHEN 'avatar_locations' THEN 1
        WHEN 'devices' THEN 2
        WHEN 'wounds' THEN 2
        WHEN 'lab_panels' THEN 3
        WHEN 'lab_results' THEN 4
        ELSE 5
      END
  LOOP
    v_table_data := p_snapshot->v_table_name;
    
    v_actual_table_name := CASE 
      WHEN v_table_name = 'medications' THEN 'patient_medications'
      ELSE v_table_name
    END;
    
    IF jsonb_array_length(v_table_data) > 0 THEN
      RAISE NOTICE '📦 Restoring % (% records)...', v_table_name, jsonb_array_length(v_table_data);
      v_count := 0;
      
      -- Detect tables that only ever allow one row per patient (e.g.
      -- patient_advanced_directives, patient_admission_records) so the
      -- INSERT below can be made idempotent via ON CONFLICT instead of
      -- erroring when a snapshot's fallback mapping assigns two rows to
      -- the same patient.
      SELECT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = v_actual_table_name
          AND c.contype = 'u'
          AND array_length(c.conkey, 1) = 1
          AND c.conkey = ARRAY[(
            SELECT a.attnum FROM pg_attribute a
            WHERE a.attrelid = t.oid AND a.attname = 'patient_id'
          )]
      ) INTO v_has_patient_id_unique;
      
      FOR v_record IN SELECT * FROM jsonb_array_elements(v_table_data)
      LOOP
        v_columns := ARRAY[]::text[];
        v_values := ARRAY[]::text[];
        
        IF v_table_name = 'devices' THEN
          RAISE NOTICE '🔧 Processing device: type=%, location_id=%', 
            v_record->>'type', v_record->>'location_id';
        END IF;
        
        v_old_id := (v_record->>'id')::uuid;
        v_new_id := gen_random_uuid();
        v_columns := array_append(v_columns, 'id');
        v_values := array_append(v_values, quote_literal(v_new_id));
        v_id_mapping := v_id_mapping || jsonb_build_object(v_old_id::text, v_new_id);
        
        IF v_record ? 'tenant_id' THEN
          v_columns := array_append(v_columns, 'tenant_id');
          v_values := array_append(v_values, quote_literal(p_tenant_id));
        END IF;
        
        IF v_record ? 'patient_id' THEN
          v_old_patient_id := (v_record->>'patient_id')::uuid;
          
          IF v_patient_mapping ? v_old_patient_id::text THEN
            v_new_patient_id := (v_patient_mapping->>v_old_patient_id::text)::uuid;
            v_columns := array_append(v_columns, 'patient_id');
            v_values := array_append(v_values, quote_literal(v_new_patient_id));
          ELSE
            DECLARE
              v_target_patient_id uuid;
              v_patients_in_template integer;
              v_patients_in_simulation integer;
            BEGIN
              SELECT jsonb_array_length(p_snapshot->'patients') INTO v_patients_in_template;
              SELECT COUNT(*) INTO v_patients_in_simulation 
              FROM patients WHERE tenant_id = p_tenant_id;
              
              IF v_patients_in_template = 1 AND v_patients_in_simulation = 1 THEN
                SELECT id INTO v_target_patient_id
                FROM patients
                WHERE tenant_id = p_tenant_id
                LIMIT 1;
                
                IF v_target_patient_id IS NOT NULL THEN
                  v_columns := array_append(v_columns, 'patient_id');
                  v_values := array_append(v_values, quote_literal(v_target_patient_id));
                ELSE
                  RAISE WARNING '⚠️ [%] No patient found in simulation tenant', v_table_name;
                  CONTINUE;
                END IF;
              ELSE
                RAISE WARNING '⚠️ [%] Skipping - template has % patients, simulation has %', 
                  v_table_name, v_patients_in_template, v_patients_in_simulation;
                CONTINUE;
              END IF;
            END;
          END IF;
        END IF;
        
        -- Copy all other columns, mapping foreign key UUIDs
        FOR v_col IN 
          SELECT key, value 
          FROM jsonb_each(v_record)
          WHERE key NOT IN ('id', 'tenant_id', 'patient_id', 'created_at', 'updated_at')
        LOOP
          -- Check if column exists in target table
          SELECT COUNT(*) INTO v_count
          FROM information_schema.columns
          WHERE table_name = v_actual_table_name
          AND column_name = v_col.key
          AND table_schema = 'public';
          
          IF v_count = 0 THEN
            -- Column doesn't exist - skip with notice
            RAISE NOTICE '⚠️  Skipping column % - does not exist in %', v_col.key, v_actual_table_name;
            CONTINUE;
          END IF;
          
          v_columns := array_append(v_columns, quote_ident(v_col.key));
          
          IF v_col.key LIKE '%_id' AND v_col.value::text ~ '^"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"$' THEN
            v_old_id := (v_col.value#>>'{}')::uuid;
            IF v_id_mapping ? v_old_id::text THEN
              v_new_id := (v_id_mapping->>v_old_id::text)::uuid;
              v_values := array_append(v_values, quote_literal(v_new_id));
              IF v_table_name = 'devices' AND v_col.key = 'location_id' THEN
                RAISE NOTICE '🗺️  Mapped device.location_id: % → %', v_old_id, v_new_id;
              END IF;
            ELSE
              v_values := array_append(v_values, quote_nullable(v_col.value#>>'{}'));
              IF v_table_name = 'devices' AND v_col.key = 'location_id' THEN
                RAISE WARNING '⚠️  Device location_id % NOT FOUND in mapping!', v_old_id;
              END IF;
            END IF;
          ELSIF jsonb_typeof(v_col.value) = 'array' THEN
            SELECT data_type, udt_name
            INTO v_column_type, v_udt_name
            FROM information_schema.columns
            WHERE table_name = v_actual_table_name
            AND column_name = v_col.key
            AND table_schema = 'public';
            
            IF v_column_type = 'jsonb' THEN
              v_values := array_append(v_values, quote_literal(v_col.value::text) || '::jsonb');
            ELSE
              SELECT string_agg(quote_literal(elem), ',')
              INTO v_array_elements
              FROM jsonb_array_elements_text(v_col.value) elem;
              
              -- Handle empty arrays correctly
              IF v_array_elements IS NULL OR v_array_elements = '' THEN
                IF v_column_type = 'ARRAY' AND v_udt_name LIKE '\_%' THEN
                  v_values := array_append(v_values, 'ARRAY[]::' || substring(v_udt_name from 2) || '[]');
                ELSE
                  v_values := array_append(v_values, 'ARRAY[]::text[]');
                END IF;
              ELSE
                IF v_column_type = 'ARRAY' AND v_udt_name LIKE '\_%' THEN
                  v_values := array_append(v_values, 'ARRAY[' || v_array_elements || ']::' || substring(v_udt_name from 2) || '[]');
                  IF v_table_name = 'devices' THEN
                    RAISE NOTICE '📋 Device ENUM array %: [%] cast to %', v_col.key, v_array_elements, substring(v_udt_name from 2) || '[]';
                  END IF;
                ELSE
                  v_values := array_append(v_values, 'ARRAY[' || v_array_elements || ']');
                  IF v_table_name = 'devices' THEN
                    RAISE NOTICE '📋 Device text array %: [%]', v_col.key, v_array_elements;
                  END IF;
                END IF;
              END IF;
            END IF;
          ELSIF jsonb_typeof(v_col.value) = 'object' THEN
            v_values := array_append(v_values, quote_literal(v_col.value::text) || '::jsonb');
          ELSIF v_col.value = 'null'::jsonb THEN
            v_values := array_append(v_values, 'NULL');
          ELSE
            SELECT data_type, udt_name
            INTO v_column_type, v_udt_name
            FROM information_schema.columns
            WHERE table_name = v_actual_table_name
            AND column_name = v_col.key
            AND table_schema = 'public';
            
            IF v_column_type = 'USER-DEFINED' THEN
              v_values := array_append(v_values, quote_nullable(v_col.value#>>'{}') || '::' || v_udt_name);
              IF v_table_name = 'devices' THEN
                RAISE NOTICE '🎯 Casting % to ENUM type %', v_col.key, v_udt_name;
              END IF;
            ELSE
              v_values := array_append(v_values, quote_nullable(v_col.value#>>'{}'));
            END IF;
          END IF;
        END LOOP;
        
        BEGIN
          IF array_length(v_columns, 1) != array_length(v_values, 1) THEN
            RAISE WARNING '❌ Column/Value mismatch in %: % columns, % values', 
              v_actual_table_name, array_length(v_columns, 1), array_length(v_values, 1);
            RAISE WARNING '📋 Columns: %', array_to_string(v_columns, ', ');
            RAISE WARNING '📋 Values: %', array_to_string(v_values, ', ');
            RAISE WARNING '📋 Record: %', v_record::text;
            CONTINUE;
          END IF;
          
          v_sql := format('INSERT INTO %I (%s) VALUES (%s)%s',
            v_actual_table_name,
            array_to_string(v_columns, ', '),
            array_to_string(v_values, ', '),
            CASE WHEN v_has_patient_id_unique THEN ' ON CONFLICT (patient_id) DO NOTHING' ELSE '' END
          );
          
          EXECUTE v_sql;
          v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '⚠️ Failed to insert into %: % | SQL: %', v_actual_table_name, SQLERRM, v_sql;
          RAISE WARNING '⚠️ Record data: %', v_record::text;
          RAISE WARNING '⚠️ SQLSTATE: %', SQLSTATE;
        END;
      END LOOP;
      
      v_total_records := v_total_records + v_count;
      RAISE NOTICE '✅ Restored % records to %', v_count, v_actual_table_name;
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
$_$;

COMMENT ON FUNCTION public.restore_snapshot_to_tenant(p_tenant_id uuid, p_snapshot jsonb, p_id_mappings jsonb, p_barcode_mappings jsonb, p_preserve_barcodes boolean, p_skip_patients boolean) IS
  'Restores snapshot data to a tenant. Fixed 2026-08-18: tables with a UNIQUE(patient_id) constraint (patient_advanced_directives, patient_admission_records) now use ON CONFLICT (patient_id) DO NOTHING to avoid duplicate-key failures when the fallback single-patient mapping assigns more than one snapshot row to the same patient.';
