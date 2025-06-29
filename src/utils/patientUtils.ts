// Utility functions for patient management

export const generatePatientId = (): string => {
  // Generate a 5-digit number for PTXXXXX format
  const randomNum = Math.floor(Math.random() * 90000) + 10000; // Ensures 5 digits
  return `PT${randomNum}`;
};

export const validatePatientId = (patientId: string): boolean => {
  // Validate PTXXXXX format
  const pattern = /^PT\d{5}$/;
  return pattern.test(patientId);
};

export const formatPatientName = (firstName: string, lastName: string): string => {
  return `${lastName.toUpperCase()}, ${firstName}`;
};

export const calculateAge = (dateOfBirth: string): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

export const getPatientRiskLevel = (patient: any): 'Low' | 'Medium' | 'High' | 'Critical' => {
  if (patient.condition === 'Critical') return 'Critical';
  if (patient.allergies.length > 2) return 'High';
  if (patient.allergies.length > 0) return 'Medium';
  return 'Low';
};