-- =====================================================
-- ADD DEVICE-SPECIFIC FIELDS TO DEVICES TABLE
-- =====================================================
-- Adds placement and verification fields for:
-- - IV lines (gauge, site location)
-- - Feeding tubes (route, external length, placement verification)
-- =====================================================

-- =====================================================
-- IV-SPECIFIC FIELDS
-- =====================================================

-- Gauge (14G-24G)
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS gauge text;

-- Site side (Left/Right)
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS site_side text;

-- Site location (anatomical description)
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS site_location text;

COMMENT ON COLUMN devices.gauge IS 
'IV gauge size (14G, 16G, 18G, 20G, 22G, 24G) - for IV devices only';

COMMENT ON COLUMN devices.site_side IS 
'Anatomical side (Left, Right) - for IV and other lateralized devices';

COMMENT ON COLUMN devices.site_location IS 
'Anatomical location description (e.g., "Left Antecubital", "Right Hand")';

-- =====================================================
-- FEEDING TUBE-SPECIFIC FIELDS
-- =====================================================

-- Route (NG, OG, PEG, PEJ, GJ, Other)
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS route text;

-- External length in cm (for verification)
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS external_length_cm numeric(5,2);

-- Initial placement verification fields
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS initial_xray_confirmed boolean DEFAULT false;

ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS initial_ph numeric(3,1);

ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS initial_aspirate_appearance text;

ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS placement_confirmed boolean DEFAULT false;

COMMENT ON COLUMN devices.route IS 
'Feeding tube route (NG, OG, PEG, PEJ, GJ, Other) - for feeding tubes only';

COMMENT ON COLUMN devices.external_length_cm IS 
'External tube length in centimeters (for feeding tube placement verification)';

COMMENT ON COLUMN devices.initial_xray_confirmed IS 
'Initial X-ray confirmation of feeding tube placement';

COMMENT ON COLUMN devices.initial_ph IS 
'Initial pH test result for feeding tube placement (0-14 scale)';

COMMENT ON COLUMN devices.initial_aspirate_appearance IS 
'Initial aspirate appearance description for feeding tube placement';

COMMENT ON COLUMN devices.placement_confirmed IS 
'Overall feeding tube placement confirmation flag';

-- =====================================================
-- INDEX FOR DEVICE TYPE QUERIES
-- =====================================================

-- Improve queries filtering by device type
CREATE INDEX IF NOT EXISTS idx_devices_type 
  ON devices(type);

COMMENT ON INDEX idx_devices_type IS 
'Optimize queries filtering by device type (iv-peripheral, foley, feeding-tube, etc.)';
