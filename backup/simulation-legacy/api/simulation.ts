/**
 * ===========================================================================
 * SIMULATION SYSTEM V2.0 - TYPESCRIPT TYPES
 * ===========================================================================
 * TypeScript interfaces and types for the simulation system
 * ===========================================================================
 */

// ============================================================================
// ENUMS
// ============================================================================

export type TenantType = 'production' | 'simulation_template' | 'simulation_active';

export type SimulationTemplateStatus = 'draft' | 'ready' | 'archived';

export type SimulationActiveStatus = 
  | 'pending' 
  | 'running' 
  | 'paused' 
  | 'completed' 
  | 'expired' 
  | 'cancelled';

export type SimulationRole = 'instructor' | 'student';

// ============================================================================
// DATABASE MODELS
// ============================================================================

export interface SimulationTemplate {
  id: string;
  name: string;
  description: string | null;
  tenant_id: string;
  status: SimulationTemplateStatus;
  snapshot_data: SnapshotData | null;
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
  status: SimulationActiveStatus;
  duration_minutes: number;
  starts_at: string;
  ends_at: string;
  completed_at: string | null;
  template_snapshot_version: number;
  allow_late_join: boolean;
  auto_cleanup: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SimulationParticipant {
  id: string;
  simulation_id: string;
  user_id: string;
  role: SimulationRole;
  granted_at: string;
  granted_by: string;
  last_accessed_at: string | null;
  // Joined data
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
}

export interface SimulationHistory {
  id: string;
  simulation_id: string | null;
  template_id: string;
  name: string;
  status: SimulationActiveStatus;
  duration_minutes: number;
  started_at: string;
  ended_at: string | null;
  completed_at: string | null;
  metrics: SimulationMetrics;
  debrief_data: DebriefData;
  participants: ParticipantSnapshot[];
  activity_summary: ActivitySummary;
  created_by: string;
  archived_at: string;
  created_at: string;
}

export interface SimulationActivityLog {
  id: string;
  simulation_id: string;
  user_id: string;
  action_type: string;
  action_details: Record<string, any>;
  entity_type: string | null;
  entity_id: string | null;
  occurred_at: string;
  notes: string | null;
  // Joined data
  user?: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

// ============================================================================
// SNAPSHOT DATA STRUCTURE
// ============================================================================

export interface SnapshotData {
  patients: any[];
  medications: any[];
  patient_vitals: any[];
  patient_notes: any[];
  patient_alerts: any[];
  advanced_directives: any[];
  admission_records: any[];
  diabetic_records: any[];
  wound_care_assessments: any[];
  snapshot_metadata: {
    created_at: string;
    created_by: string;
    tenant_id: string;
  };
}

// ============================================================================
// METRICS AND REPORTING
// ============================================================================

export interface SimulationMetrics {
  medications_administered: number;
  vitals_recorded: number;
  notes_created: number;
  alerts_generated: number;
  alerts_acknowledged: number;
  total_actions: number;
  unique_participants: number;
  // Additional calculated metrics
  alert_response_time_avg?: number;
  medication_accuracy?: number;
  documentation_completeness?: number;
}

export interface DebriefData {
  strengths: string[];
  areas_for_improvement: string[];
  critical_incidents: CriticalIncident[];
  timeline_highlights: TimelineEvent[];
  instructor_notes: string;
  overall_rating?: number;
}

export interface CriticalIncident {
  timestamp: string;
  type: 'positive' | 'negative' | 'critical';
  description: string;
  participants_involved: string[];
  outcome: string;
}

export interface TimelineEvent {
  timestamp: string;
  event_type: string;
  description: string;
  user_id: string;
  user_name: string;
}

export interface ActivitySummary {
  total_actions: number;
  actions_by_type: string[];
  first_action: string;
  last_action: string;
}

export interface ParticipantSnapshot {
  user_id: string;
  role: SimulationRole;
  name: string;
  email: string;
  actions_count?: number;
  time_active_minutes?: number;
}

// ============================================================================
// UI DISPLAY MODELS
// ============================================================================

export interface SimulationTemplateWithDetails extends SimulationTemplate {
  tenant?: {
    id: string;
    name: string;
  };
  creator?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  patient_count?: number;
  medication_count?: number;
  last_used?: string;
  usage_count?: number;
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

// ============================================================================
// FUNCTION PARAMETERS
// ============================================================================

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
}

export interface UpdateSimulationParams {
  status?: SimulationActiveStatus;
  allow_late_join?: boolean;
}

export interface SaveDebriefParams {
  history_id: string;
  debrief_data: DebriefData;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface SimulationFunctionResult {
  success: boolean;
  message: string;
  template_id?: string;
  simulation_id?: string;
  tenant_id?: string;
  history_id?: string;
  snapshot_version?: number;
  expired_count?: number;
  checked_at?: string;
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface CreateTemplateFormData {
  name: string;
  description: string;
  default_duration_minutes: number;
}

export interface LaunchSimulationFormData {
  template_id: string;
  name: string;
  duration_hours: number;
  duration_minutes: number;
  selected_users: Array<{
    user_id: string;
    role: SimulationRole;
  }>;
  allow_late_join: boolean;
  auto_cleanup: boolean;
}

export interface DebriefFormData {
  overall_rating: number;
  strengths: string;
  areas_for_improvement: string;
  instructor_notes: string;
  critical_incidents: CriticalIncident[];
}

// ============================================================================
// FILTER AND SORT TYPES
// ============================================================================

export interface SimulationTemplateFilters {
  status?: SimulationTemplateStatus[];
  created_by?: string;
  search?: string;
}

export interface SimulationActiveFilters {
  status?: SimulationActiveStatus[];
  template_id?: string;
  created_by?: string;
}

export interface SimulationHistoryFilters {
  template_id?: string;
  status?: SimulationActiveStatus[];
  date_range?: {
    start: string;
    end: string;
  };
  created_by?: string;
}

export type SimulationSortField = 
  | 'name' 
  | 'created_at' 
  | 'updated_at' 
  | 'status' 
  | 'starts_at' 
  | 'ends_at';

export interface SimulationSortOptions {
  field: SimulationSortField;
  direction: 'asc' | 'desc';
}

// ============================================================================
// TENANT SWITCHER TYPES
// ============================================================================

export interface TenantOption {
  id: string;
  name: string;
  type: TenantType;
  is_simulation: boolean;
  simulation_info?: {
    simulation_id: string;
    template_name: string;
    ends_at: string;
    status: SimulationActiveStatus;
  };
}

export interface TenantGroups {
  production: TenantOption[];
  simulations: TenantOption[];
}

// ============================================================================
// ACTIVITY TRACKING TYPES
// ============================================================================

export interface ActivityLogEntry {
  action_type: string;
  action_details: Record<string, any>;
  entity_type?: string;
  entity_id?: string;
  notes?: string;
}

export const ACTIVITY_TYPES = {
  // Patient Actions
  PATIENT_VIEWED: 'patient_viewed',
  PATIENT_UPDATED: 'patient_updated',
  
  // Medication Actions
  MEDICATION_ADMINISTERED: 'medication_administered',
  MEDICATION_MISSED: 'medication_missed',
  MEDICATION_REFUSED: 'medication_refused',
  
  // Vital Signs
  VITALS_RECORDED: 'vitals_recorded',
  VITALS_ABNORMAL: 'vitals_abnormal',
  
  // Alerts
  ALERT_ACKNOWLEDGED: 'alert_acknowledged',
  ALERT_IGNORED: 'alert_ignored',
  
  // Documentation
  NOTE_CREATED: 'note_created',
  ASSESSMENT_COMPLETED: 'assessment_completed',
  
  // System Actions
  SIMULATION_JOINED: 'simulation_joined',
  SIMULATION_LEFT: 'simulation_left',
} as const;

export type ActivityType = typeof ACTIVITY_TYPES[keyof typeof ACTIVITY_TYPES];
