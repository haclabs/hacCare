export interface Patient {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'Male' | 'Female' | 'Other';
  room_number: string;
  bed_number: string;
  admission_date: string;
  condition: 'Critical' | 'Stable' | 'Improving' | 'Discharged';
  diagnosis: string;
  allergies: string[];
  blood_type: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  assigned_nurse: string;
  vitals: VitalSigns[];
  medications: Medication[];
  notes: PatientNote[];
}

export interface VitalSigns {
  id?: string;
  temperature: number;
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
  heartRate: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  lastUpdated?: string;
  recorded_at?: string;
}

export interface Medication {
  id: string;
  name: string;
  category?: 'scheduled' | 'unscheduled' | 'prn' | 'continuous';
  dosage: string;
  frequency: string;
  route: string;
  start_date: string;
  end_date?: string;
  prescribed_by: string;
  last_administered?: string;
  next_due: string;
  status: 'Active' | 'Completed' | 'Discontinued';
  administrations?: MedicationAdministration[];
}

export interface MedicationAdministration {
  id?: string;
  medication_id?: string;
  patient_id?: string;
  administered_by: string;
  administered_by_id?: string;
  timestamp: string;
  notes?: string;
}

export interface PatientNote {
  id: string;
  created_at: string;
  nurse_id: string;
  nurse_name: string;
  type: 'Assessment' | 'Medication' | 'Vital Signs' | 'General' | 'Incident';
  content: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface Nurse {
  id: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  department: string;
  shift: 'Day' | 'Evening' | 'Night';
  email: string;
  phone: string;
  specializations: string[];
}

export interface Alert {
  id: string;
  patientId: string;
  patientName: string;
  type: 'Medication Due' | 'Vital Signs Alert' | 'Emergency' | 'Discharge Ready' | 'Lab Results';
  message: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  timestamp: string;
  acknowledged: boolean;
}