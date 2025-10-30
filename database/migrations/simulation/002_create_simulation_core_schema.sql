-- ===============================================
-- NEW SIMULATION SYSTEM: Core Schema
-- ===============================================
-- Clean, bulletproof simulation system with proper state management
-- Templates → Snapshots → Runs with preserved public IDs

-- =============================================== 
-- TEMPLATES (Instructor-curated scenarios)
-- ===============================================
CREATE TABLE sim_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    specialty TEXT,
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
    estimated_duration INTEGER, -- minutes
    learning_objectives TEXT[],
    created_by UUID REFERENCES user_profiles(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sim_template_patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES sim_templates(id) ON DELETE CASCADE,
    public_patient_id TEXT NOT NULL, -- Printed wristband ID (stable across resets)
    demographics JSONB DEFAULT '{}',
    medical_history JSONB DEFAULT '{}',
    baseline_vitals JSONB DEFAULT '{}', 
    baseline_alerts JSONB DEFAULT '[]',
    room TEXT,
    bed TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(template_id, public_patient_id)
);

CREATE TABLE sim_template_meds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES sim_templates(id) ON DELETE CASCADE,
    template_patient_id UUID NOT NULL REFERENCES sim_template_patients(id) ON DELETE CASCADE,
    medication_name TEXT NOT NULL,
    dosage TEXT,
    route TEXT,
    frequency TEXT,
    prescribed_by TEXT,
    prescribed_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'discontinued', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sim_template_barcodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES sim_templates(id) ON DELETE CASCADE,
    template_med_id UUID NOT NULL REFERENCES sim_template_meds(id) ON DELETE CASCADE,
    public_barcode_id TEXT NOT NULL, -- Printed barcode (stable across resets)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(template_id, public_barcode_id)
);

-- ===============================================
-- SNAPSHOTS (Immutable baseline states) 
-- ===============================================
CREATE TABLE sim_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES sim_templates(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    snapshot_data JSONB NOT NULL, -- Complete frozen state
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(template_id, version)
);

-- ===============================================
-- RUNS (Active simulations derived from snapshots)
-- =============================================== 
CREATE TABLE sim_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id UUID NOT NULL REFERENCES sim_snapshots(id),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- STABLE RUN ENTITIES (Preserved across resets)
-- ===============================================
CREATE TABLE sim_run_patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES sim_runs(id) ON DELETE CASCADE,
    template_patient_id UUID NOT NULL REFERENCES sim_template_patients(id),
    public_patient_id TEXT NOT NULL, -- Copied from template for label stability
    room TEXT,
    bed TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(run_id, public_patient_id)
);

CREATE TABLE sim_run_barcode_pool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES sim_runs(id) ON DELETE CASCADE,
    template_barcode_id UUID NOT NULL REFERENCES sim_template_barcodes(id),
    public_barcode_id TEXT NOT NULL, -- Copied from template for label stability
    medication_name TEXT NOT NULL,
    assigned_to_patient_id UUID REFERENCES sim_run_patients(id),
    assigned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(run_id, public_barcode_id)
);

-- ===============================================
-- EPHEMERAL EVENT TABLES (Deleted on reset)
-- ===============================================
CREATE TABLE sim_run_vitals_events (
    id BIGSERIAL PRIMARY KEY,
    run_id UUID NOT NULL REFERENCES sim_runs(id) ON DELETE CASCADE,
    run_patient_id UUID NOT NULL REFERENCES sim_run_patients(id) ON DELETE CASCADE,
    recorded_by UUID REFERENCES user_profiles(id),
    vital_type TEXT NOT NULL, -- 'blood_pressure', 'heart_rate', 'temperature', 'o2_saturation', 'respiratory_rate'
    value JSONB NOT NULL, -- {"systolic": 120, "diastolic": 80} or {"value": 98.6, "unit": "F"}
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sim_run_med_admin_events (
    id BIGSERIAL PRIMARY KEY,
    run_id UUID NOT NULL REFERENCES sim_runs(id) ON DELETE CASCADE,
    run_patient_id UUID NOT NULL REFERENCES sim_run_patients(id) ON DELETE CASCADE,
    administered_by UUID NOT NULL REFERENCES user_profiles(id),
    barcode_scanned TEXT NOT NULL, -- The actual printed barcode that was scanned
    medication_name TEXT NOT NULL,
    dose_given JSONB NOT NULL, -- {"amount": "5mg", "route": "IV", "site": "left_arm"}
    notes TEXT,
    administered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sim_run_alert_acks (
    id BIGSERIAL PRIMARY KEY,
    run_id UUID NOT NULL REFERENCES sim_runs(id) ON DELETE CASCADE,
    run_patient_id UUID REFERENCES sim_run_patients(id) ON DELETE CASCADE,
    alert_key TEXT NOT NULL, -- 'critical_bp_patient_1', 'overdue_med_morphine'
    alert_type TEXT NOT NULL, -- 'vital_alert', 'medication_alert', 'lab_alert'
    alert_message TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    acknowledged_by UUID NOT NULL REFERENCES user_profiles(id),
    acknowledged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sim_run_notes (
    id BIGSERIAL PRIMARY KEY,
    run_id UUID NOT NULL REFERENCES sim_runs(id) ON DELETE CASCADE,
    run_patient_id UUID REFERENCES sim_run_patients(id) ON DELETE CASCADE,
    note_type TEXT NOT NULL, -- 'nursing', 'physician', 'handover', 'wound_care'
    author_id UUID NOT NULL REFERENCES user_profiles(id),
    author_role TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- INDEXES for Performance
-- ===============================================
CREATE INDEX idx_sim_templates_tenant ON sim_templates(tenant_id);
CREATE INDEX idx_sim_templates_active ON sim_templates(is_active);
CREATE INDEX idx_sim_template_patients_template ON sim_template_patients(template_id);
CREATE INDEX idx_sim_snapshots_template ON sim_snapshots(template_id);
CREATE INDEX idx_sim_runs_snapshot ON sim_runs(snapshot_id);
CREATE INDEX idx_sim_runs_status ON sim_runs(status);
CREATE INDEX idx_sim_run_patients_run ON sim_run_patients(run_id);
CREATE INDEX idx_sim_run_barcode_pool_run ON sim_run_barcode_pool(run_id);

-- Event table indexes for fast queries and resets
CREATE INDEX idx_sim_vitals_run_patient ON sim_run_vitals_events(run_id, run_patient_id);
CREATE INDEX idx_sim_vitals_recorded_at ON sim_run_vitals_events(recorded_at);
CREATE INDEX idx_sim_med_admin_run_patient ON sim_run_med_admin_events(run_id, run_patient_id);
CREATE INDEX idx_sim_med_admin_administered_at ON sim_run_med_admin_events(administered_at);
CREATE INDEX idx_sim_alert_acks_run ON sim_run_alert_acks(run_id);
CREATE INDEX idx_sim_notes_run_patient ON sim_run_notes(run_id, run_patient_id);

-- ===============================================
-- VIEWS for Easy Querying
-- ===============================================
CREATE OR REPLACE VIEW sim_run_patient_current_state AS
SELECT 
    rp.run_id,
    rp.id as run_patient_id,
    rp.public_patient_id,
    tp.demographics,
    tp.baseline_vitals,
    tp.baseline_alerts,
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'type', vital_type,
                'value', value,
                'recorded_at', recorded_at,
                'recorded_by', recorded_by
            ) ORDER BY recorded_at DESC
        ) 
        FROM sim_run_vitals_events sve 
        WHERE sve.run_patient_id = rp.id
    ) as recent_vitals,
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'medication_name', medication_name,
                'dose_given', dose_given,
                'administered_at', administered_at,
                'administered_by', administered_by,
                'barcode_scanned', barcode_scanned
            ) ORDER BY administered_at DESC
        )
        FROM sim_run_med_admin_events sme 
        WHERE sme.run_patient_id = rp.id
    ) as recent_med_admin,
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'alert_key', alert_key,
                'alert_type', alert_type,
                'alert_message', alert_message,
                'severity', severity,
                'acknowledged_by', acknowledged_by,
                'acknowledged_at', acknowledged_at
            )
        )
        FROM sim_run_alert_acks saa 
        WHERE saa.run_patient_id = rp.id
    ) as acknowledged_alerts
FROM sim_run_patients rp
JOIN sim_template_patients tp ON tp.id = rp.template_patient_id;

-- ===============================================
-- Comments for Documentation
-- ===============================================
COMMENT ON TABLE sim_templates IS 'Instructor-created simulation scenarios';
COMMENT ON TABLE sim_template_patients IS 'Patients in templates with stable public IDs for printed wristbands';
COMMENT ON TABLE sim_template_barcodes IS 'Medication barcodes with stable public IDs for printed labels';
COMMENT ON TABLE sim_snapshots IS 'Immutable frozen states of templates for baseline reset';
COMMENT ON TABLE sim_runs IS 'Active simulation instances derived from snapshots';
COMMENT ON TABLE sim_run_patients IS 'Patient instances in runs (preserved across resets)';
COMMENT ON TABLE sim_run_barcode_pool IS 'Barcode instances in runs (preserved across resets)';
COMMENT ON TABLE sim_run_vitals_events IS 'Student-entered vitals (deleted on reset)';
COMMENT ON TABLE sim_run_med_admin_events IS 'Student medication administrations (deleted on reset)';
COMMENT ON TABLE sim_run_alert_acks IS 'Student alert acknowledgments (deleted on reset)';
COMMENT ON TABLE sim_run_notes IS 'Student-entered notes (deleted on reset)';

COMMENT ON COLUMN sim_template_patients.public_patient_id IS 'Printed wristband ID - never changes';
COMMENT ON COLUMN sim_template_barcodes.public_barcode_id IS 'Printed medication barcode - never changes';
COMMENT ON COLUMN sim_run_patients.public_patient_id IS 'Copied from template for stability across resets';
COMMENT ON COLUMN sim_run_barcode_pool.public_barcode_id IS 'Copied from template for stability across resets';