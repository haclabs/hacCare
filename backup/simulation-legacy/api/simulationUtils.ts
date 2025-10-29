/**
 * Simulation Utility Functions
 * 
 * Helper functions for simulation patient management and barcode generation.
 */

/**
 * Generate a unique patient ID in PTXXXXX format for simulations
 * @returns {string} Generated patient ID (e.g., "PT12345")
 */
export const generateSimulationPatientId = (): string => {
  const randomNum = Math.floor(Math.random() * 90000) + 10000; // Ensures 5 digits
  return `PT${randomNum}`;
};

/**
 * Validate simulation patient ID format
 * @param {string} patientId - Patient ID to validate
 * @returns {boolean} True if valid format, false otherwise
 */
export const validateSimulationPatientId = (patientId: string): boolean => {
  // Validate PTXXXXX format
  const pattern = /^PT\d{5}$/;
  return pattern.test(patientId);
};

/**
 * Debug log for simulation patient operations
 * @param {string} operation - The operation being performed
 * @param {any} data - Data to log
 */
export const logSimulationPatientOperation = (operation: string, data: any): void => {
  console.log(`🎭 Simulation Patient ${operation}:`, data);
};

/**
 * Generate medication barcode ID for simulation patients
 * @param {string} medicationId - The medication ID
 * @returns {string} Barcode ID in MED format
 */
export const generateMedicationBarcodeId = (medicationId: string): string => {
  return `MED${medicationId.slice(-6).toUpperCase()}`;
};