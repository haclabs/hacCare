/**
 * Clinical Types
 * Medical and clinical care related data structures
 */

/**
 * Medication prescription and administration data
 */
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

/**
 * Record of medication administration event
 */
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
  student_name?: string; // Student who administered
  barcode_scanned_patient?: string; // Patient barcode scanned (for BCMA compliance)
  barcode_scanned_medication?: string; // Medication barcode scanned (for BCMA compliance)
}

/**
 * Doctor's order/prescription
 */
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

/**
 * Wound assessment data
 */
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

/**
 * Wound treatment record
 */
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
