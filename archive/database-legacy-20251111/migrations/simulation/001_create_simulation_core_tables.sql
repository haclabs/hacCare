-- New Simulation System Core Tables
-- Clean slate approach with proper state management

-- ===============================================
-- Simulation Templates (Master blueprints)
-- ===============================================
CREATE TABLE simulation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    specialty VARCHAR(100),
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
    estimated_duration INTEGER, -- minutes
    learning_objectives TEXT[],
    created_by UUID REFERENCES users(id),
    tenant_id UUID REFERENCES tenants(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- Simulation Snapshots (Immutable baseline states)
-- ===============================================
CREATE TABLE simulation_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES simulation_templates(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    snapshot_data JSONB NOT NULL, -- Complete state data
    created_by UUID REFERENCES users(id),
    tenant_id UUID REFERENCES tenants(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- Active Simulation Instances
-- ===============================================
CREATE TABLE simulation_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES simulation_templates(id),
    snapshot_id UUID REFERENCES simulation_snapshots(id),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
    
    -- Persistent identifiers (barcodes, patient IDs, etc.)
    persistent_identifiers JSONB NOT NULL DEFAULT '{}',
    
    -- Current live state (mutable)
    current_state JSONB NOT NULL,
    
    -- Metadata
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    tenant_id UUID REFERENCES tenants(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- Simulation Activity Log (Student actions)
-- ===============================================
CREATE TABLE simulation_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id UUID REFERENCES simulation_instances(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL,
    action_data JSONB,
    timestamp TIMESTAMP DEFAULT NOW(),
    tenant_id UUID REFERENCES tenants(id)
);

-- ===============================================
-- Simulation Sessions (For multi-student tracking)
-- ===============================================
CREATE TABLE simulation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id UUID REFERENCES simulation_instances(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id),
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,
    role VARCHAR(50), -- 'student', 'observer', 'instructor'
    tenant_id UUID REFERENCES tenants(id)
);

-- ===============================================
-- Indexes for Performance
-- ===============================================
CREATE INDEX idx_sim_templates_tenant ON simulation_templates(tenant_id);
CREATE INDEX idx_sim_templates_active ON simulation_templates(is_active);
CREATE INDEX idx_sim_snapshots_template ON simulation_snapshots(template_id);
CREATE INDEX idx_sim_snapshots_tenant ON simulation_snapshots(tenant_id);
CREATE INDEX idx_sim_instances_status ON simulation_instances(status);
CREATE INDEX idx_sim_instances_tenant ON simulation_instances(tenant_id);
CREATE INDEX idx_sim_instances_template ON simulation_instances(template_id);
CREATE INDEX idx_sim_activities_simulation ON simulation_activities(simulation_id);
CREATE INDEX idx_sim_activities_timestamp ON simulation_activities(timestamp);
CREATE INDEX idx_sim_activities_tenant ON simulation_activities(tenant_id);
CREATE INDEX idx_sim_sessions_simulation ON simulation_sessions(simulation_id);
CREATE INDEX idx_sim_sessions_student ON simulation_sessions(student_id);
CREATE INDEX idx_sim_sessions_tenant ON simulation_sessions(tenant_id);

-- ===============================================
-- Comments for Documentation
-- ===============================================
COMMENT ON TABLE simulation_templates IS 'Master simulation blueprints created by instructors';
COMMENT ON TABLE simulation_snapshots IS 'Immutable baseline states taken from templates';
COMMENT ON TABLE simulation_instances IS 'Active simulation sessions with mutable state';
COMMENT ON TABLE simulation_activities IS 'Log of all student actions during simulations';
COMMENT ON TABLE simulation_sessions IS 'Track which students are in which simulations';

COMMENT ON COLUMN simulation_instances.persistent_identifiers IS 'Barcodes and IDs that persist across resets';
COMMENT ON COLUMN simulation_instances.current_state IS 'Live mutable state that changes during simulation';
COMMENT ON COLUMN simulation_snapshots.snapshot_data IS 'Complete immutable baseline state for reset';