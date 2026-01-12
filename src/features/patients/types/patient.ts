/**
 * Patient Types
 * Core patient data structures and related types
 */

import type { Medication, WoundAssessment } from '../../clinical/types';

/**
 * Main Patient interface representing a patient record
 */
export interface Patient {
  id: string;
  patient_id: string;
  tenant_id?: string;
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
  avatar_id?: string; // Patient avatar identifier (avatar-1 through avatar-10)
  vitals: VitalSigns[];
  medications?: Medication[]; // Optional since medications are loaded separately
  notes: PatientNote[];
  wound_assessments?: WoundAssessment[]; // Optional wound care data
}

/**
 * Vital signs measurement data
 */
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
  oxygenDelivery?: string; // Room Air, Nasal Prongs, Simple Mask, Non-Rebreather, etc.
  oxygenFlowRate?: string; // N/A, <1L, 1L-15L, >15L
  lastUpdated?: string;
  recorded_at?: string;
}

/**
 * Patient clinical note/documentation
 */
export interface PatientNote {
  id: string;
  created_at?: string;
  createdAt?: string;
  nurse_id?: string;
  nurse_name?: string;
  type: 'Assessment' | 'Medication' | 'Vital Signs' | 'General' | 'Incident';
  content: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  patient_id?: string;
  student_name?: string;
}
