-- Applied to hacCare Canada (ydmbinljlpzcbleupjaa) on 2026-10-18.
-- Corrects the brand-name misspelling "Ademelog" -> "Admelog" in the catalog, the Code Blue templates
-- (live tenants + snapshots), their pending simulation and the Sandy Tallman patient template, all in step
-- so template-update resets (which match meds by name and orders by order_text) still line up.
-- simulation_history is deliberately left as recorded.
BEGIN;

UPDATE medications_catalog SET name = replace(name, 'Ademelog', 'Admelog') WHERE name LIKE '%Ademelog%';
UPDATE patient_medications SET name = replace(name, 'Ademelog', 'Admelog') WHERE name LIKE '%Ademelog%';
UPDATE doctors_orders SET order_text = replace(order_text, 'Ademelog', 'Admelog') WHERE order_text LIKE '%Ademelog%';
UPDATE patient_system_assessments SET assessment_data = replace(assessment_data::text, 'Ademelog', 'Admelog')::jsonb
  WHERE assessment_data::text LIKE '%Ademelog%';
UPDATE simulation_templates SET snapshot_data = replace(snapshot_data::text, 'Ademelog', 'Admelog')::jsonb
  WHERE snapshot_data::text LIKE '%Ademelog%';
UPDATE patient_templates SET snapshot_data = replace(snapshot_data::text, 'Ademelog', 'Admelog')::jsonb
  WHERE snapshot_data::text LIKE '%Ademelog%';

COMMIT;
