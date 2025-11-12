-- Seed lab_result_refs with reference ranges from diagnostic sheets
-- Categories: ABG, Hematology, Chemistry

-- ============================================================================
-- ABG (Arterial Blood Gas)
-- ============================================================================

INSERT INTO lab_result_refs (test_code, category, test_name, units, ref_low, ref_high, ref_operator, display_order) VALUES
('PH', 'abg', 'pH', '', 7.35, 7.45, 'between', 1),
('PCO2', 'abg', 'PCO₂', 'mmHg', 35, 45, 'between', 2),
('PO2', 'abg', 'PO₂', 'mmHg', 75, 100, 'between', 3),
('HCO3', 'abg', 'HCO₃', 'mmol/L', 22, 26, 'between', 4),
('SO2', 'abg', 'O₂ Sat (SO₂)', '%', 95, NULL, '>=', 5);

-- ============================================================================
-- HEMATOLOGY
-- ============================================================================

-- Non-sex-specific tests
INSERT INTO lab_result_refs (test_code, category, test_name, units, ref_low, ref_high, ref_operator, display_order) VALUES
('HGBA1C', 'hematology', 'HgbA1C', '%', 4.0, 6.9, 'between', 1),
('MCV', 'hematology', 'MCV', 'fL', 80.0, 97.0, 'between', 6),
('PLT', 'hematology', 'PLT', 'x10⁹/L', 150, 350, 'between', 7),
('WBC', 'hematology', 'WBC', 'x10⁹/L', 3.5, 10, 'between', 8),
('NEUTROPHILS', 'hematology', 'Neutrophils', 'x10⁹/L', 2.0, 7.5, 'between', 9),
('EOSINOPHILS', 'hematology', 'Eosinophils', 'x10⁹/L', 0, 0.5, 'between', 10),
('BASOPHILS', 'hematology', 'Basophils', 'x10⁹/L', 0, 0.1, 'between', 11),
('MONOCYTES', 'hematology', 'Monocytes', 'x10⁹/L', 0.1, 1.0, 'between', 12);

-- Sex-specific hematology tests
INSERT INTO lab_result_refs (test_code, category, test_name, units, ref_operator, sex_ref, display_order) VALUES
('RBC', 'hematology', 'RBC', 'x10¹²/L', 'sex-specific', 
  '{"male": {"low": 4.7, "high": 6.1}, "female": {"low": 4.2, "high": 5.4}}'::jsonb, 2),
('HGB', 'hematology', 'Hgb', 'g/L', 'sex-specific',
  '{"male": {"low": 140, "high": 180}, "female": {"low": 120, "high": 160}}'::jsonb, 3),
('HCT', 'hematology', 'Hct', '', 'sex-specific',
  '{"male": {"low": 0.40, "high": 0.50}, "female": {"low": 0.37, "high": 0.47}}'::jsonb, 5),
('LYMPHOCYTES', 'hematology', 'Lymphocytes', 'x10⁹/L', 'sex-specific',
  '{"male": {"low": 0.8, "high": 3.5}, "female": {"low": 0.8, "high": 3.3}}'::jsonb, 13);

-- ============================================================================
-- CHEMISTRY
-- ============================================================================

-- Standard range tests
INSERT INTO lab_result_refs (test_code, category, test_name, units, ref_low, ref_high, ref_operator, display_order) VALUES
('NA', 'chemistry', 'Na', 'mmol/L', 135, 145, 'between', 1),
('K', 'chemistry', 'K', 'mmol/L', 3.5, 5.0, 'between', 2),
('CL', 'chemistry', 'Cl', 'mmol/L', 97, 107, 'between', 3),
('MG', 'chemistry', 'Mg', 'mmol/L', 0.74, 1.03, 'between', 4),
('PO4', 'chemistry', 'Phosphate PO₄', 'mmol/L', 0.81, 1.58, 'between', 5),
('CA', 'chemistry', 'Ca total', 'mmol/L', 2.12, 2.52, 'between', 6),
('GLUCOSE', 'chemistry', 'Glucose random', 'mmol/L', 3.5, 7.8, 'between', 7),
('CO2', 'chemistry', 'CO₂ (Total)', 'mEq/L', 23, 29, 'between', 8),
('BUN', 'chemistry', 'BUN', 'mmol/L', 2.5, 8, 'between', 9),
('PROTEIN', 'chemistry', 'Protein Total >30y', 'g/L', 65, 78, 'between', 13),
('ALBUMIN', 'chemistry', 'Albumin', 'g/L', 34, 50, 'between', 14),
('PREALBUMIN', 'chemistry', 'Pre-Albumin', 'mg/L', 180, 450, 'between', 15),
('BILIRUBIN_DIRECT', 'chemistry', 'Bilirubin Direct', 'µmol/L', 0.1, 0.3, 'between', 17),
('AST', 'chemistry', 'AST', 'U/L', 8, 20, 'between', 18),
('ALT', 'chemistry', 'ALT', 'U/L', 7, 30, 'between', 19),
('GGT', 'chemistry', 'GGT', 'U/L', 0, 49, 'between', 20),
('ALP', 'chemistry', 'ALP', 'U/L', 38, 150, 'between', 21),
('AMYLASE', 'chemistry', 'Amylase', 'U/L', 50, 180, 'between', 22),
('LIPASE', 'chemistry', 'Lipase', 'U/L', 8, 78, 'between', 23),
('ANION_GAP', 'chemistry', 'Anion Gap', '', 5, 15, 'between', 24),
('CK_MB', 'chemistry', 'CK-MB', 'ng/L', 0, 5, 'between', 26),
('TROPONIN', 'chemistry', 'Troponin', 'ng/L', 0, 0.4, 'between', 27),
('CHOLESTEROL', 'chemistry', 'Cholesterol Total', 'mmol/L', 0, 5.2, 'between', 30),
('LDL', 'chemistry', 'LDL', 'mmol/L', 0, 3.5, 'between', 32),
('TRIGLYCERIDES', 'chemistry', 'Triglycerides', 'mmol/L', 0, 1.7, 'between', 33);

-- Greater-than-or-equal tests
INSERT INTO lab_result_refs (test_code, category, test_name, units, ref_low, ref_operator, display_order) VALUES
('EGFR', 'chemistry', 'eGFR', 'mL/min/1.73m²', 18, '>=', 12);

-- Less-than-or-equal tests
INSERT INTO lab_result_refs (test_code, category, test_name, units, ref_high, ref_operator, display_order) VALUES
('BILIRUBIN_TOTAL', 'chemistry', 'Bilirubin Total', 'µmol/L', 20.4, '<=', 16),
('HS_TNI', 'chemistry', 'Hs-TnI', 'ng/L', 15, '<=', 28),
('BNP', 'chemistry', 'BNP', 'ng/L', 300, '<=', 29);

-- Sex-specific chemistry tests
INSERT INTO lab_result_refs (test_code, category, test_name, units, ref_operator, sex_ref, display_order) VALUES
('CREATININE', 'chemistry', 'Creatinine', 'µmol/L', 'sex-specific',
  '{"male": {"low": 70, "high": 120}, "female": {"low": 50, "high": 90}}'::jsonb, 10),
('CK', 'chemistry', 'CK', 'U/L', 'sex-specific',
  '{"male": {"low": 64, "high": 104}, "female": {"low": 49, "high": 90}}'::jsonb, 25),
('HDL', 'chemistry', 'HDL', 'mmol/L', 'sex-specific',
  '{"male": {"low": 1.00}, "female": {"low": 1.30}}'::jsonb, 31);

-- ============================================================================
-- OPTIONAL: Add critical thresholds for specific tests
-- ============================================================================

-- Update critical thresholds for key tests (example values - adjust per facility)
UPDATE lab_result_refs SET critical_low = 3.0, critical_high = 6.0 WHERE test_code = 'K';
UPDATE lab_result_refs SET critical_low = 120, critical_high = 160 WHERE test_code = 'NA';
UPDATE lab_result_refs SET critical_low = 2.5, critical_high = 20 WHERE test_code = 'GLUCOSE';
UPDATE lab_result_refs SET critical_low = 60, critical_high = NULL WHERE test_code = 'HGB';
UPDATE lab_result_refs SET critical_low = 50, critical_high = NULL WHERE test_code = 'PLT';
UPDATE lab_result_refs SET critical_low = 7.20, critical_high = 7.60 WHERE test_code = 'PH';
UPDATE lab_result_refs SET critical_low = NULL, critical_high = 60 WHERE test_code = 'PCO2';

COMMENT ON TABLE lab_result_refs IS 'Seeded with ABG, Hematology, and Chemistry reference ranges';
