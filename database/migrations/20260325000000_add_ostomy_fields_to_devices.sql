-- Add ostomy and nasogastric to device_type_enum and add device-specific columns

ALTER TYPE device_type_enum ADD VALUE IF NOT EXISTS 'ostomy';
ALTER TYPE device_type_enum ADD VALUE IF NOT EXISTS 'nasogastric';

ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS ostomy_construction    TEXT,
  ADD COLUMN IF NOT EXISTS stoma_side             TEXT,
  ADD COLUMN IF NOT EXISTS ng_securement          TEXT,
  ADD COLUMN IF NOT EXISTS ng_attached_to         TEXT,
  ADD COLUMN IF NOT EXISTS ng_external_length_mm  NUMERIC(8,1),
  ADD COLUMN IF NOT EXISTS ng_residual_volume_ml  NUMERIC(8,1);

COMMENT ON COLUMN devices.ostomy_construction IS 'Ostomy type: Colostomy, Ileostomy, Urostomy, Other';
COMMENT ON COLUMN devices.stoma_side IS 'Side of abdomen: Left, Right';
