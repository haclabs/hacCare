/**
 * Vital Signs Reference Ranges by Age
 * 
 * Provides age-appropriate normal ranges for vital signs assessment.
 * Uses precise age calculation (days for newborns, months for infants, years for older patients).
 * 
 * Based on pediatric clinical standards for simulated EMR education.
 */

/**
 * Age band categories for vital signs reference
 */
export type AgeBand = 
  | 'NEWBORN'      // 0-28 days
  | 'INFANT'       // 1-12 months
  | 'TODDLER'      // 1-3 years
  | 'PRESCHOOL'    // 3-5 years
  | 'SCHOOL_AGE'   // 6-12 years
  | 'ADOLESCENT'   // 13-18 years
  | 'ADULT';       // 18+ years

/**
 * Age calculation result with multiple precision levels
 */
export interface PatientAge {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  ageBand: AgeBand;
  displayString: string; // e.g., "3 days old", "8 months old", "5 years old"
}

/**
 * Vital sign range definition
 */
export interface VitalRange {
  min: number;
  max: number;
  criticalLow: number;
  criticalHigh: number;
  unit: string;
}

/**
 * Complete vital signs reference ranges for an age band
 */
export interface AgeBandVitalRanges {
  ageBand: AgeBand;
  ageDescription: string;
  temperature: VitalRange;          // °C
  heartRate: VitalRange;            // BPM
  systolic: VitalRange;             // mmHg
  diastolic: VitalRange;            // mmHg
  respiratoryRate: VitalRange;      // breaths/min
  oxygenSaturation: VitalRange;     // %
}

/**
 * Calculate precise age from date of birth
 * Returns days, months, years, and appropriate age band
 */
export function calculatePreciseAge(dateOfBirth: string): PatientAge {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  
  // Calculate total days
  const timeDiff = today.getTime() - birthDate.getTime();
  const totalDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  
  // Calculate years, months, days
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();
  
  // Adjust for negative days
  if (days < 0) {
    months--;
    const previousMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += previousMonth.getDate();
  }
  
  // Adjust for negative months
  if (months < 0) {
    years--;
    months += 12;
  }
  
  // Determine age band
  let ageBand: AgeBand;
  let displayString: string;
  
  if (totalDays <= 28) {
    ageBand = 'NEWBORN';
    displayString = totalDays === 1 ? '1 day old' : `${totalDays} days old`;
  } else if (years === 0 && months <= 12) {
    ageBand = 'INFANT';
    displayString = months === 1 ? '1 month old' : `${months} months old`;
  } else if (years >= 1 && years < 3) {
    ageBand = 'TODDLER';
    displayString = years === 1 ? '1 year old' : `${years} years old`;
  } else if (years >= 3 && years < 6) {
    ageBand = 'PRESCHOOL';
    displayString = `${years} years old`;
  } else if (years >= 6 && years < 13) {
    ageBand = 'SCHOOL_AGE';
    displayString = `${years} years old`;
  } else if (years >= 13 && years < 18) {
    ageBand = 'ADOLESCENT';
    displayString = `${years} years old`;
  } else {
    ageBand = 'ADULT';
    displayString = `${years} years old`;
  }
  
  return {
    years,
    months,
    days,
    totalDays,
    ageBand,
    displayString
  };
}

/**
 * Get vital signs reference ranges for a specific age band
 */
export function getVitalRangesForAgeBand(ageBand: AgeBand): AgeBandVitalRanges {
  const ranges: Record<AgeBand, AgeBandVitalRanges> = {
    NEWBORN: {
      ageBand: 'NEWBORN',
      ageDescription: 'Newborn (0-28 days)',
      temperature: { min: 36.5, max: 37.5, criticalLow: 36.0, criticalHigh: 38.0, unit: '°C' },
      heartRate: { min: 120, max: 160, criticalLow: 100, criticalHigh: 180, unit: 'BPM' },
      systolic: { min: 60, max: 90, criticalLow: 50, criticalHigh: 100, unit: 'mmHg' },
      diastolic: { min: 30, max: 60, criticalLow: 25, criticalHigh: 70, unit: 'mmHg' },
      respiratoryRate: { min: 30, max: 60, criticalLow: 25, criticalHigh: 70, unit: '/min' },
      oxygenSaturation: { min: 95, max: 100, criticalLow: 90, criticalHigh: 100, unit: '%' }
    },
    
    INFANT: {
      ageBand: 'INFANT',
      ageDescription: 'Infant (1-12 months)',
      temperature: { min: 36.5, max: 37.5, criticalLow: 36.0, criticalHigh: 38.5, unit: '°C' },
      heartRate: { min: 100, max: 150, criticalLow: 80, criticalHigh: 170, unit: 'BPM' },
      systolic: { min: 70, max: 100, criticalLow: 60, criticalHigh: 110, unit: 'mmHg' },
      diastolic: { min: 35, max: 65, criticalLow: 30, criticalHigh: 75, unit: 'mmHg' },
      respiratoryRate: { min: 25, max: 50, criticalLow: 20, criticalHigh: 60, unit: '/min' },
      oxygenSaturation: { min: 95, max: 100, criticalLow: 90, criticalHigh: 100, unit: '%' }
    },
    
    TODDLER: {
      ageBand: 'TODDLER',
      ageDescription: 'Toddler (1-3 years)',
      temperature: { min: 36.5, max: 37.5, criticalLow: 36.0, criticalHigh: 39.0, unit: '°C' },
      heartRate: { min: 90, max: 140, criticalLow: 70, criticalHigh: 160, unit: 'BPM' },
      systolic: { min: 80, max: 110, criticalLow: 70, criticalHigh: 120, unit: 'mmHg' },
      diastolic: { min: 40, max: 70, criticalLow: 35, criticalHigh: 80, unit: 'mmHg' },
      respiratoryRate: { min: 20, max: 40, criticalLow: 15, criticalHigh: 50, unit: '/min' },
      oxygenSaturation: { min: 95, max: 100, criticalLow: 90, criticalHigh: 100, unit: '%' }
    },
    
    PRESCHOOL: {
      ageBand: 'PRESCHOOL',
      ageDescription: 'Preschool (3-5 years)',
      temperature: { min: 36.5, max: 37.5, criticalLow: 36.0, criticalHigh: 39.5, unit: '°C' },
      heartRate: { min: 80, max: 120, criticalLow: 65, criticalHigh: 140, unit: 'BPM' },
      systolic: { min: 85, max: 115, criticalLow: 75, criticalHigh: 125, unit: 'mmHg' },
      diastolic: { min: 45, max: 75, criticalLow: 40, criticalHigh: 85, unit: 'mmHg' },
      respiratoryRate: { min: 20, max: 30, criticalLow: 15, criticalHigh: 40, unit: '/min' },
      oxygenSaturation: { min: 95, max: 100, criticalLow: 90, criticalHigh: 100, unit: '%' }
    },
    
    SCHOOL_AGE: {
      ageBand: 'SCHOOL_AGE',
      ageDescription: 'School Age (6-12 years)',
      temperature: { min: 36.5, max: 37.5, criticalLow: 36.0, criticalHigh: 39.5, unit: '°C' },
      heartRate: { min: 70, max: 110, criticalLow: 55, criticalHigh: 130, unit: 'BPM' },
      systolic: { min: 90, max: 120, criticalLow: 80, criticalHigh: 135, unit: 'mmHg' },
      diastolic: { min: 50, max: 80, criticalLow: 45, criticalHigh: 90, unit: 'mmHg' },
      respiratoryRate: { min: 18, max: 25, criticalLow: 12, criticalHigh: 35, unit: '/min' },
      oxygenSaturation: { min: 95, max: 100, criticalLow: 90, criticalHigh: 100, unit: '%' }
    },
    
    ADOLESCENT: {
      ageBand: 'ADOLESCENT',
      ageDescription: 'Adolescent (13-18 years)',
      temperature: { min: 36.1, max: 37.2, criticalLow: 35.5, criticalHigh: 39.5, unit: '°C' },
      heartRate: { min: 60, max: 100, criticalLow: 50, criticalHigh: 120, unit: 'BPM' },
      systolic: { min: 95, max: 130, criticalLow: 85, criticalHigh: 145, unit: 'mmHg' },
      diastolic: { min: 55, max: 85, criticalLow: 50, criticalHigh: 95, unit: 'mmHg' },
      respiratoryRate: { min: 12, max: 20, criticalLow: 10, criticalHigh: 30, unit: '/min' },
      oxygenSaturation: { min: 95, max: 100, criticalLow: 90, criticalHigh: 100, unit: '%' }
    },
    
    ADULT: {
      ageBand: 'ADULT',
      ageDescription: 'Adult (18+ years)',
      temperature: { min: 36.1, max: 37.2, criticalLow: 35.0, criticalHigh: 40.0, unit: '°C' },
      heartRate: { min: 60, max: 100, criticalLow: 40, criticalHigh: 150, unit: 'BPM' },
      systolic: { min: 90, max: 140, criticalLow: 80, criticalHigh: 180, unit: 'mmHg' },
      diastolic: { min: 60, max: 90, criticalLow: 50, criticalHigh: 110, unit: 'mmHg' },
      respiratoryRate: { min: 12, max: 20, criticalLow: 8, criticalHigh: 30, unit: '/min' },
      oxygenSaturation: { min: 95, max: 100, criticalLow: 90, criticalHigh: 100, unit: '%' }
    }
  };
  
  return ranges[ageBand];
}

/**
 * Get vital ranges directly from date of birth
 */
export function getVitalRangesForPatient(dateOfBirth: string): AgeBandVitalRanges {
  const age = calculatePreciseAge(dateOfBirth);
  return getVitalRangesForAgeBand(age.ageBand);
}

/**
 * Vital sign status classification
 */
export type VitalStatus = 'normal' | 'abnormal' | 'critical';

/**
 * Vital sign assessment result
 */
export interface VitalAssessment {
  status: VitalStatus;
  value: number;
  range: VitalRange;
  ageBand: AgeBand;
  message: string;
  color: string; // CSS class for visual indication
  bgColor: string; // CSS class for background
}

/**
 * Assess a specific vital sign value against age-appropriate ranges
 */
export function assessVitalSign(
  vitalType: keyof Omit<AgeBandVitalRanges, 'ageBand' | 'ageDescription'>,
  value: number,
  dateOfBirth: string
): VitalAssessment {
  const age = calculatePreciseAge(dateOfBirth);
  const ranges = getVitalRangesForAgeBand(age.ageBand);
  const range = ranges[vitalType] as VitalRange;
  
  let status: VitalStatus;
  let message: string;
  let color: string;
  let bgColor: string;
  
  // Critical ranges
  if (value <= range.criticalLow || value >= range.criticalHigh) {
    status = 'critical';
    message = value <= range.criticalLow ? 'Critically Low' : 'Critically High';
    color = 'text-red-600';
    bgColor = 'bg-red-50';
  }
  // Abnormal but not critical
  else if (value < range.min || value > range.max) {
    status = 'abnormal';
    message = value < range.min ? 'Below Normal' : 'Above Normal';
    color = 'text-yellow-600';
    bgColor = 'bg-yellow-50';
  }
  // Normal range
  else {
    status = 'normal';
    message = 'Normal';
    color = 'text-green-600';
    bgColor = 'bg-green-50';
  }
  
  return {
    status,
    value,
    range,
    ageBand: age.ageBand,
    message,
    color,
    bgColor
  };
}

/**
 * Get formatted range string for display
 * Example: "60-100 BPM" or "36.1-37.2°C"
 */
export function formatVitalRange(range: VitalRange, showCritical: boolean = false): string {
  if (showCritical) {
    return `Critical: <${range.criticalLow} or >${range.criticalHigh} ${range.unit} | Normal: ${range.min}-${range.max} ${range.unit}`;
  }
  return `${range.min}-${range.max} ${range.unit}`;
}

/**
 * Backward compatibility: Get vital status using old function signature
 * This maintains compatibility with existing code while using new age-based logic
 */
export function getVitalStatusLegacy(
  vital: string, 
  value: number, 
  dateOfBirth?: string
): string {
  // If no date of birth provided, use adult ranges (backward compatible)
  if (!dateOfBirth) {
    return getVitalStatusAdult(vital, value);
  }
  
  // Map legacy vital names to new type system
  const vitalTypeMap: Record<string, keyof Omit<AgeBandVitalRanges, 'ageBand' | 'ageDescription'>> = {
    'temperature': 'temperature',
    'heartRate': 'heartRate',
    'bloodPressureSystolic': 'systolic',
    'bloodPressureDiastolic': 'diastolic',
    'respiratoryRate': 'respiratoryRate',
    'oxygenSaturation': 'oxygenSaturation'
  };
  
  const vitalType = vitalTypeMap[vital];
  if (!vitalType) {
    return 'text-gray-600 bg-gray-50';
  }
  
  const assessment = assessVitalSign(vitalType, value, dateOfBirth);
  return `${assessment.color} ${assessment.bgColor}`;
}

/**
 * Adult-only vital status (backward compatibility)
 */
function getVitalStatusAdult(vital: string, value: number): string {
  switch (vital) {
    case 'temperature':
      if (value < 36.0 || value > 38.0) return 'text-red-600 bg-red-50';
      return 'text-green-600 bg-green-50';
    case 'heartRate':
      if (value < 60 || value > 100) return 'text-red-600 bg-red-50';
      return 'text-green-600 bg-green-50';
    case 'bloodPressureSystolic':
      if (value < 90 || value > 140) return 'text-red-600 bg-red-50';
      return 'text-green-600 bg-green-50';
    case 'bloodPressureDiastolic':
      if (value < 60 || value > 90) return 'text-red-600 bg-red-50';
      return 'text-green-600 bg-green-50';
    case 'respiratoryRate':
      if (value < 12 || value > 20) return 'text-red-600 bg-red-50';
      return 'text-green-600 bg-green-50';
    case 'oxygenSaturation':
      if (value < 95) return 'text-red-600 bg-red-50';
      return 'text-green-600 bg-green-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

/**
 * Get all age bands with their descriptions
 */
export function getAllAgeBands(): Array<{ id: AgeBand; description: string }> {
  return [
    { id: 'NEWBORN', description: 'Newborn (0-28 days)' },
    { id: 'INFANT', description: 'Infant (1-12 months)' },
    { id: 'TODDLER', description: 'Toddler (1-3 years)' },
    { id: 'PRESCHOOL', description: 'Preschool (3-5 years)' },
    { id: 'SCHOOL_AGE', description: 'School Age (6-12 years)' },
    { id: 'ADOLESCENT', description: 'Adolescent (13-18 years)' },
    { id: 'ADULT', description: 'Adult (18+ years)' }
  ];
}
