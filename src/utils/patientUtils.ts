/**
 * Patient Utility Functions
 * 
 * Collection of utility functions for patient management operations.
 * Includes ID generation, validation, formatting, and risk assessment.
 */

import { format, isValid, parseISO } from 'date-fns';

/**
 * Generate a unique patient ID in PTXXXXX format
 * Creates a 5-digit patient identifier with PT prefix
 * 
 * @returns {string} Generated patient ID (e.g., "PT12345")
 */
export const generatePatientId = (): string => {
  // Generate a 5-digit number for PTXXXXX format
  const randomNum = Math.floor(Math.random() * 90000) + 10000; // Ensures 5 digits
  return `PT${randomNum}`;
};

/**
 * Validate patient ID format
 * Checks if the patient ID follows the PTXXXXX pattern
 * 
 * @param {string} patientId - Patient ID to validate
 * @returns {boolean} True if valid format, false otherwise
 */
export const validatePatientId = (patientId: string): boolean => {
  // Validate PTXXXXX format
  const pattern = /^PT\d{5}$/;
  return pattern.test(patientId);
};

/**
 * Format patient name for display
 * Returns name in "LASTNAME, Firstname" format
 * 
 * @param {string} firstName - Patient's first name
 * @param {string} lastName - Patient's last name
 * @returns {string} Formatted name string
 */
export const formatPatientName = (firstName: string, lastName: string): string => {
  return `${lastName.toUpperCase()}, ${firstName}`;
};

/**
 * Calculate patient age from date of birth
 * Accurately calculates age considering month and day
 * 
 * @param {string} dateOfBirth - Date of birth in YYYY-MM-DD format
 * @returns {number} Age in years
 */
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

/**
 * Assess patient risk level based on condition and allergies
 * Determines risk level for care planning and resource allocation
 * 
 * @param {any} patient - Patient object with condition and allergies
 * @returns {'Low' | 'Medium' | 'High' | 'Critical'} Risk level assessment
 */
export const getPatientRiskLevel = (patient: any): 'Low' | 'Medium' | 'High' | 'Critical' => {
  if (patient.condition === 'Critical') return 'Critical';
  if (patient.allergies.length > 2) return 'High';
  if (patient.allergies.length > 0) return 'Medium';
  return 'Low';
};

/**
 * Format room and bed number for display
 * Creates a standardized room/bed identifier
 * 
 * @param {string} roomNumber - Room number
 * @param {string} bedNumber - Bed identifier (A, B, C, D)
 * @returns {string} Formatted room/bed string (e.g., "302A")
 */
export const formatRoomBed = (roomNumber: string, bedNumber: string): string => {
  return `${roomNumber}${bedNumber}`;
};

/**
 * Validate phone number format
 * Checks if phone number is in valid format
 * 
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid format
 */
export const validatePhoneNumber = (phone: string): boolean => {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Check if it's exactly 10 digits
  if (digitsOnly.length === 10) {
    return true;
  }
  
  // Check if it matches (XXX) XXX-XXXX format
  const formattedPattern = /^\(\d{3}\)\s\d{3}-\d{4}$/;
  return formattedPattern.test(phone);
};

/**
 * Format phone number for display
 * Converts phone number to (XXX) XXX-XXXX format
 * 
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phone: string): string => {
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length === 10) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  }
  
  return phone; // Return original if not 10 digits
};

/**
 * Generate patient search keywords
 * Creates searchable keywords from patient data
 * 
 * @param {any} patient - Patient object
 * @returns {string[]} Array of search keywords
 */
export const generateSearchKeywords = (patient: any): string[] => {
  const keywords = [
    patient.firstName.toLowerCase(),
    patient.lastName.toLowerCase(),
    patient.patientId.toLowerCase(),
    formatRoomBed(patient.roomNumber, patient.bedNumber).toLowerCase(),
    patient.condition.toLowerCase(),
    patient.diagnosis.toLowerCase(),
    ...patient.allergies.map((allergy: string) => allergy.toLowerCase())
  ];
  
  return keywords.filter(keyword => keyword.length > 0);
};

/**
 * Format date/time for display
 * Converts date to readable format with time
 * 
 * @param {string | Date | null} dateValue - Date value to format
 * @returns {string} Formatted date string or 'N/A' if invalid
 */
export const formatTime = (dateValue: string | Date | null): string => {
  if (!dateValue) return 'N/A';
  
  try {
    let date: Date;
    
    if (typeof dateValue === 'string') {
      date = parseISO(dateValue);
    } else {
      date = dateValue;
    }
    
    if (!isValid(date)) return 'N/A';
    
    return format(date, 'MMM dd, yyyy HH:mm');
  } catch (error) {
    return 'N/A';
  }
};

export const getVitalStatus = (vital: string, value: number) => {
  switch (vital) {
    case 'temperature':
      if (value < 36 || value > 38) return 'text-red-600 bg-red-50';
      return 'text-green-600 bg-green-50';
    case 'heartRate':