-- ============================================================================
-- Migration: Alter wound_assessments table to add new assessment columns
-- Description: Adds columns for device/wound assessment tracking in hacMap
-- Author: System
-- Date: 2025-11-16
-- ============================================================================

-- Add new columns for device/wound assessment
ALTER TABLE wound_assessments
  ADD COLUMN IF NOT EXISTS drainage_type TEXT[],
  ADD COLUMN IF NOT EXISTS drainage_amount TEXT,
  ADD COLUMN IF NOT EXISTS wound_length_cm DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS wound_width_cm DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS wound_depth_cm DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS wound_appearance TEXT;

-- Update comments
COMMENT ON COLUMN wound_assessments.drainage_type IS 'Array of drainage types: serous, sanguineous, serosanguineous, purulent, none';
COMMENT ON COLUMN wound_assessments.drainage_amount IS 'Amount of drainage: none, scant, small, moderate, large, copious';
COMMENT ON COLUMN wound_assessments.wound_length_cm IS 'Wound length in centimeters';
COMMENT ON COLUMN wound_assessments.wound_width_cm IS 'Wound width in centimeters';
COMMENT ON COLUMN wound_assessments.wound_depth_cm IS 'Wound depth in centimeters';
COMMENT ON COLUMN wound_assessments.wound_appearance IS 'Wound appearance: clean, granulating, epithelializing, slough, eschar, necrotic, infected';
