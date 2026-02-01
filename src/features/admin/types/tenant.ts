/**
 * Admin & Multi-Tenant Types
 * System administration and tenant management types
 */

/**
 * Healthcare tenant/organization
 */
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
  // Simulation fields
  tenant_type?: 'production' | 'institution' | 'hospital' | 'clinic' | 'simulation_template' | 'simulation_active' | 'program';
  is_simulation?: boolean;
  parent_tenant_id?: string;
  program_id?: string; // Links program tenants to their program
  simulation_config?: Record<string, any>;
  auto_cleanup_at?: string;
  simulation_id?: string;
}

/**
 * Tenant configuration settings
 */
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

/**
 * User membership in a tenant organization
 */
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

/**
 * Management dashboard statistics
 */
export interface ManagementDashboardStats {
  total_tenants: number;
  active_tenants: number;
  total_users: number;
  total_patients: number;
  monthly_revenue: number;
  growth_rate: number;
  system_health: 'healthy' | 'warning' | 'critical';
}

/**
 * Healthcare professional (nurse)
 */
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

/**
 * System alert/notification
 */
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
