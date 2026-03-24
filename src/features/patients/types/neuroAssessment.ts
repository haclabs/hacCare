export interface NeuroAssessment {
  id?: string;
  patient_id?: string;
  tenant_id?: string;
  recorded_at?: string;
  student_name?: string;

  // Level of Consciousness (AVPU)
  level_of_consciousness?: 'Alert' | 'Voice' | 'Pain' | 'Unresponsive';

  // Orientation
  oriented_person?: boolean;
  oriented_place?: boolean;
  oriented_time?: boolean;
  oriented_event?: boolean;

  // Glasgow Coma Scale (eye 1-4, verbal 1-5, motor 1-6)
  gcs_eye?: number;
  gcs_verbal?: number;
  gcs_motor?: number;

  // Pupils
  pupils_equal?: boolean;
  pupil_left_size?: number;
  pupil_left_reaction?: 'Brisk' | 'Sluggish' | 'Fixed' | 'Absent';
  pupil_right_size?: number;
  pupil_right_reaction?: 'Brisk' | 'Sluggish' | 'Fixed' | 'Absent';

  // Limb Strength (MRC 0-5)
  strength_right_arm?: number;
  strength_left_arm?: number;
  strength_right_leg?: number;
  strength_left_leg?: number;

  // Other
  sensation?: 'Normal' | 'Reduced' | 'Absent' | 'Abnormal';
  speech?: 'Clear' | 'Slurred' | 'Confused' | 'Aphasia' | 'None';
  pain_score?: number;

  created_at?: string;
}

export type NeuroAssessmentInput = Omit<NeuroAssessment, 'id' | 'patient_id' | 'tenant_id' | 'created_at'>;
