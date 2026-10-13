-- Adds coagulation tests to the lab result catalog so they can be entered as results.
-- They were already orderable ("INR / PT / PTT (Coagulation Studies)" in labOrders.ts)
-- but had no lab_result_refs rows. Filed under chemistry because lab_category has no
-- coagulation value. INR is a unitless ratio, so its units is NULL.

INSERT INTO lab_result_refs
  (test_code, category, test_name, units, ref_low, ref_high, ref_operator, critical_low, critical_high, display_order)
VALUES
  ('INR', 'chemistry', 'PT/INR', NULL, 0.8, 1.2, 'between', NULL, 4.5, 39),
  ('PTT', 'chemistry', 'PTT (Partial Thromboplastin Time)', 's', 26, 40, 'between', NULL, NULL, 40)
ON CONFLICT (test_code) DO NOTHING;
