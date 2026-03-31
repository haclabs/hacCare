// Physical observation checkbox arrays for each body system section.
// Each key holds an array of selected option strings.
export interface PhysicalObservations {
  head?: {
    scalp_skull_normal?: string[];
    scalp_skull_variance?: string[];
    scalp_skull_other?: string;
    facial_appearance_normal?: string[];
    facial_appearance_variance?: string[];
    anterior_fontanelle_normal?: string[];
    anterior_fontanelle_variance?: string[];
    posterior_fontanelle_normal?: string[];
    posterior_fontanelle_variance?: string[];
    eyes_normal?: string[];
    eyes_variance?: string[];
    eyes_other?: string;
    ears_normal?: string[];
    ears_variance?: string[];
    ears_other?: string;
    nose_normal?: string[];
    nose_variance?: string[];
    nose_other?: string;
    mouth_normal?: string[];
    mouth_variance?: string[];
    mouth_other?: string;
  };
  neck?: {
    neck_normal?: string[];
    neck_variance?: string[];
    neck_other?: string;
  };
  chest?: {
    shape_normal?: string[];
    shape_variance?: string[];
    shape_other?: string;
    breasts_normal?: string[];
    breasts_variance?: string[];
    breasts_other?: string;
  };
  cardiovascular?: {
    rate_normal?: string[];
    rate_variance?: string[];
    rhythm_normal?: string[];
    rhythm_variance?: string[];
  };
  respiratory?: {
    air_entry_normal?: string[];
    air_entry_variance?: string[];
    breath_sounds_normal?: string[];
    breath_sounds_variance?: string[];
    breath_sounds_other?: string;
    rate_normal?: string[];
    rate_variance?: string[];
    effort_normal?: string[];
    effort_variance?: string[];
  };
  abdomen?: {
    shape_normal?: string[];
    shape_variance?: string[];
    shape_other?: string;
    bowel_sounds_normal?: string[];
    bowel_sounds_variance?: string[];
    umbilical_cord_normal?: string[];
    umbilical_cord_variance?: string[];
  };
  skeletal?: {
    extremities_normal?: string[];
    extremities_variance?: string[];
    extremities_other?: string;
    spine_normal?: string[];
    spine_variance?: string[];
    spine_other?: string;
  };
  genitalia?: {
    gender_normal?: string[];
    gender_variance?: string[];
    male_normal?: string[];
    male_variance?: string[];
    male_other?: string;
    female_normal?: string[];
    female_variance?: string[];
    female_other?: string;
  };
  skin?: {
    integrity_normal?: string[];
    integrity_variance?: string[];
    turgor_normal?: string[];
    turgor_variance?: string[];
    color_normal?: string[];
    color_variance?: string[];
    color_other?: string;
  };
  neuromuscular?: {
    tone_normal?: string[];
    tone_variance?: string[];
    tone_other?: string;
    reflexes_normal?: string[];
    reflexes_variance_specify?: string;
    cry_normal?: string[];
    cry_variance?: string[];
  };
}

export interface NewbornAssessment {
  id?: string;
  patient_id?: string;
  tenant_id?: string;

  // Birth details
  time_of_birth?: string;          // HH:MM string
  weight_grams?: number | null;
  length_cm?: number | null;
  head_circumference_cm?: number | null;
  head_circumference_1hr_cm?: number | null;
  head_circumference_2hr_cm?: number | null;

  // APGAR scores
  apgar_1min?: number | null;
  apgar_5min?: number | null;
  apgar_10min?: number | null;

  // Vitamin K
  vitamin_k_given?: boolean;
  vitamin_k_declined?: boolean;
  vitamin_k_dose?: '0.5mg' | '1.0mg' | null;
  vitamin_k_site?: string | null;
  vitamin_k_date?: string | null;   // ISO date
  vitamin_k_time?: string | null;
  vitamin_k_signature?: string | null;

  // Erythromycin
  erythromycin_given?: boolean;
  erythromycin_date?: string | null;
  erythromycin_time?: string | null;
  erythromycin_signature?: string | null;

  // Physical observations JSONB
  physical_observations?: PhysicalObservations;

  // Completion
  completed_by?: string | null;
  completed_initials?: string | null;
  student_name?: string | null;

  recorded_at?: string;
  created_at?: string;
}

export type NewbornAssessmentInput = Omit<NewbornAssessment, 'id' | 'patient_id' | 'tenant_id' | 'created_at'>;
