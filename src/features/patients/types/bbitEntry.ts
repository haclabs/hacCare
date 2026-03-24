export interface BBITEntry {
  id?: string;
  patient_id?: string;
  tenant_id?: string;
  recorded_at?: string;
  time_label?: string;     // e.g. '0600', 'HS', 'Breakfast'
  student_name?: string;

  // Blood Glucose
  glucose_value?: number;  // mmol/L

  // Basal Insulin
  basal_name?: string;
  basal_dose?: number;
  basal_status?: 'given' | 'held';
  basal_held_reason?: 'Low BG' | 'NPO' | 'Provider order' | 'Other';
  basal_held_other?: string;

  // Bolus Insulin
  bolus_dose?: number;
  bolus_meal?: 'Breakfast' | 'Lunch' | 'Supper';
  bolus_status?: 'given' | 'not_given';
  bolus_not_given_reason?: 'Patient not eating' | 'NPO' | 'Refused';

  // Correction Insulin
  correction_dose?: number;
  correction_suggested_dose?: number;
  correction_status?: 'given' | 'not_required';

  // Hypoglycemia Management (when glucose < 4.0)
  hypo_juice?: boolean;
  hypo_dextrose_tabs?: boolean;
  hypo_iv_dextrose?: boolean;
  hypo_glucagon?: boolean;
  hypo_other?: string;
  hypo_recheck_completed?: boolean;

  // Carb Intake
  carb_intake?: 'full' | 'partial' | 'none';

  // Quick Notes
  note_symptomatic_hypo?: boolean;
  note_hyperglycemia_symptoms?: boolean;
  note_insulin_delay?: boolean;
  note_other?: string;

  created_at?: string;
}

export type BBITEntryInput = Omit<BBITEntry, 'id' | 'patient_id' | 'tenant_id' | 'created_at'>;
