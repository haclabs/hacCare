-- Add entered_by field to wounds table to track who documented the wound
-- Matches the inserted_by field in devices table

ALTER TABLE wounds 
ADD COLUMN IF NOT EXISTS entered_by TEXT;

COMMENT ON COLUMN wounds.entered_by IS 'Name of the nurse/clinician who entered/documented this wound';

-- Add body_view field to avatar_locations to track front/back view
-- This fixes the issue where markers placed on front/back legs show on both views

ALTER TABLE avatar_locations
ADD COLUMN IF NOT EXISTS body_view TEXT;

COMMENT ON COLUMN avatar_locations.body_view IS 'View where marker was placed: front or back. NULL for regions visible on both views (head, arms, etc.)';
