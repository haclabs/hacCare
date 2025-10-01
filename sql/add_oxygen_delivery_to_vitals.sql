-- Add oxygen_delivery column to patient_vitals table
-- This field will store whether patient is on Room Air or oxygen with flow rate

ALTER TABLE "public"."patient_vitals" 
ADD COLUMN "oxygen_delivery" TEXT DEFAULT 'Room Air';

-- Add a comment to the column
COMMENT ON COLUMN "public"."patient_vitals"."oxygen_delivery" IS 'Oxygen delivery method: Room Air, O2 1 L/min through O2 15 L/min';

-- Update any existing records to have 'Room Air' as default
UPDATE "public"."patient_vitals" 
SET "oxygen_delivery" = 'Room Air' 
WHERE "oxygen_delivery" IS NULL;

-- Example of the options that will be available:
-- 'Room Air'
-- 'O2 1 L/min'
-- 'O2 2 L/min'
-- ... up to ...
-- 'O2 15 L/min'