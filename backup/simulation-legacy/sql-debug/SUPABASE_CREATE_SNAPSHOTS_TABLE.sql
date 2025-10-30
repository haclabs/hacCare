-- DEPLOY THIS FIRST: Create missing simulation_template_snapshots table
-- Then run the vitals fix

-- Create the simulation_template_snapshots table
CREATE TABLE IF NOT EXISTS simulation_template_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL,
    table_name TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_simulation_template_snapshots_template_id 
ON simulation_template_snapshots(template_id);

CREATE INDEX IF NOT EXISTS idx_simulation_template_snapshots_table_name 
ON simulation_template_snapshots(template_id, table_name);

-- Enable RLS (Row Level Security)
ALTER TABLE simulation_template_snapshots ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view snapshots for their tenant simulations" 
ON simulation_template_snapshots FOR SELECT 
USING (
  template_id IN (
    SELECT id FROM simulation_active 
    WHERE tenant_id = auth.jwt() ->> 'tenant_id'
  )
);

CREATE POLICY "Users can create snapshots for their tenant simulations" 
ON simulation_template_snapshots FOR INSERT 
WITH CHECK (
  template_id IN (
    SELECT id FROM simulation_active 
    WHERE tenant_id = auth.jwt() ->> 'tenant_id'
  )
);

CREATE POLICY "Users can update snapshots for their tenant simulations" 
ON simulation_template_snapshots FOR UPDATE 
USING (
  template_id IN (
    SELECT id FROM simulation_active 
    WHERE tenant_id = auth.jwt() ->> 'tenant_id'
  )
);

CREATE POLICY "Users can delete snapshots for their tenant simulations" 
ON simulation_template_snapshots FOR DELETE 
USING (
  template_id IN (
    SELECT id FROM simulation_active 
    WHERE tenant_id = auth.jwt() ->> 'tenant_id'
  )
);

-- Grant permissions
GRANT ALL ON simulation_template_snapshots TO authenticated;