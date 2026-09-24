import type { Row } from '../../../lib/api/tables';
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

// Tests whose result is a category label rather than a number — no numeric
// `value` column, so the selection is stored in `comments` and flagging is
// skipped (flag stays 'normal' since value is left null).
export const CATEGORICAL_TEST_OPTIONS: Record<string, string[]> = {
  URINE_KETONES: ['Negative', 'Trace', 'Small', 'Moderate', 'Large'],
  NEWBORN_SCREEN: ['Normal', 'Abnormal', 'Pending'],
};

// Flag to apply per categorical option, since computeLabFlag() can't compute
// one from a null numeric value. Missing option -> 'normal'.
export const CATEGORICAL_FLAG_MAP: Record<string, Record<string, LabFlag>> = {
  URINE_KETONES: {
    Negative: 'normal',
    Trace: 'abnormal_high',
    Small: 'abnormal_high',
    Moderate: 'abnormal_high',
    Large: 'critical_high',
  },
  NEWBORN_SCREEN: {
    Normal: 'normal',
    Abnormal: 'critical_high',
    Pending: 'normal',
  },
};

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
/**
 * Derived from the schema so nullability cannot drift. `sex_ref` is JSONB,
 * which the generated types describe as `Json`; it always holds a
 * SexSpecificRange, so that one field is overridden.
 */
export type LabResultRef = Omit<Row<'lab_result_refs'>, 'sex_ref'> & {
  sex_ref: SexSpecificRange | null;
};

// Lab panel (batch/collection)
/** Schema row plus the fields computed from joins and aggregations. */
export type LabPanel = Row<'lab_panels'> & {
  entered_by_name?: string;
  result_count?: number;
  abnormal_count?: number;
  critical_count?: number;
  unacked_count?: number;
};

// Individual lab result
/** Schema row plus computed names; `sex_ref` JSONB typed properly. */
export type LabResult = Omit<Row<'lab_results'>, 'sex_ref'> & {
  sex_ref: SexSpecificRange | null;
  entered_by_name?: string;
  ack_by_name?: string;
};

// Acknowledgement event
/** Schema row plus computed name; `abnormal_summary` JSONB typed properly. */
export type LabAckEvent = Omit<Row<'lab_ack_events'>, 'abnormal_summary'> & {
  abnormal_summary: AbnormalResultSummary[] | null;
  ack_by_name?: string;
};

// Abnormal result summary for modal
export interface AbnormalResultSummary {
  test_code: string;
  test_name: string;
  value: number;
  units: string | null;
  ref_range: string;
  // lab_results.flag is nullable.
  flag: LabFlag | null;
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
  // Copied from a lab_result_refs row, where both columns are nullable.
  ref_operator?: RefOperator | null;
  sex_ref?: SexSpecificRange | null;
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
export type LabPanelWithStats = LabPanel & {
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
export function getFlagLabel(flag: LabFlag | null): string {
  switch (flag) {
    case null: return '—';
    case 'normal': return 'Normal';
    case 'abnormal_high': return 'High';
    case 'abnormal_low': return 'Low';
    case 'critical_high': return 'Critical High';
    case 'critical_low': return 'Critical Low';
    default: return flag;
  }
}

// Helper to get flag color class
export function getFlagColorClass(flag: LabFlag | null): string {
  switch (flag) {
    case null: return 'bg-gray-100 text-gray-800';
    case 'normal': return 'bg-gray-100 text-gray-800';
    case 'abnormal_high': return 'bg-yellow-100 text-yellow-800';
    case 'abnormal_low': return 'bg-yellow-100 text-yellow-800';
    case 'critical_high': return 'bg-red-100 text-red-800';
    case 'critical_low': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

// Helper to get status label
export function getStatusLabel(status: LabPanelStatus | null): string {
  switch (status) {
    case null: return 'Unknown';
    case 'new': return 'New';
    case 'partial_ack': return 'Partially Acknowledged';
    case 'acknowledged': return 'Acknowledged';
    default: return status;
  }
}

// Helper to get status color class
export function getStatusColorClass(status: LabPanelStatus | null): string {
  switch (status) {
    case null: return 'bg-gray-100 text-gray-800';
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
  // Both are nullable columns on lab_results / lab_result_refs. The `default`
  // branch of the switch below already returns 'N/A', so null needs no extra
  // handling -- only an honest signature.
  ref_operator: RefOperator | null,
  sex_ref: SexSpecificRange | null,
  patientSex: string | null
): string {
  // Handle sex-specific ranges
  if (ref_operator === 'sex-specific' && sex_ref) {
    const sexKey = patientSex?.toLowerCase() || 'male';
    const sexRange = sex_ref[sexKey as keyof SexSpecificRange] ?? sex_ref.male;
    
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
