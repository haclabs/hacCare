/**
 * Modular Patient Management System - Index
 * 
 * This file provides a centralized export point for all modular patient
 * management components, schemas, and utilities.
 * 
 * Import from this file to access any part of the modular system:
 * 
 * import { 
 *   VitalsModule, 
 *   MARModule, 
 *   FormsModule,
 *   ModularPatientDashboard 
 * } from './modular-patient-system';
 */

// Core Modules
export { VitalsModule } from './modules/vitals/VitalsModule';
export { MARModule } from './modules/mar/MARModule';
export { FormsModule } from './modules/forms/FormsModule';

// Integration Components
export { ModularPatientDashboard } from './components/ModularPatientDashboard';
export { ModernPatientManagement } from './components/ModernPatientManagement';
export { ModularPatientSystemDemo } from './components/ModularPatientSystemDemo';

// Dynamic Form Components
export { DynamicForm } from './components/forms/DynamicForm';

// Healthcare Field Components (only export existing ones)
export { VitalSignsField } from './components/forms/fields/VitalSignsField';

// Schema Engine and Types
export { schemaEngine } from './lib/schemaEngine';
export type * from './types/schema';

// Schema Definitions (import them here for processing)
import { vitalsEntrySchema, vitalsReviewSchema } from './schemas/vitalsSchemas';
import { medicationAdministrationSchema, medicationReconciliationSchema } from './schemas/medicationSchemas';
import { nursingAssessmentSchema, admissionAssessmentSchema } from './schemas/formsSchemas';
import { schemaEngine } from './lib/schemaEngine';

// Group schemas for export
export const vitalsSchemas = [vitalsEntrySchema, vitalsReviewSchema];
export const medicationSchemas = [medicationAdministrationSchema, medicationReconciliationSchema];
export const formsSchemas = [nursingAssessmentSchema, admissionAssessmentSchema];

// Integration Examples and Utilities
export * from './examples/ModularSystemIntegration';

// Constants and Configuration
export const MODULAR_PATIENT_SYSTEM_VERSION = '1.0.0';

export const SUPPORTED_FEATURES = {
  dynamicForms: true,
  jsonSchemaValidation: true,
  clinicalSafetyChecks: true,
  realTimeValidation: true,
  customizableFields: true,
  backwardCompatibility: true,
  auditTrail: true,
  multiTenantSupport: true,
  healthcareCompliance: true
} as const;

// System Configuration
export const SYSTEM_CONFIG = {
  autoSaveInterval: 60000, // 1 minute
  validationDebounce: 300, // 300ms
  maxFileUploadSize: 10 * 1024 * 1024, // 10MB
  supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif'],
  maxFormSteps: 20,
  maxFieldsPerForm: 100
} as const;

// Clinical Constants
export const CLINICAL_CONSTANTS = {
  vitalRanges: {
    temperature: { min: 95.0, max: 106.0, normal: { min: 96.8, max: 99.5 } },
    heartRate: { min: 30, max: 200, normal: { min: 60, max: 100 } },
    bloodPressure: {
      systolic: { min: 70, max: 250, normal: { min: 90, max: 140 } },
      diastolic: { min: 40, max: 150, normal: { min: 60, max: 90 } }
    },
    respiratoryRate: { min: 8, max: 40, normal: { min: 12, max: 20 } },
    oxygenSaturation: { min: 70, max: 100, normal: { min: 95, max: 100 } }
  },
  painScale: { min: 0, max: 10 },
  criticalAlertThresholds: {
    temperature: { low: 96.0, high: 104.0 },
    heartRate: { low: 50, high: 150 },
    bloodPressure: {
      systolic: { low: 80, high: 180 },
      diastolic: { low: 50, high: 120 }
    },
    oxygenSaturation: { low: 90 }
  }
} as const;

// Utility Functions
export const utilities = {
  /**
   * Initialize the modular patient system
   * Call this function during app startup to register all schemas
   */
  initializeSystem: async () => {
    // Register all schemas
    const allSchemas = [
      ...vitalsSchemas,
      ...medicationSchemas,
      ...formsSchemas
    ];

    allSchemas.forEach(schema => {
      schemaEngine.registerSchema(schema);
    });

    console.log(`Modular Patient System v${MODULAR_PATIENT_SYSTEM_VERSION} initialized`);
    console.log(`Registered ${allSchemas.length} schemas`);
  },

  /**
   * Get system health check
   */
  getSystemHealth: () => {
    // Count registered schemas by attempting to access them
    const allSchemaIds = [
      ...vitalsSchemas.map(s => s.id),
      ...medicationSchemas.map(s => s.id),
      ...formsSchemas.map(s => s.id)
    ];
    
    const registeredCount = allSchemaIds.filter(id => 
      schemaEngine.getSchema(id) !== undefined
    ).length;
    
    return {
      version: MODULAR_PATIENT_SYSTEM_VERSION,
      status: 'healthy' as const,
      features: SUPPORTED_FEATURES,
      schemasRegistered: registeredCount,
      lastInitialized: new Date().toISOString()
    };
  },

  /**
   * Validate patient data against all clinical rules
   */
  validatePatientData: (patient: any) => {
    const errors: string[] = [];
    
    // Validate vitals if present
    if (patient.vitals && patient.vitals.length > 0) {
      const latestVitals = patient.vitals[0];
      
      if (latestVitals.temperature < CLINICAL_CONSTANTS.vitalRanges.temperature.min ||
          latestVitals.temperature > CLINICAL_CONSTANTS.vitalRanges.temperature.max) {
        errors.push('Temperature out of valid range');
      }
      
      if (latestVitals.heartRate < CLINICAL_CONSTANTS.vitalRanges.heartRate.min ||
          latestVitals.heartRate > CLINICAL_CONSTANTS.vitalRanges.heartRate.max) {
        errors.push('Heart rate out of valid range');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
} as const;

/**
 * Type definitions for module exports
 */
export interface ModularPatientSystemConfig {
  autoSaveInterval?: number;
  validationDebounce?: number;
  maxFileUploadSize?: number;
  supportedImageFormats?: string[];
  maxFormSteps?: number;
  maxFieldsPerForm?: number;
}

export interface SystemHealthCheck {
  version: string;
  status: 'healthy' | 'degraded' | 'error';
  features: typeof SUPPORTED_FEATURES;
  schemasRegistered: number;
  lastInitialized: string;
}

export interface PatientDataValidationResult {
  valid: boolean;
  errors: string[];
}
