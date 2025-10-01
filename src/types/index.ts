export interface Patient {
  id: string;
  patient_id: string;
  tenant_id?: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'Male' | 'Female' | 'Other';
  room_number: string;
  bed_number: string;
  admission_date: string;
  condition: 'Critical' | 'Stable' | 'Improving' | 'Discharged';
  diagnosis: string;
  allergies: string[];
  blood_type: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  assigned_nurse: string;
  vitals: VitalSigns[];
  medications?: Medication[]; // Optional since medications are loaded separately
  notes: PatientNote[];
  wound_assessments?: WoundAssessment[]; // Optional wound care data
}

export interface VitalSigns {
  id?: string;
  temperature: number;
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
  heartRate: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  oxygenDelivery?: string; // Room Air, O2 1 L/min, O2 2 L/min, etc.
  lastUpdated?: string;
  recorded_at?: string;
}

export interface Medication {
  id: string;
  patient_id?: string;
  name: string;
  category?: 'scheduled' | 'unscheduled' | 'prn' | 'continuous' | 'diabetic';
  dosage: string;
  frequency: string;
  route: string;
  start_date: string;
  end_date?: string;
  prescribed_by: string;
  admin_time?: string; // Time of day medication should be administered (HH:MM format)
  admin_times?: string[] | null; // Multiple administration times for "X times daily" frequencies
  last_administered?: string;
  next_due: string;
  status: 'Active' | 'Completed' | 'Discontinued';
  administrations?: MedicationAdministration[];
}

export interface MedicationAdministration {
  id?: string;
  medication_id?: string;
  patient_id?: string;
  administered_by: string;
  administered_by_id?: string;
  timestamp: string;
  notes?: string;
  dosage?: string;
  route?: string;
  status?: 'completed' | 'missed' | 'late' | 'partial';
  medication?: {
    name: string;
    dosage: string;
    route: string;
    frequency: string;
  };
  medication_name?: string; // Fallback field
}

export interface PatientNote {
  id: string;
  created_at?: string;
  createdAt?: string;
  nurse_id?: string;
  nurse_name?: string;
  type: 'Assessment' | 'Medication' | 'Vital Signs' | 'General' | 'Incident';
  content: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  patient_id?: string;
}

export interface DoctorsOrder {
  id: string;
  patient_id: string;
  tenant_id: string;
  order_date: string; // ISO date string (YYYY-MM-DD)
  order_time: string; // 24-hour time format (HH:MM)
  order_text: string;
  ordering_doctor: string;
  notes?: string;
  order_type: 'Direct' | 'Phone Order' | 'Verbal Order';
  is_acknowledged: boolean;
  acknowledged_by?: string; // user ID
  acknowledged_by_name?: string; // user name for display
  acknowledged_at?: string; // ISO timestamp
  doctor_name?: string; // Doctor who created the order (for admin/super admin entries)
  created_by: string; // user ID
  created_by_name?: string; // user name for display
  created_at: string; // ISO timestamp
  updated_by?: string; // user ID
  updated_at?: string; // ISO timestamp
}

export interface Nurse {
  id: string;
  tenant_id?: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  department: string;
  shift: 'Day' | 'Evening' | 'Night';
  email: string;
  phone: string;
  specializations: string[];
}

export interface Alert {
  id: string;
  patientId: string;
  patientName: string;
  type: 'Medication Due' | 'Vital Signs Alert' | 'Emergency' | 'Discharge Ready' | 'Lab Results';
  message: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  timestamp: string;
  acknowledged: boolean;
  tenant_id: string; // Made required for multi-tenant support
}

// Multi-tenant types
export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  logo_url?: string;
  primary_color?: string;
  settings: TenantSettings;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  admin_user_id: string;
  subscription_plan: 'basic' | 'premium' | 'enterprise';
  max_users: number;
  max_patients: number;
}

export interface TenantSettings {
  timezone: string;
  date_format: string;
  currency: string;
  logo_url?: string | null;
  primary_color?: string;
  features: {
    advanced_analytics: boolean;
    medication_management: boolean;
    wound_care: boolean;
    barcode_scanning: boolean;
    mobile_app: boolean;
  };
  security: {
    two_factor_required: boolean;
    session_timeout: number;
    password_policy: {
      min_length: number;
      require_uppercase: boolean;
      require_lowercase: boolean;
      require_numbers: boolean;
      require_symbols: boolean;
    };
  };
}

export interface TenantUser {
  id: string;
  tenant_id: string;
  user_id: string;
  role: 'admin' | 'nurse' | 'doctor' | 'viewer';
  permissions: string[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
  user_profiles?: {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
  } | null;
}

export interface ManagementDashboardStats {
  total_tenants: number;
  active_tenants: number;
  total_users: number;
  total_patients: number;
  monthly_revenue: number;
  growth_rate: number;
  system_health: 'healthy' | 'warning' | 'critical';
}

// Wound Care Types
export interface WoundAssessment {
  id: string;
  patient_id: string;
  assessment_date: string;
  wound_location: string;
  wound_type: 'surgical' | 'pressure' | 'venous' | 'arterial' | 'diabetic' | 'traumatic' | 'other';
  stage?: string;
  length_cm: number;
  width_cm: number;
  depth_cm: number;
  wound_bed: 'red' | 'yellow' | 'black' | 'mixed';
  exudate_amount: 'none' | 'minimal' | 'moderate' | 'heavy';
  exudate_type: 'serous' | 'sanguineous' | 'serosanguineous' | 'purulent' | 'other';
  periwound_condition: string;
  pain_level: number; // 0-10 scale
  odor: boolean;
  signs_of_infection: boolean;
  assessment_notes: string;
  photos?: string[]; // URLs to wound photos
  assessor_id: string;
  assessor_name: string;
  created_at: string;
  updated_at: string;
}

export interface WoundTreatment {
  id: string;
  patient_id: string;
  wound_assessment_id?: string;
  treatment_date: string;
  treatment_type: string;
  products_used: string;
  procedure_notes: string;
  administered_by: string;
  administered_by_id: string;
  administered_at: string;
  next_treatment_due?: string;
  photos_after?: string[]; // URLs to photos after treatment
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SIMULATION SYSTEM TYPES
// ============================================================================

export interface ScenarioTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  learning_objectives?: string[];
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration_minutes?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  tags?: string[];
}

export interface ActiveSimulation {
  id: string;
  scenario_template_id: string;
  tenant_id: string;
  session_name: string;
  instructor_id: string;
  start_time: string;
  end_time?: string;
  status: 'running' | 'paused' | 'completed' | 'reset';
  student_ids: string[];
  simulation_notes?: string;
  sim_access_key: string;
  allow_anonymous_access: boolean;
  created_at: string;
  scenario_template?: ScenarioTemplate;
}

export interface SimulationPatient {
  id: string;
  scenario_template_id?: string;
  active_simulation_id?: string;
  patient_name: string;
  patient_id: string; // PT001, PT002, etc.
  date_of_birth: string;
  gender?: string;
  room_number?: string;
  bed_number?: string;
  admission_date?: string;
  condition?: string;
  diagnosis?: string;
  medical_history?: string;
  allergies?: string[];
  blood_type?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  assigned_nurse?: string;
  chief_complaint?: string;
  patient_scenario?: string;
  is_template: boolean;
  created_at: string;
  vitals?: SimulationPatientVital[];
  medications?: SimulationPatientMedication[];
  notes?: SimulationPatientNote[];
}

export interface SimulationPatientVital {
  id: string;
  simulation_patient_id: string;
  temperature?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  recorded_at: string;
  recorded_by?: string;
  notes?: string;
  is_baseline: boolean;
  created_at: string;
}

export interface SimulationPatientMedication {
  id: string;
  simulation_patient_id: string;
  name: string;
  category?: string;
  dosage: string;
  route: string;
  frequency: string;
  admin_time: string;
  start_date: string;
  end_date?: string;
  prescribed_by: string;
  status: string;
  special_instructions?: string;
  is_template: boolean;
  created_at: string;
}

export interface SimulationMedicationAdministration {
  id: string;
  simulation_patient_id: string;
  medication_id?: string;
  medication_name: string;
  dosage?: string;
  route?: string;
  administered_by: string;
  administered_by_name?: string;
  administered_at: string;
  notes?: string;
  status: 'completed' | 'missed' | 'late' | 'partial';
  instructor_verified: boolean;
  verification_notes?: string;
}

export interface SimulationPatientNote {
  id: string;
  simulation_patient_id: string;
  created_by: string;
  created_by_name?: string;
  type: 'Assessment' | 'Medication' | 'Vital Signs' | 'General' | 'Incident';
  content: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  is_template: boolean;
  created_at: string;
}

export interface SimulationEvent {
  id: string;
  active_simulation_id: string;
  event_type: string;
  event_data: any;
  student_id?: string;
  student_name?: string;
  patient_id?: string;
  patient_name?: string;
  timestamp: string;
  notes?: string;
  instructor_feedback?: string;
  score?: number;
}

export interface SimulationAssessment {
  id: string;
  active_simulation_id: string;
  student_id: string;
  student_name?: string;
  assessment_type: string;
  criteria: string;
  score: number;
  feedback?: string;
  assessed_by: string;
  assessed_by_name?: string;
  assessed_at: string;
}

// Request/Response types for API calls
export interface CreateScenarioTemplateRequest {
  name: string;
  description?: string;
  learning_objectives?: string[];
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration_minutes?: number;
  tags?: string[];
}

export interface CreateSimulationRequest {
  scenario_template_id: string;
  session_name: string;
  student_ids: string[];
  simulation_notes?: string;
}

export interface CreateSimulationPatientRequest {
  patient_name: string;
  patient_id: string;
  date_of_birth: string;
  gender?: string;
  room_number?: string;
  bed_number?: string;
  diagnosis?: string;
  medical_history?: string;
  allergies?: string[];
  chief_complaint?: string;
  patient_scenario?: string;
}