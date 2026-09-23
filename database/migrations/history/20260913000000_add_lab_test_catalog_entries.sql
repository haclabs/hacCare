-- Adds new lab test reference ranges to lab_result_refs (Canadian SI units).
-- BILIRUBIN_TOTAL/BILIRUBIN_DIRECT already exist — not duplicated here.
-- URINE_KETONES / NEWBORN_SCREEN are categorical: no numeric ref range, so
-- computeLabFlag() (value === null -> 'normal') naturally skips flagging;
-- the result UI stores the selected label in lab_results.comments instead.

INSERT INTO lab_result_refs
  (test_code, category, test_name, units, ref_low, ref_high, ref_operator, critical_low, critical_high, display_order)
VALUES
  ('RETIC', 'hematology', 'Reticulocyte Count', '%', 0.5, 1.5, 'between', NULL, NULL, 14),
  ('CRP', 'chemistry', 'CRP (C-Reactive Protein)', 'mg/L', NULL, 5, '<=', NULL, NULL, 34),
  ('HBA1C', 'chemistry', 'HbA1c (Glycated Hemoglobin)', '%', 4.0, 6.0, 'between', NULL, NULL, 35),
  ('BOHB', 'chemistry', 'Beta-hydroxybutyrate (Blood Ketones)', 'mmol/L', NULL, 0.6, '<=', NULL, 3.0, 36),
  ('URINE_KETONES', 'chemistry', 'Urine Ketones (dipstick)', NULL, NULL, NULL, 'between', NULL, NULL, 37),
  ('NEWBORN_SCREEN', 'chemistry', 'Newborn Screening (Bloodspot)', NULL, NULL, NULL, 'between', NULL, NULL, 38)
ON CONFLICT (test_code) DO NOTHING;
