/**
 * Lab Order Constants
 * Comprehensive dropdown options for lab specimen orders
 */

// Procedure categories and their associated test types
export const LAB_PROCEDURES = {
  'Urine Specimens': [
    'U/A (Urinalysis)',
    'C&S (Culture and Sensitivity)',
    'Urine for Pregnancy Test (hCG)',
    '24-Hour Urine Collection',
    'Urine for Cytology',
    'Urine for Protein/Creatinine Ratio',
    'Urine for Drugs of Abuse'
  ],
  'Swabs / Cultures': [
    'MRSA Swab (nasal or groin)',
    'COVID-19 Swab (nasopharyngeal, throat, or combined)',
    'Throat Swab (C&S)',
    'Wound Swab',
    'Eye Swab',
    'Ear Swab',
    'Vaginal / Cervical Swab',
    'Rectal Swab',
    'Stool for C. difficile Toxin or Culture',
    'Nasal Swab (Influenza, RSV, etc.)'
  ],
  'Blood Specimens': [
    'Blood Culture',
    'CBC (Complete Blood Count)',
    'Chemistry Panel (e.g., Electrolytes, Renal, Liver)',
    'Blood Glucose',
    'INR / PT / PTT (Coagulation Studies)',
    'Troponin',
    'Lactate',
    'Type and Screen / Crossmatch',
    'Venous Blood Gas / Arterial Blood Gas'
  ],
  'Stool Specimens': [
    'Stool for Ova and Parasites',
    'Stool for Occult Blood / FIT Test',
    'Stool for C&S',
    'Stool for C. difficile Toxin'
  ],
  'Sputum / Respiratory Specimens': [
    'Sputum for C&S',
    'Sputum for AFB (Acid-Fast Bacilli / TB)',
    'Sputum Cytology',
    'Nasopharyngeal Aspirate (for viral testing)'
  ],
  'Other Body Fluids': [
    'CSF (Cerebrospinal Fluid)',
    'Pleural Fluid',
    'Peritoneal / Ascitic Fluid',
    'Synovial Fluid (Joint Aspirate)',
    'Wound Drainage / Exudate',
    'Pericardial Fluid'
  ]
};

// Source categories and their associated collection sites
export const LAB_SOURCES = {
  'Urine Sources': [
    'Free catch / Midstream',
    'In-and-out catheter',
    'Catheter port',
    'Urostomy',
    'Suprapubic aspirate'
  ],
  'Respiratory Sources': [
    'Nares (nasal)',
    'Nasopharyngeal',
    'Throat / Oral',
    'Sputum',
    'Tracheal aspirate',
    'Endotracheal tube',
    'Bronchial wash / BAL'
  ],
  'Wound / Skin Sources': [
    'Wound (superficial or deep)',
    'Drain site',
    'Decubitus / pressure injury',
    'Skin / lesion',
    'Abscess',
    'Surgical incision'
  ],
  'Blood Sources': [
    'Venous',
    'Arterial',
    'Central line',
    'Peripheral line',
    'Capillary (fingerstick or heelstick)'
  ],
  'Gastrointestinal / Genitourinary Sources': [
    'Rectal',
    'Stool',
    'Perineum',
    'Vaginal',
    'Cervical',
    'Urethral'
  ],
  'Other Body Sites': [
    'Eye / Conjunctiva',
    'Ear / External canal',
    'CSF (lumbar puncture)',
    'Pleural fluid',
    'Ascitic fluid',
    'Synovial fluid'
  ]
};

// Get procedure categories (top level)
export const getProcedureCategories = (): string[] => {
  return Object.keys(LAB_PROCEDURES);
};

// Get procedure types for a given category
export const getProcedureTypes = (category: string): string[] => {
  return LAB_PROCEDURES[category as keyof typeof LAB_PROCEDURES] || [];
};

// Get source categories (top level)
export const getSourceCategories = (): string[] => {
  return Object.keys(LAB_SOURCES);
};

// Get source types for a given category
export const getSourceTypes = (category: string): string[] => {
  return LAB_SOURCES[category as keyof typeof LAB_SOURCES] || [];
};

// TypeScript types
export interface LabOrder {
  id: string;
  tenant_id: string;
  patient_id: string;
  order_date: string;
  order_time: string;
  procedure_category: string;
  procedure_type: string;
  source_category: string;
  source_type: string;
  student_name: string;
  initials?: string; // Legacy field, use student_name instead
  verified_by: string;
  status: string;
  notes?: string;
  label_printed: boolean;
  label_printed_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLabOrderInput {
  patient_id: string;
  order_date: string;
  order_time: string;
  procedure_category: string;
  procedure_type: string;
  source_category: string;
  source_type: string;
  student_name: string;
  verified_by: string;
  notes?: string;
}
