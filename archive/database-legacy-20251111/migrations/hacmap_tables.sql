-- ============================================================================
-- hacMap: Device & Wound Mapping System - Database Schema
-- ============================================================================
-- Description: Creates tables, enums, policies, and triggers for the hacMap
--              feature that allows visual placement of devices and wounds on
--              an interactive body diagram.
-- 
-- Tables:
--   - avatar_locations: Stores x/y coordinates for body placements
--   - devices: Medical device documentation (drains, tubes, IVs, etc.)
--   - wounds: Wound assessment documentation
--
-- Security: RLS enabled with tenant isolation
-- ============================================================================

-- ============================================================================
-- DROP EXISTING (for clean reinstall if needed)
-- ============================================================================
-- Uncomment these lines if you need to recreate the tables
-- drop table if exists wounds cascade;
-- drop table if exists devices cascade;
-- drop table if exists avatar_locations cascade;
-- drop type if exists device_type_enum cascade;
-- drop type if exists reservoir_type_enum cascade;
-- drop type if exists orientation_enum cascade;
-- drop type if exists wound_type_enum cascade;

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Device types
do $$ begin
  create type device_type_enum as enum
    ('closed-suction-drain','chest-tube','foley','iv-peripheral','iv-picc','iv-port','other');
exception when duplicate_object then null; end $$;

-- Reservoir types for drainage devices
do $$ begin
  create type reservoir_type_enum as enum
    ('jackson-pratt','hemovac','penrose','other');
exception when duplicate_object then null; end $$;

-- Anatomical orientation
do $$ begin
  create type orientation_enum as enum
    ('superior','inferior','medial','lateral','anterior','posterior');
exception when duplicate_object then null; end $$;

-- Wound types
do $$ begin
  create type wound_type_enum as enum
    ('incision','laceration','surgical-site','pressure-injury','skin-tear','other');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Avatar locations: Physical placement coordinates on body diagram
create table if not exists avatar_locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  region_key text not null,                        -- head, chest, abdomen, etc.
  x_percent numeric not null check (x_percent between 0 and 100),
  y_percent numeric not null check (y_percent between 0 and 100),
  free_text text,                                  -- Optional user note about location
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Devices: Medical devices, tubes, drains, IVs
create table if not exists devices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  location_id uuid not null references avatar_locations(id) on delete cascade,
  
  -- Device information
  type device_type_enum not null default 'closed-suction-drain',
  placement_date date,
  placement_time time without time zone,           -- 24-hour format
  placed_pre_arrival text,                         -- EMS/NH/Clinic/Other
  inserted_by text,                                -- Provider name
  tube_number int check (tube_number between 1 and 10),
  orientation orientation_enum[] default '{}',     -- Array of orientations
  tube_size_fr text,                               -- French size
  number_of_sutures_placed int,
  
  -- Drainage/reservoir info
  reservoir_type reservoir_type_enum,
  reservoir_size_ml int,                           -- milliliters
  
  -- Securement & tolerance
  securement_method text[] default '{}',           -- Array: Suture, Tape, StatLock, Other
  patient_tolerance text,
  notes text,
  
  -- Audit fields
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Wounds: Wound assessment and documentation (final spec)
create table if not exists wounds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  location_id uuid not null references avatar_locations(id) on delete cascade,
  
  -- Wound classification
  wound_type wound_type_enum not null,
  
  -- Temperature (Celsius)
  peri_wound_temperature text,                     -- e.g., "37.2°C"
  
  -- Metric measurements (centimeters)
  wound_length_cm numeric,
  wound_width_cm  numeric,
  wound_depth_cm  numeric,
  
  -- Clinical descriptions
  wound_description text,                          -- Free-text description
  drainage_description text[] default '{}',        -- Serous, Sanguineous, Serosanguineous, Purulent, None
  drainage_consistency text[] default '{}',        -- Thin, Thick, Watery, Viscous
  wound_odor text[] default '{}',                  -- None, Foul, Sweet, Musty
  drainage_amount text,                            -- None/Scant/Minimal/Moderate/Large/Copious/UTA
  wound_edges text,                                -- Description of wound edges
  closure text,                                    -- Primary, secondary, tertiary
  suture_staple_line text,                         -- approximated/non-approximated
  sutures_intact text,                             -- yes/no/unknown
  notes text,
  
  -- Audit fields
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

create index if not exists idx_avatar_locations_patient on avatar_locations(patient_id);
create index if not exists idx_avatar_locations_tenant on avatar_locations(tenant_id);

create index if not exists idx_devices_patient on devices(patient_id);
create index if not exists idx_devices_tenant on devices(tenant_id);
create index if not exists idx_devices_location on devices(location_id);

create index if not exists idx_wounds_patient on wounds(patient_id);
create index if not exists idx_wounds_tenant on wounds(tenant_id);
create index if not exists idx_wounds_location on wounds(location_id);

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

drop trigger if exists devices_set_updated_at on devices;
create trigger devices_set_updated_at 
  before update on devices
  for each row execute function set_updated_at();

drop trigger if exists wounds_set_updated_at on wounds;
create trigger wounds_set_updated_at 
  before update on wounds
  for each row execute function set_updated_at();

-- Auto-set tenant_id trigger (uses existing auto_set_tenant_id function from schema.sql)
-- This allows frontend code to omit tenant_id - it gets set automatically
drop trigger if exists avatar_locations_set_tenant_id on avatar_locations;
create trigger avatar_locations_set_tenant_id
  before insert on avatar_locations
  for each row execute function auto_set_tenant_id();

drop trigger if exists devices_set_tenant_id on devices;
create trigger devices_set_tenant_id
  before insert on devices
  for each row execute function auto_set_tenant_id();

drop trigger if exists wounds_set_tenant_id on wounds;
create trigger wounds_set_tenant_id
  before insert on wounds
  for each row execute function auto_set_tenant_id();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
alter table avatar_locations enable row level security;
alter table devices enable row level security;
alter table wounds enable row level security;

-- Create policies for tenant isolation (using tenant_users table like other features)
do $$
declare t text;
begin
  foreach t in array array['avatar_locations','devices','wounds'] loop
    -- Drop existing policies if they exist
    execute format($f$
      drop policy if exists "hacmap_%1$s_access" on %1$s;
    $f$, t);
    
    -- Create unified policy for all operations
    execute format($f$
      create policy "hacmap_%1$s_access" on %1$s
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
          and tenant_id = %1$s.tenant_id 
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
          and tenant_id = %1$s.tenant_id 
          and is_active = true
        )
      );
    $f$, t);
  end loop;
end $$;

-- ============================================================================
-- GRANTS (adjust based on your roles)
-- ============================================================================

-- Grant access to authenticated users
grant select, insert, update, delete on avatar_locations to authenticated;
grant select, insert, update, delete on devices to authenticated;
grant select, insert, update, delete on wounds to authenticated;

-- Grant usage on sequences (for id generation)
grant usage on all sequences in schema public to authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify installation)
-- ============================================================================

-- Check tables exist
-- select table_name from information_schema.tables 
-- where table_schema = 'public' 
-- and table_name in ('avatar_locations', 'devices', 'wounds');

-- Check RLS is enabled
-- select tablename, rowsecurity 
-- from pg_tables 
-- where tablename in ('avatar_locations', 'devices', 'wounds');

-- Check policies exist
-- select tablename, policyname 
-- from pg_policies 
-- where tablename in ('avatar_locations', 'devices', 'wounds');

-- ============================================================================
-- SAMPLE DATA (optional - uncomment to insert test data)
-- ============================================================================

/*
-- Note: Replace UUIDs with actual values from your database
insert into avatar_locations (tenant_id, patient_id, region_key, x_percent, y_percent, created_by)
values (
  'YOUR-TENANT-UUID'::uuid,
  'YOUR-PATIENT-UUID'::uuid,
  'chest',
  50,
  30,
  'YOUR-USER-UUID'::uuid
);

insert into devices (tenant_id, patient_id, location_id, type, created_by)
values (
  'YOUR-TENANT-UUID'::uuid,
  'YOUR-PATIENT-UUID'::uuid,
  'LOCATION-UUID-FROM-ABOVE'::uuid,
  'closed-suction-drain',
  'YOUR-USER-UUID'::uuid
);
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
