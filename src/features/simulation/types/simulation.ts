/**
 * ===========================================================================
 * SIMULATION SYSTEM TYPES
 * ===========================================================================
 * TypeScript types for simulation templates, active simulations, and history
 * ===========================================================================
 */

// Category types for simulation organization
export type PrimaryCategory = 'PN' | 'NESA' | 'SIM Hub' | 'BNAD';
export type SubCategory = 'Labs' | 'Simulation' | 'Testing';

// Simulation statuses
export type SimulationTemplateStatus = 'draft' | 'ready' | 'archived';
export type SimulationActiveStatus = 'pending' | 'running' | 'paused' | 'completed' | 'expired' | 'cancelled';
export type SimulationRole = 'instructor' | 'student';

// Base interfaces from database
export interface SimulationTemplate {
  id: string;
  name: string;
  description: string | null;
  tenant_id: string;
  status: SimulationTemplateStatus;
  snapshot_data: any;
  snapshot_version: number;
  snapshot_taken_at: string | null;
  default_duration_minutes: number;
  auto_cleanup_after_hours: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SimulationActive {
  id: string;
  template_id: string;
  name: string;
  tenant_id: string;
  status: SimulationActiveStatus | null;
  duration_minutes: number;
  starts_at: string | null;
  ends_at: string | null;
  completed_at: string | null;
  template_snapshot_version: number;
  allow_late_join: boolean | null;
  auto_cleanup: boolean | null;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
  primary_categories: string[];
  sub_categories: string[];
}

export interface SimulationHistory {
  id: string;
  template_id: string;
  name: string;
  tenant_id: string;
  status: SimulationActiveStatus;
  duration_minutes: number;
  starts_at: string;
  ends_at: string;
  completed_at: string | null;
  template_snapshot_version: number;
  created_by: string;
  created_at: string;
  debrief_summary: any;
  primary_categories: string[];
  sub_categories: string[];
  instructor_name?: string | null;
  archived?: boolean;
  archived_at?: string | null;
  archived_by?: string | null;
  archive_folder?: string | null;
}

export interface SimulationParticipant {
  id: string;
  simulation_id: string;
  user_id: string;
  role: SimulationRole;
  granted_by: string;
  joined_at: string | null;
  left_at: string | null;
  created_at: string;
}

export interface SimulationActivityLog {
  id: string;
  simulation_id: string;
  user_id: string | null;
  activity_type: string;
  activity_data: any;
  timestamp: string;
}

// Enhanced interfaces with relationships
export interface SimulationTemplateWithDetails extends SimulationTemplate {
  creator?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  patient_count?: number;
}

export interface SimulationActiveWithDetails extends SimulationActive {
  template?: {
    id: string;
    name: string;
    description: string;
  };
  participants?: SimulationParticipant[];
  tenant?: {
    id: string;
    name: string;
  };
  creator?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  time_remaining_minutes?: number;
  is_expired?: boolean;
  participant_count?: number;
}

export interface SimulationHistoryWithDetails extends SimulationHistory {
  template?: {
    name: string;
    description: string;
  };
  creator?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

// Request/Response types
export interface CreateTemplateParams {
  name: string;
  description?: string;
  default_duration_minutes?: number;
}

export interface LaunchSimulationParams {
  template_id: string;
  name: string;
  duration_minutes: number;
  participant_user_ids: string[];
  participant_roles?: SimulationRole[];
  primary_categories?: string[];
  sub_categories?: string[];
}

export interface SaveDebriefParams {
  simulation_id: string;
  debrief_summary: any;
}

export interface SimulationFunctionResult {
  success: boolean;
  simulation_id?: string;
  tenant_id?: string;
  template_id?: string;
  message: string;
}

export interface ActivityLogEntry {
  activity_type: string;
  user_id?: string;
  user_name?: string;
  timestamp: string;
  data: any;
}

// Filter types
export interface SimulationTemplateFilters {
  status?: SimulationTemplateStatus[];
  created_by?: string;
  search?: string;
}

export interface SimulationActiveFilters {
  status?: SimulationActiveStatus[];
  template_id?: string;
  created_by?: string;
  search?: string;
  primary_categories?: string[];
  sub_categories?: string[];
}

export interface SimulationHistoryFilters {
  template_id?: string;
  created_by?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  primary_categories?: string[];
  sub_categories?: string[];
  archived?: boolean;
  instructor_name?: string;
}

// Category configuration
export const PRIMARY_CATEGORIES: { value: PrimaryCategory; label: string; color: string }[] = [
  { value: 'PN', label: 'PN', color: 'bg-blue-100 text-blue-800' },
  { value: 'NESA', label: 'NESA', color: 'bg-green-100 text-green-800' },
  { value: 'SIM Hub', label: 'SIM Hub', color: 'bg-purple-100 text-purple-800' },
  { value: 'BNAD', label: 'BNAD', color: 'bg-orange-100 text-orange-800' },
];

export const SUB_CATEGORIES: { value: SubCategory; label: string; color: string }[] = [
  { value: 'Labs', label: 'Labs', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'Simulation', label: 'Simulation', color: 'bg-teal-100 text-teal-800' },
  { value: 'Testing', label: 'Testing', color: 'bg-pink-100 text-pink-800' },
];
