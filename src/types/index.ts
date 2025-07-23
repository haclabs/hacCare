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
  medications: Medication[];
  notes: PatientNote[];
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
  lastUpdated?: string;
  recorded_at?: string;
}

export interface Medication {
  id: string;
  patient_id?: string;
  name: string;
  category?: 'scheduled' | 'unscheduled' | 'prn' | 'continuous';
  dosage: string;
  frequency: string;
  route: string;
  start_date: string;
  end_date?: string;
  prescribed_by: string;
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
  tenant_id?: string;
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