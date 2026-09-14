-- One-time cleanup: a "GLU" lab result (485 mg/dL, ref 70-110) was entered in
-- US/imperial units on the "Maria Alvarez — DKA" patient template back in
-- August. hacCare's lab reference data otherwise standardizes on Canadian
-- metric units (test_code GLUCOSE, mmol/L, ref 3.5-7.8, critical_high 20 —
-- see lab_result_refs). This stale imperial entry was captured into the
-- template/state snapshots and propagated to live lab_results rows in every
-- tenant that launched/reset from those templates.
--
-- Converts value using the standard mg/dL -> mmol/L factor (÷18.0182) and
-- aligns test_code/name/ranges with the existing GLUCOSE reference so the
-- result displays and flags consistently with the rest of the app.
-- 485 mg/dL -> 26.9 mmol/L (still correctly flagged critical_high, consistent
-- with a DKA teaching scenario).
--
-- Safe to re-run: WHERE clauses only match rows still carrying the stale
-- test_code/units combination.

-- Preview affected rows first
SELECT id, tenant_id, patient_id, value, units FROM lab_results
WHERE test_code = 'GLU' AND units = 'mg/dL';

SELECT id, name FROM simulation_templates
WHERE snapshot_data->'lab_results' @> '[{"test_code":"GLU"}]';

SELECT id, name FROM patient_templates
WHERE snapshot_data->'lab_results' @> '[{"test_code":"GLU"}]';

SELECT id FROM simulation_template_states
WHERE snapshot_data->'lab_results' @> '[{"test_code":"GLU"}]';

-- Live lab result rows
UPDATE lab_results
SET test_code = 'GLUCOSE',
    test_name = 'Glucose random',
    value = 26.9,
    units = 'mmol/L',
    ref_low = 3.5,
    ref_high = 7.8,
    ref_operator = 'between',
    critical_low = 2.5,
    critical_high = 20,
    flag = 'critical_high'
WHERE test_code = 'GLU' AND units = 'mg/dL'
RETURNING id, tenant_id, patient_id;

-- Simulation template snapshots
UPDATE simulation_templates
SET snapshot_data = jsonb_set(
  snapshot_data,
  '{lab_results}',
  (
    SELECT jsonb_agg(
      CASE WHEN elem->>'test_code' = 'GLU' AND elem->>'units' = 'mg/dL'
        THEN elem || jsonb_build_object(
          'test_code', 'GLUCOSE',
          'test_name', 'Glucose random',
          'value', 26.9,
          'units', 'mmol/L',
          'ref_low', 3.5,
          'ref_high', 7.8,
          'ref_operator', 'between',
          'critical_low', 2.5,
          'critical_high', 20,
          'flag', 'critical_high'
        )
        ELSE elem
      END
    )
    FROM jsonb_array_elements(snapshot_data->'lab_results') elem
  )
)
WHERE snapshot_data->'lab_results' @> '[{"test_code":"GLU"}]'
RETURNING id, name;

-- Patient template snapshots
UPDATE patient_templates
SET snapshot_data = jsonb_set(
  snapshot_data,
  '{lab_results}',
  (
    SELECT jsonb_agg(
      CASE WHEN elem->>'test_code' = 'GLU' AND elem->>'units' = 'mg/dL'
        THEN elem || jsonb_build_object(
          'test_code', 'GLUCOSE',
          'test_name', 'Glucose random',
          'value', 26.9,
          'units', 'mmol/L',
          'ref_low', 3.5,
          'ref_high', 7.8,
          'ref_operator', 'between',
          'critical_low', 2.5,
          'critical_high', 20,
          'flag', 'critical_high'
        )
        ELSE elem
      END
    )
    FROM jsonb_array_elements(snapshot_data->'lab_results') elem
  )
)
WHERE snapshot_data->'lab_results' @> '[{"test_code":"GLU"}]'
RETURNING id, name;

-- Named simulation template states (e.g. "Week 1" resettable snapshots)
UPDATE simulation_template_states
SET snapshot_data = jsonb_set(
  snapshot_data,
  '{lab_results}',
  (
    SELECT jsonb_agg(
      CASE WHEN elem->>'test_code' = 'GLU' AND elem->>'units' = 'mg/dL'
        THEN elem || jsonb_build_object(
          'test_code', 'GLUCOSE',
          'test_name', 'Glucose random',
          'value', 26.9,
          'units', 'mmol/L',
          'ref_low', 3.5,
          'ref_high', 7.8,
          'ref_operator', 'between',
          'critical_low', 2.5,
          'critical_high', 20,
          'flag', 'critical_high'
        )
        ELSE elem
      END
    )
    FROM jsonb_array_elements(snapshot_data->'lab_results') elem
  )
)
WHERE snapshot_data->'lab_results' @> '[{"test_code":"GLU"}]'
RETURNING id;
