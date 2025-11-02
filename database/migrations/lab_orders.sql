-- ============================================================================
-- Lab Orders System - Database Schema
-- ============================================================================
-- Description: Creates tables, enums, policies, and triggers for the Lab
--              Orders feature that allows ordering and tracking lab specimens.
-- 
-- Tables:
--   - lab_orders: Lab order requests with specimen information
--
-- Security: RLS enabled with tenant isolation (same pattern as hacMap)
-- ============================================================================

-- ============================================================================
-- DROP EXISTING (for clean reinstall if needed)
-- ============================================================================
-- Uncomment these lines if you need to recreate the tables
-- drop table if exists lab_orders cascade;
-- drop type if exists lab_procedure_enum cascade;
-- drop type if exists lab_source_enum cascade;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Lab Orders: Lab specimen orders and tracking
create table if not exists lab_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  
  -- Order information
  order_date date not null,
  order_time time without time zone not null,  -- 24-hour format
  
  -- Specimen details (cascading selections)
  procedure_category text not null,            -- Urine, Swabs/Cultures, Blood, etc.
  procedure_type text not null,                -- Specific test selected
  source_category text not null,               -- Blood Sources, Wound/Skin Sources, etc.
  source_type text not null,                   -- Specific source location
  
  -- Verification
  initials text not null,                      -- Nurse initials
  verified_by uuid not null references auth.users(id),
  
  -- Status tracking
  status text default 'pending',               -- pending, collected, sent, resulted
  notes text,
  
  -- Label printing
  label_printed boolean default false,
  label_printed_at timestamptz,
  
  -- Audit fields
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

create index if not exists idx_lab_orders_patient on lab_orders(patient_id);
create index if not exists idx_lab_orders_tenant on lab_orders(tenant_id);
create index if not exists idx_lab_orders_date on lab_orders(order_date desc);
create index if not exists idx_lab_orders_status on lab_orders(status);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin 
  new.updated_at = now(); 
  return new; 
end $$;

drop trigger if exists lab_orders_set_updated_at on lab_orders;
create trigger lab_orders_set_updated_at 
  before update on lab_orders
  for each row execute function set_updated_at();

-- Auto-set tenant_id trigger (uses existing auto_set_tenant_id function)
drop trigger if exists lab_orders_set_tenant_id on lab_orders;
create trigger lab_orders_set_tenant_id
  before insert on lab_orders
  for each row execute function auto_set_tenant_id();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on table
alter table lab_orders enable row level security;

-- Create policy for tenant isolation (same pattern as hacMap)
do $$
begin
  -- Drop existing policy if it exists
  execute format($f$
    drop policy if exists "lab_orders_access" on lab_orders;
  $f$);
  
  -- Create unified policy for all operations
  execute format($f$
    create policy "lab_orders_access" on lab_orders
    for all using (
      -- Super admin users can access all data
      exists (
        select 1 from user_profiles 
        where id = auth.uid() 
        and role = 'super_admin' 
        and is_active = true
      )
      or 
      -- Regular users can access data from their assigned tenants
      exists (
        select 1 from tenant_users 
        where user_id = auth.uid() 
        and tenant_id = lab_orders.tenant_id 
        and is_active = true
      )
    )
    with check (
      -- Super admin users can modify all data
      exists (
        select 1 from user_profiles 
        where id = auth.uid() 
        and role = 'super_admin' 
        and is_active = true
      )
      or 
      -- Regular users can modify data from their assigned tenants
      exists (
        select 1 from tenant_users 
        where user_id = auth.uid() 
        and tenant_id = lab_orders.tenant_id 
        and is_active = true
      )
    );
  $f$);
end $$;

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant access to authenticated users
grant select, insert, update, delete on lab_orders to authenticated;

-- Grant usage on sequences (for id generation)
grant usage on all sequences in schema public to authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify installation)
-- ============================================================================

-- Check table exists
-- select table_name from information_schema.tables 
-- where table_schema = 'public' 
-- and table_name = 'lab_orders';

-- Check RLS is enabled
-- select tablename, rowsecurity 
-- from pg_tables 
-- where tablename = 'lab_orders';

-- Check policy exists
-- select tablename, policyname 
-- from pg_policies 
-- where tablename = 'lab_orders';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
