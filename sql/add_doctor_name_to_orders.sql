-- Migration to add doctor_name field to existing doctors_orders table
-- Run this on databases that already have the doctors_orders table

ALTER TABLE "public"."doctors_orders" 
ADD COLUMN IF NOT EXISTS "doctor_name" TEXT;

-- Add comment for the new field
COMMENT ON COLUMN "public"."doctors_orders"."doctor_name" IS 'Name of the doctor who created the order (for admin/super admin entries)';

-- Update existing records to have NULL doctor_name (which is fine - it means the created_by user created it directly)