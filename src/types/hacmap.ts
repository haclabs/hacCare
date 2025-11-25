/**
 * hacMap Types - Device & Wound Mapping System
 * Body region-based placement tracking with metric units
 */

// ============================================================================
// ENUMS & UNIONS
// ============================================================================

export type RegionKey =
  | 'head'
  | 'neck'
  | 'chest'
  | 'abdomen'
  | 'pelvis'
  | 'back'
  | 'lower-back'
  | 'left-shoulder'
  | 'right-shoulder'
  | 'left-arm'
  | 'right-arm'
  | 'left-forearm'
  | 'right-forearm'
  | 'left-hand'
  | 'right-hand'
  | 'left-thigh'
  | 'right-thigh'
  | 'left-leg'
  | 'right-leg'
  | 'left-foot'
  | 'right-foot';

export type DeviceType =
  | 'closed-suction-drain'
  | 'chest-tube'
  | 'foley'
  | 'feeding-tube'
  | 'iv-peripheral'
  | 'iv-picc'
  | 'iv-port'
  | 'other';

export type ReservoirType =
  | 'jackson-pratt'
  | 'hemovac'
  | 'penrose'
  | 'other';

export type Orientation =
  | 'superior'
  | 'inferior'
  | 'medial'
  | 'lateral'
  | 'anterior'
  | 'posterior';

export type WoundType =
  | 'incision'
  | 'laceration'
  | 'surgical-site'
  | 'pressure-injury'
  | 'skin-tear'
  | 'other';

export type MarkerKind = 'device' | 'wound';

export type SiteCondition =
  | 'intact'
  | 'erythema'
  | 'edema'
  | 'purulent'
  | 'dry'
  | 'macerated'
  | 'other';

export type DrainageType =
  | 'serous'
  | 'sanguineous'
  | 'serosanguineous'
  | 'purulent'
  | 'none';

export type DrainageAmount =
  | 'none'
  | 'scant'
  | 'small'
  | 'moderate'
  | 'large'
  | 'copious';

export type WoundAppearance =
  | 'clean'
  | 'granulating'
  | 'epithelializing'
  | 'slough'
  | 'eschar'
  | 'necrotic'
  | 'infected';

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * Avatar location - physical placement on body map
 */
export interface AvatarLocation {
  id: string;
  tenant_id: string;
  patient_id: string;
  region_key: RegionKey;
  x_percent: number; // 0-100
  y_percent: number; // 0-100
  body_view?: 'front' | 'back'; // Track which view marker was placed on
  free_text?: string;
  created_by: string;
  created_at: string;
}

/**
 * Device placement (drains, tubes, IVs)
 */
export interface Device {
  id: string;
  tenant_id: string;
  patient_id: string;
  location_id: string;
  type: DeviceType;
  placement_date?: string;
  placement_time?: string; // HH:MM 24-hour
  placed_pre_arrival?: string; // EMS/NH/Clinic/Other
  inserted_by?: string;
  tube_number?: number; // 1-10
  orientation?: Orientation[];
  tube_size_fr?: string;
  number_of_sutures_placed?: number;
  reservoir_type?: ReservoirType;
  reservoir_size_ml?: number;
  securement_method?: string[];
  patient_tolerance?: string;
  notes?: string;
  // IV-specific fields
  gauge?: string; // 14G, 16G, 18G, 20G, 22G, 24G
  site_side?: string; // Left, Right
  site_location?: string; // Anatomical description
  // Feeding Tube-specific fields
  route?: string; // NG, OG, PEG, PEJ, GJ, Other
  external_length_cm?: number;
  initial_xray_confirmed?: boolean;
  initial_ph?: number;
  initial_aspirate_appearance?: string;
  placement_confirmed?: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Wound assessment (final spec)
 */
export interface Wound {
  id: string;
  tenant_id: string;
  patient_id: string;
  location_id: string;
  wound_type: WoundType;
  
  // Temperature in Celsius
  peri_wound_temperature?: string;
  
  // Metric measurements (cm)
  wound_length_cm?: number;
  wound_width_cm?: number;
  wound_depth_cm?: number;
  
  // Clinical descriptions
  wound_description?: string;
  drainage_description?: string[];
  drainage_consistency?: string[];
  wound_odor?: string[];
  drainage_amount?: string;
  wound_edges?: string;
  closure?: string;
  suture_staple_line?: string; // approximated/non-approximated
  sutures_intact?: string; // yes/no/unknown
  entered_by?: string; // Name of nurse/clinician who documented wound
  notes?: string;
  
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Assessment record - tracks ongoing evaluation of devices and wounds
 */
export interface Assessment {
  id: string;
  device_id?: string | null;
  wound_id?: string | null;
  patient_id: string;
  tenant_id: string;
  assessed_at: string;
  student_name: string;
  
  // Common fields
  site_condition?: string;
  pain_level?: number; // 0-10
  notes?: string;
  
  // Wound-specific measurements
  wound_length_cm?: number;
  wound_width_cm?: number;
  wound_depth_cm?: number;
  wound_appearance?: string[];
  drainage_type?: string[];
  drainage_amount?: string;
  surrounding_skin?: string[];
  
  // Treatment
  treatment_applied?: string;
  dressing_type?: string;
  
  // Device-specific
  device_functioning?: boolean;
  output_amount_ml?: number;
  
  created_at: string;
  updated_at: string;
}

// ============================================================================
// UI & DISPLAY TYPES
// ============================================================================

/**
 * Marker for canvas rendering
 */
export interface Marker {
  id: string;
  kind: MarkerKind;
  regionKey: RegionKey;
  x: number; // percent
  y: number; // percent
  bodyView?: 'front' | 'back'; // Which body view marker was placed on
  label?: string;
}

/**
 * Marker with full details (joined data)
 */
export interface MarkerWithDetails extends Marker {
  location: AvatarLocation;
  device?: Device;
  wound?: Wound;
}

/**
 * Coordinates for placement
 */
export interface Coordinates {
  x: number; // percent 0-100
  y: number; // percent 0-100
  view?: 'front' | 'back'; // Which body view marker was placed on
}

// ============================================================================
// FORM INPUT TYPES
// ============================================================================

export interface CreateAvatarLocationInput {
  tenant_id: string;
  patient_id: string;
  region_key: RegionKey;
  x_percent: number;
  y_percent: number;
  body_view?: 'front' | 'back';
  free_text?: string;
  created_by: string;
}

export interface CreateDeviceInput {
  tenant_id: string;
  patient_id: string;
  location_id: string;
  type: DeviceType;
  placement_date?: string;
  placement_time?: string;
  placed_pre_arrival?: string;
  inserted_by?: string;
  tube_number?: number;
  orientation?: Orientation[];
  tube_size_fr?: string;
  number_of_sutures_placed?: number;
  reservoir_type?: ReservoirType;
  reservoir_size_ml?: number;
  securement_method?: string[];
  patient_tolerance?: string;
  notes?: string;
  // IV-specific fields
  gauge?: string;
  site_side?: string;
  site_location?: string;
  // Feeding Tube-specific fields
  route?: string;
  external_length_cm?: number;
  initial_xray_confirmed?: boolean;
  initial_ph?: number;
  initial_aspirate_appearance?: string;
  placement_confirmed?: boolean;
  created_by: string;
}

export interface UpdateDeviceInput {
  type?: DeviceType;
  placement_date?: string;
  placement_time?: string;
  placed_pre_arrival?: string;
  inserted_by?: string;
  tube_number?: number;
  orientation?: Orientation[];
  tube_size_fr?: string;
  number_of_sutures_placed?: number;
  reservoir_type?: ReservoirType;
  reservoir_size_ml?: number;
  securement_method?: string[];
  patient_tolerance?: string;
  notes?: string;
  // IV-specific fields
  gauge?: string;
  site_side?: string;
  site_location?: string;
  // Feeding Tube-specific fields
  route?: string;
  external_length_cm?: number;
  initial_xray_confirmed?: boolean;
  initial_ph?: number;
  initial_aspirate_appearance?: string;
  placement_confirmed?: boolean;
}

export interface CreateWoundInput {
  tenant_id: string;
  patient_id: string;
  location_id: string;
  wound_type: WoundType;
  peri_wound_temperature?: string;
  wound_length_cm?: number;
  wound_width_cm?: number;
  wound_depth_cm?: number;
  wound_description?: string;
  drainage_description?: string[];
  drainage_consistency?: string[];
  wound_odor?: string[];
  drainage_amount?: string;
  wound_edges?: string;
  closure?: string;
  suture_staple_line?: string;
  sutures_intact?: string;
  entered_by?: string;
  notes?: string;
  created_by: string;
}

export interface UpdateWoundInput {
  wound_type?: WoundType;
  peri_wound_temperature?: string;
  wound_length_cm?: number;
  wound_width_cm?: number;
  wound_depth_cm?: number;
  wound_description?: string;
  drainage_description?: string[];
  drainage_consistency?: string[];
  wound_odor?: string[];
  drainage_amount?: string;
  wound_edges?: string;
  closure?: string;
  suture_staple_line?: string;
  sutures_intact?: string;
  entered_by?: string;
  notes?: string;
}

export interface CreateAssessmentInput {
  device_id?: string | null;
  wound_id?: string | null;
  patient_id: string;
  tenant_id: string;
  assessed_at?: string;
  student_name: string;
  site_condition?: string;
  pain_level?: number;
  notes?: string;
  wound_length_cm?: number;
  wound_width_cm?: number;
  wound_depth_cm?: number;
  wound_appearance?: string[];
  drainage_type?: string[];
  drainage_amount?: string;
  surrounding_skin?: string[];
  treatment_applied?: string;
  dressing_type?: string;
  device_functioning?: boolean;
  output_amount_ml?: number;
}

export interface UpdateAssessmentInput {
  assessed_at?: string;
  student_name?: string;
  site_condition?: string;
  pain_level?: number;
  notes?: string;
  wound_length_cm?: number;
  wound_width_cm?: number;
  wound_depth_cm?: number;
  wound_appearance?: string[];
  drainage_type?: string[];
  drainage_amount?: string;
  surrounding_skin?: string[];
  treatment_applied?: string;
  dressing_type?: string;
  device_functioning?: boolean;
  output_amount_ml?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  'closed-suction-drain': 'Closed Suction Drain',
  'chest-tube': 'Chest Tube',
  'foley': 'Foley Catheter',
  'feeding-tube': 'Feeding Tube',
  'iv-peripheral': 'IV Peripheral',
  'iv-picc': 'IV PICC Line',
  'iv-port': 'IV Port',
  'other': 'Other'
};

export const RESERVOIR_TYPE_LABELS: Record<ReservoirType, string> = {
  'jackson-pratt': 'Jackson-Pratt',
  'hemovac': 'Hemovac',
  'penrose': 'Penrose',
  'other': 'Other'
};

export const ORIENTATION_LABELS: Record<Orientation, string> = {
  'superior': 'Superior',
  'inferior': 'Inferior',
  'medial': 'Medial',
  'lateral': 'Lateral',
  'anterior': 'Anterior',
  'posterior': 'Posterior'
};

export const WOUND_TYPE_LABELS: Record<WoundType, string> = {
  'incision': 'Incision',
  'laceration': 'Laceration',
  'surgical-site': 'Surgical Site',
  'pressure-injury': 'Pressure Injury',
  'skin-tear': 'Skin Tear',
  'other': 'Other'
};

export const REGION_LABELS: Record<RegionKey, string> = {
  'head': 'Head',
  'neck': 'Neck',
  'chest': 'Chest',
  'abdomen': 'Abdomen',
  'pelvis': 'Pelvis',
  'back': 'Back',
  'lower-back': 'Lower Back',
  'left-shoulder': 'Left Shoulder',
  'right-shoulder': 'Right Shoulder',
  'left-arm': 'Left Arm',
  'right-arm': 'Right Arm',
  'left-forearm': 'Left Forearm',
  'right-forearm': 'Right Forearm',
  'left-hand': 'Left Hand',
  'right-hand': 'Right Hand',
  'left-thigh': 'Left Thigh',
  'right-thigh': 'Right Thigh',
  'left-leg': 'Left Leg',
  'right-leg': 'Right Leg',
  'left-foot': 'Left Foot',
  'right-foot': 'Right Foot'
};

// ============================================================================
// DEVICE ASSESSMENTS
// ============================================================================

/**
 * Device Assessment - separate from wound assessments
 */
export interface DeviceAssessment {
  id: string;
  device_id: string;
  patient_id: string;
  tenant_id: string;
  assessed_at: string;
  student_name: string;
  device_type: DeviceType;
  status?: string;
  output_amount_ml?: number;
  notes?: string;
  assessment_data: Record<string, any>; // JSONB for device-specific fields
  created_at: string;
  updated_at: string;
}

export interface CreateDeviceAssessmentInput {
  device_id: string;
  patient_id: string;
  tenant_id: string;
  assessed_at?: string;
  student_name: string;
  device_type: DeviceType;
  status?: string;
  output_amount_ml?: number;
  notes?: string;
  assessment_data?: Record<string, any>;
}

export interface UpdateDeviceAssessmentInput {
  assessed_at?: string;
  student_name?: string;
  status?: string;
  output_amount_ml?: number;
  notes?: string;
  assessment_data?: Record<string, any>;
}

// Device-specific assessment data structures
export interface IVAssessmentData {
  site_location?: string;
  site_side?: 'Left' | 'Right';
  gauge?: string;
  local_site_assessment?: string[]; // redness, swelling, pain, warmth, etc.
  infiltration_suspected?: boolean;
  phlebitis_suspected?: boolean;
  drainage_colour?: string[];
  site_notes?: string;
  line_status?: 'patent_infusing' | 'patent_saline_lock' | 'sluggish' | 'occluded' | 'discontinued';
  line_interventions?: string[];
  dressing_type?: string;
  dressing_status?: string[];
  dressing_tolerance?: string;
}

export interface FoleyAssessmentData {
  patency_maintained?: boolean;
  patency_notes?: string;
  system_integrity?: boolean;
  integrity_notes?: string;
  catheter_secure?: boolean;
  securement_notes?: string;
  urine_amount_ml?: number;
  urine_appearance?: string;
  urine_odor?: 'normal' | 'foul';
  site_findings?: string[];
  site_notes?: string;
  patient_comfort?: string;
  hygiene_provided?: boolean;
  hygiene_notes?: string;
  indication_valid?: boolean;
  plan?: 'continue' | 'consider_removal' | 'remove_today';
}

export interface FeedingTubeAssessmentData {
  placement_reverified?: boolean;
  reverification_method?: string[];
  site_findings?: string[];
  dressing_condition?: string[];
  dressing_changed?: boolean;
  site_notes?: string;
  tube_flushed?: boolean;
  flush_resistance?: 'none' | 'mild' | 'significant';
  blockage_noted?: boolean;
  actions_taken?: string;
  residual_volume_ml?: number;
  residual_appearance?: string;
  residual_returned?: boolean;
  formula_name?: string;
  feeding_method?: 'bolus' | 'gravity' | 'continuous';
  rate_ml_per_hr?: number;
  volume_given_ml?: number;
  water_flushes_ml?: number;
  flush_timing?: string[];
  nausea_vomiting?: boolean;
  nausea_notes?: string;
  cramping?: boolean;
  abdominal_distension?: boolean;
  bowel_sounds?: 'normal' | 'hypoactive' | 'hyperactive' | 'absent';
  hob_elevated?: boolean;
}
