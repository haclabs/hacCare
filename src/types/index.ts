export interface Patient {
  id: string;
  patientId: string; // New field for PTXXXXX format
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  roomNumber: string;
  bedNumber: string;
  admissionDate: string;
  condition: 'Critical' | 'Stable' | 'Improving' | 'Discharged';
  diagnosis: string; // New field for patient diagnosis
  allergies: string[];
  bloodType: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  assignedNurse: string;
  vitals: VitalSigns;
  medications: Medication[];
  notes: PatientNote[];
}

export interface VitalSigns {
  temperature: number;
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
  heartRate: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  lastUpdated: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: string;
  endDate?: string;
  prescribedBy: string;
  lastAdministered?: string;
  nextDue: string;
  status: 'Active' | 'Completed' | 'Discontinued';
}

export interface PatientNote {
  id: string;
  timestamp: string;
  nurseId: string;
  nurseName: string;
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