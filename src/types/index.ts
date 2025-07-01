export interface Patient {
  id: string;
  patient_id: string; // Database field name
  first_name: string; // Database field name
  last_name: string; // Database field name
  date_of_birth: string; // Database field name
  gender: 'Male' | 'Female' | 'Other';
  room_number: string; // Database field name
  bed_number: string; // Database field name
  admission_date: string; // Database field name
  condition: 'Critical' | 'Stable' | 'Improving' | 'Discharged';
  diagnosis: string;
  allergies: string[];
  blood_type: string; // Database field name
  emergency_contact_name: string; // Database field name
  emergency_contact_relationship: string; // Database field name
  emergency_contact_phone: string; // Database field name
  assigned_nurse: string; // Database field name
  vitals: VitalSigns[]; // Changed to array
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
  lastUpdated?: string; // For compatibility
  recorded_at?: string; // Database field name
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  start_date: string; // Database field name
  end_date?: string; // Database field name
  prescribed_by: string; // Database field name
  last_administered?: string; // Database field name
  next_due: string; // Database field name
  status: 'Active' | 'Completed' | 'Discontinued';
}

export interface PatientNote {
  id: string;
  created_at: string; // Database field name
  nurse_id: string; // Database field name
  nurse_name: string; // Database field name
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