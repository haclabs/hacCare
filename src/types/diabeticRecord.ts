/**
 * Diabetic Record Types and Interfaces
 * Supports BBIT (Basal-Bolus Insulin Therapy) management
 */

// Insulin types for each category
export const BASAL_INSULIN_TYPES = [
  'LANTUS',
  'LEVEMIR',
  'TRESIBA',
  'TOUJEO',
  'BASAGLAR'
] as const;

export const BOLUS_INSULIN_TYPES = [
  'HUMALOG',
  'NOVOLOG',
  'APIDRA',
  'FIASP',
  'LYUMJEV'
] as const;

export const CORRECTION_INSULIN_TYPES = [
  'HUMALOG',
  'NOVOLOG',
  'APIDRA',
  'FIASP',
  'LYUMJEV'
] as const;

// Reading types for different times of day
export const READING_TYPES = [
  'AC',
  'PC', 
  'HS',
  'AM',
  'PRN'
] as const;



export type BasalInsulinType = typeof BASAL_INSULIN_TYPES[number];
export type BolusInsulinType = typeof BOLUS_INSULIN_TYPES[number];
export type CorrectionInsulinType = typeof CORRECTION_INSULIN_TYPES[number];
export type ReadingType = typeof READING_TYPES[number];

// Insulin administration record
export interface InsulinAdministration {
  type: string;
  category: 'Basal' | 'Bolus' | 'Correction' | 'Other';
  units: number;
  timeAdministered: string; // HH:MM format
  injectionSite?: string;
}

// Main diabetic record entry (following patient_vitals pattern)
export interface DiabeticRecord {
  id: string;
  tenantId: string;
  patientId: string;
  recordedBy?: string;
  date: string; // YYYY-MM-DD format
  timeCbgTaken: string; // HH:MM format
  readingType: ReadingType;
  glucoseReading: number; // mmol/L
  
  // Insulin administrations
  basalInsulin?: InsulinAdministration;
  bolusInsulin?: InsulinAdministration;
  correctionInsulin?: InsulinAdministration;
  otherInsulin?: InsulinAdministration;
  
  // Additional fields
  treatmentsGiven?: string;
  commentsForPhysician?: string;
  signature?: string;
  
  // Metadata (following patient_vitals pattern)
  recordedAt: string;
  createdAt: string;
}

// Form data structure for input
export interface DiabeticRecordFormData {
  date: string;
  timeCbgTaken: string;
  readingType: ReadingType;
  glucoseReading: string; // String for form input, converted to number
  
  // Basal insulin
  basalInsulinType?: BasalInsulinType;
  basalInsulinUnits?: string;
  basalTimeAdministered?: string;
  basalInjectionSite?: string;
  
  // Bolus insulin
  bolusInsulinType?: BolusInsulinType;
  bolusInsulinUnits?: string;
  bolusTimeAdministered?: string;
  bolusInjectionSite?: string;
  
  // Correction insulin
  correctionInsulinType?: CorrectionInsulinType;
  correctionInsulinUnits?: string;
  correctionTimeAdministered?: string;
  correctionInjectionSite?: string;
  
  // Other insulin
  otherInsulinType?: string;
  otherInsulinUnits?: string;
  otherTimeAdministered?: string;
  otherInjectionSite?: string;
  
  treatmentsGiven?: string;
  commentsForPhysician?: string;
  signature?: string;
}

// Glucose trend data point for graphing
export interface GlucoseTrendPoint {
  timestamp: string;
  glucoseLevel: number;
  readingType: ReadingType;
  insulinGiven?: {
    basal?: number;
    bolus?: number;
    correction?: number;
  };
}

// Constants for glucose level ranges
export const GLUCOSE_RANGES = {
  LOW: 5, // mmol/L
  HIGH: 10, // mmol/L
  CRITICAL_LOW: 3,
  CRITICAL_HIGH: 15
} as const;

// Helper function to determine glucose level status
export const getGlucoseStatus = (level: number): 'Normal' | 'Low' | 'High' | 'Critical Low' | 'Critical High' => {
  if (level < GLUCOSE_RANGES.CRITICAL_LOW) return 'Critical Low';
  if (level < GLUCOSE_RANGES.LOW) return 'Low';
  if (level > GLUCOSE_RANGES.CRITICAL_HIGH) return 'Critical High';
  if (level > GLUCOSE_RANGES.HIGH) return 'High';
  return 'Normal';
};

// Helper function to get status color
export const getGlucoseStatusColor = (status: string): string => {
  switch (status) {
    case 'Critical Low':
    case 'Critical High':
      return 'text-red-700 bg-red-100';
    case 'Low':
    case 'High':
      return 'text-yellow-700 bg-yellow-100';
    case 'Normal':
      return 'text-green-700 bg-green-100';
    default:
      return 'text-gray-700 bg-gray-100';
  }
};

// Utility functions for current date and time
export const getCurrentDate = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

export const getCurrentTime = (): string => {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
};
