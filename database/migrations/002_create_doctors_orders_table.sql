-- Create doctors_orders table for managing physician orders
-- This supports both direct orders (admin/super admin) and phone/verbal orders (nurses)

CREATE TABLE "public"."doctors_orders" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL REFERENCES "public"."patients"("id") ON DELETE CASCADE,
    "tenant_id" UUID NOT NULL REFERENCES "public"."tenants"("id") ON DELETE CASCADE,
    
    -- Order details
    "order_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "order_time" TIME NOT NULL DEFAULT CURRENT_TIME,
    "order_text" TEXT NOT NULL,
    "ordering_doctor" TEXT NOT NULL,
    "notes" TEXT,
    
    -- Order type (for nurses entering phone/verbal orders)
    "order_type" TEXT DEFAULT 'Direct' CHECK (order_type IN ('Direct', 'Phone Order', 'Verbal Order')),
    
    -- Status tracking
    "is_acknowledged" BOOLEAN DEFAULT FALSE,
    "acknowledged_by" UUID REFERENCES "public"."user_profiles"("id"),
    "acknowledged_at" TIMESTAMPTZ,
    
    -- Audit fields
    "doctor_name" TEXT, -- Doctor who created the order (for admin/super admin entries)
    "created_by" UUID NOT NULL REFERENCES "public"."user_profiles"("id"),
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_by" UUID REFERENCES "public"."user_profiles"("id"),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX "idx_doctors_orders_patient_id" ON "public"."doctors_orders"("patient_id");
CREATE INDEX "idx_doctors_orders_tenant_id" ON "public"."doctors_orders"("tenant_id");
CREATE INDEX "idx_doctors_orders_order_date" ON "public"."doctors_orders"("order_date");
CREATE INDEX "idx_doctors_orders_is_acknowledged" ON "public"."doctors_orders"("is_acknowledged");

-- Add RLS policy
ALTER TABLE "public"."doctors_orders" ENABLE ROW LEVEL SECURITY;

-- Create RLS policy following the same pattern as patient_vitals
CREATE POLICY "doctors_orders_access" ON "public"."doctors_orders"
FOR ALL USING (
    -- Super admin users can access all orders across all tenants
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND role = 'super_admin' 
        AND is_active = true
    )
    OR 
    -- Regular users can access orders from their assigned tenants only
    EXISTS (
        SELECT 1 FROM tenant_users 
        WHERE user_id = auth.uid() 
        AND tenant_id = "doctors_orders".tenant_id 
        AND is_active = true
    )
)
WITH CHECK (
    -- Super admin users can modify all orders across all tenants
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND role = 'super_admin' 
        AND is_active = true
    )
    OR 
    -- Regular users can modify orders from their assigned tenants only
    EXISTS (
        SELECT 1 FROM tenant_users 
        WHERE user_id = auth.uid() 
        AND tenant_id = "doctors_orders".tenant_id 
        AND is_active = true
    )
);

-- Add comments for documentation
COMMENT ON TABLE "public"."doctors_orders" IS 'Stores physician orders with acknowledgment tracking and support for phone/verbal orders';
COMMENT ON COLUMN "public"."doctors_orders"."order_type" IS 'Type of order: Direct (admin/super admin), Phone Order, or Verbal Order (nurses)';
COMMENT ON COLUMN "public"."doctors_orders"."is_acknowledged" IS 'Whether the order has been acknowledged by nursing staff';
COMMENT ON COLUMN "public"."doctors_orders"."order_text" IS 'The actual physician order content';
COMMENT ON COLUMN "public"."doctors_orders"."doctor_name" IS 'Name of the doctor who created the order (for admin/super admin entries)';