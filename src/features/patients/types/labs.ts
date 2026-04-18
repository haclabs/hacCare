// Lab Results System Types
// Multi-tenant lab management with category-based organization

export type LabCategory = 'chemistry' | 'abg' | 'hematology';

export type LabPanelStatus = 'new' | 'partial_ack' | 'acknowledged';

export type LabFlag = 
  | 'normal' 
  | 'abnormal_high' 
  | 'abnormal_low' 
  | 'critical_high' 
  | 'critical_low';

export type RefOperator = 'between' | '>=' | '<=' | 'sex-specific';

export type AckScope = 'panel' | 'result';

export type PatientSex = 'male' | 'female' | 'other';

// Sex-specific reference range structure
export interface SexSpecificRange {
  male?: {
    low?: number;
    high?: number;
  };
  female?: {
    low?: number;
    high?: number;
  };
}

// Master reference range
export interface LabResultRef {
  test_code: string;
  category: LabCategory;
  test_name: string;
  units: string | null;
  ref_low: number | null;
  ref_high: number | null;
  ref_operator: RefOperator;
  sex_ref: SexSpecificRange | null;
  critical_low: number | null;
  critical_high: number | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Lab panel (batch/collection)
export interface LabPanel {
  id: string;
  tenant_id: string;
  patient_id: string;
  panel_time: string;
  source: string | null;
  entered_by: string | null;
  status: LabPanelStatus;
  ack_required: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Computed fields (from joins/aggregations)
  entered_by_name?: string;
  result_count?: number;
  abnormal_count?: number;
  critical_count?: number;
  unacked_count?: number;
}

// Individual lab result
export interface LabResult {
  id: string;
  tenant_id: string;
  patient_id: string;
  panel_id: string;
  category: LabCategory;
  test_code: string;
  test_name: string;
  value: number | null;
  units: string | null;
  ref_low: number | null;
  ref_high: number | null;
  ref_operator: RefOperator;
  sex_ref: SexSpecificRange | null;
  critical_low: number | null;
  critical_high: number | null;
  flag: LabFlag;
  entered_by: string | null;
  entered_at: string;
  ack_by: string | null;
  ack_at: string | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
  
  // Computed fields
  entered_by_name?: string;
  ack_by_name?: string;
}

// Acknowledgement event
export interface LabAckEvent {
  id: string;
  tenant_id: string;
  patient_id: string;
  panel_id: string;
  ack_scope: AckScope;
  ack_by: string;
  ack_at: string;
  abnormal_summary: AbnormalResultSummary[] | null;
  note: string | null;
  created_at: string;
  
  // Computed
  ack_by_name?: string;
}

// Abnormal result summary for modal
export interface AbnormalResultSummary {
  test_code: string;
  test_name: string;
  value: number;
  units: string | null;
  ref_range: string;
  flag: LabFlag;
}

// For creating a new panel
export interface CreateLabPanelInput {
  patient_id: string;
  panel_time: string;
  source?: string;
  notes?: string;
  ack_required?: boolean;
}

// For creating a new result
export interface CreateLabResultInput {
  panel_id: string;
  category: LabCategory;
  test_code: string;
  test_name: string;
  value: number | null;
  units?: string;
  ref_low?: number;
  ref_high?: number;
  ref_operator?: RefOperator;
  sex_ref?: SexSpecificRange;
  critical_low?: number;
  critical_high?: number;
  comments?: string;
}

// For acknowledging labs
export interface AcknowledgeLabsInput {
  panel_id: string;
  result_ids?: string[];  // If acknowledging specific results
  scope: AckScope;
  note?: string;
}

// Computed reference range for display
export interface EffectiveRange {
  low: number | null;
  high: number | null;
  display: string;  // e.g., "135-145", "≥18", "M: 70-120, F: 50-90"
}

// Lab panel with aggregated stats
export interface LabPanelWithStats extends LabPanel {
  results: LabResult[];
  total_results: number;
  abnormal_results: number;
  critical_results: number;
  unacked_results: number;
}

// Category tab config
export interface LabCategoryTab {
  id: LabCategory | 'all';
  label: string;
  category?: LabCategory;
}

export const LAB_CATEGORY_TABS: LabCategoryTab[] = [
  { id: 'all', label: 'All' },
  { id: 'chemistry', label: 'Chemistry', category: 'chemistry' },
  { id: 'abg', label: 'ABG', category: 'abg' },
  { id: 'hematology', label: 'Hematology', category: 'hematology' },
];

// Helper to get category label
export function getCategoryLabel(category: LabCategory): string {
  const tab = LAB_CATEGORY_TABS.find(t => t.category === category);
  return tab?.label || category;
}

// Helper to get flag display
export function getFlagLabel(flag: LabFlag): string {
  switch (flag) {
    case 'normal': return 'Normal';
    case 'abnormal_high': return 'High';
    case 'abnormal_low': return 'Low';
    case 'critical_high': return 'Critical High';
    case 'critical_low': return 'Critical Low';
    default: return flag;
  }
}

// Helper to get flag color class
export function getFlagColorClass(flag: LabFlag): string {
  switch (flag) {
    case 'normal': return 'bg-gray-100 text-gray-800';
    case 'abnormal_high': return 'bg-yellow-100 text-yellow-800';
    case 'abnormal_low': return 'bg-yellow-100 text-yellow-800';
    case 'critical_high': return 'bg-red-100 text-red-800';
    case 'critical_low': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

// Helper to get status label
export function getStatusLabel(status: LabPanelStatus): string {
  switch (status) {
    case 'new': return 'New';
    case 'partial_ack': return 'Partially Acknowledged';
    case 'acknowledged': return 'Acknowledged';
    default: return status;
  }
}

// Helper to get status color class
export function getStatusColorClass(status: LabPanelStatus): string {
  switch (status) {
    case 'new': return 'bg-blue-100 text-blue-800';
    case 'partial_ack': return 'bg-yellow-100 text-yellow-800';
    case 'acknowledged': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get display string for reference range based on operator and sex
 */
export function getEffectiveRangeDisplay(
  ref_low: number | null,
  ref_high: number | null,
  ref_operator: RefOperator,
  sex_ref: any | null,
  patientSex: string | null
): string {
  // Handle sex-specific ranges
  if (ref_operator === 'sex-specific' && sex_ref) {
    const sexKey = patientSex?.toLowerCase() || 'male';
    const sexRange = sex_ref[sexKey] || sex_ref['male'];
    
    if (sexRange) {
      if (sexRange.low !== undefined && sexRange.high !== undefined) {
        return `${sexRange.low} - ${sexRange.high}`;
      } else if (sexRange.low !== undefined) {
        return `≥ ${sexRange.low}`;
      } else if (sexRange.high !== undefined) {
        return `≤ ${sexRange.high}`;
      }
    }
  }

  // Handle standard operators
  switch (ref_operator) {
    case 'between':
      return `${ref_low} - ${ref_high}`;
    case '>=':
      return `≥ ${ref_low}`;
    case '<=':
      return `≤ ${ref_high}`;
    default:
      return 'N/A';
  }
}
