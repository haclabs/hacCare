-- Adds INR to the lab result catalog so it can be entered as a result.
-- It was already orderable ("INR / PT / PTT (Coagulation Studies)" in labOrders.ts)
-- but had no lab_result_refs row. Filed under chemistry because lab_category has no
-- coagulation value. INR is a unitless ratio, so units is NULL.

INSERT INTO lab_result_refs
  (test_code, category, test_name, units, ref_low, ref_high, ref_operator, critical_low, critical_high, display_order)
VALUES
  ('INR', 'chemistry', 'INR (International Normalized Ratio)', NULL, 0.8, 1.2, 'between', NULL, NULL, 39)
ON CONFLICT (test_code) DO NOTHING;
