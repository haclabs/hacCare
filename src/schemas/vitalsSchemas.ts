/**
 * Vitals Module Schema
 * 
 * JSON schema for dynamic vital signs collection forms
 */

import { VitalsSchema } from '../types/schema';

export const vitalsEntrySchema: VitalsSchema = {
  id: 'vitals-entry-v1',
  title: 'Vital Signs Entry',
  description: 'Comprehensive vital signs collection with real-time validation and clinical alerts',
  version: '1.0.0',
  type: 'object',
  properties: {
    patientId: {
      type: 'string',
      title: 'Patient ID',
      description: 'Enter patient ID (PT12345 or P94558)',
      required: true,
      validation: {
        pattern: '^P(T)?\\d{4,5}$',
        custom: 'patient_id'
      },
      layout: {
        width: 'half'
      }
    },
    recordedBy: {
      type: 'string',
      title: 'Recorded By',
      description: 'Nurse recording vital signs',
      required: true,
      layout: {
        width: 'half'
      }
    },
    studentName: {
      type: 'string',
      title: 'Student Name',
      description: 'Full name of student recording vitals',
      required: true,
      validation: {
        minLength: 2
      },
      layout: {
        width: 'half'
      }
    },
    vitalSigns: {
      type: 'vital-signs',
      title: 'Current Vital Signs',
      description: 'Record all current vital signs',
      required: true,
      healthcare: {
        category: 'vitals',
        alertThresholds: {
          temperature: { low: 35.0, high: 39.0 },
          heartRate: { low: 50, high: 120 },
          systolic: { low: 80, high: 160 },
          diastolic: { low: 50, high: 100 },
          respiratoryRate: { low: 10, high: 25 },
          oxygenSaturation: { low: 92, high: 100 }
        },
        requiredFor: ['assessment']
      },
      validation: {
        healthcareRules: {
          vitalRanges: true,
          clinicalLogic: 'BP_SYSTOLIC > BP_DIASTOLIC'
        }
      }
    },
    painScale: {
      type: 'pain-scale',
      title: 'Pain Assessment',
      description: 'Patient pain level (0-10 scale)',
      default: 0,
      healthcare: {
        category: 'assessments',
        units: '0-10 scale'
      }
    },
    notes: {
      type: 'textarea',
      title: 'Clinical Notes',
      description: 'Additional observations or concerns',
      validation: {
        maxLength: 500
      },
      layout: {
        width: 'full'
      }
    },
    alertPhysician: {
      type: 'boolean',
      title: 'Alert Physician',
      description: 'Check if physician notification is required',
      default: false,
      conditional: {
        dependsOn: ['vitalSigns'],
        conditions: [{
          field: 'vitalSigns.temperature',
          operator: 'greater',
          value: 38.5
        }],
        action: 'show'
      }
    }
  },
  required: ['patientId', 'recordedBy', 'studentName', 'vitalSigns'],
  layout: {
    type: 'sections',
    sections: [
      {
        id: 'patient-info',
        title: 'Patient Information',
        fields: ['patientId', 'recordedBy', 'studentName']
      },
      {
        id: 'vitals',
        title: 'Vital Signs',
        fields: ['vitalSigns', 'painScale']
      },
      {
        id: 'notes',
        title: 'Clinical Notes',
        fields: ['notes', 'alertPhysician']
      }
    ]
  },
  validation: {
    clinical: {
      vitalsSafety: true,
      medicationSafety: false,
      allergyCheck: false
    },
    crossField: [
      {
        fields: ['vitalSigns'],
        rule: 'blood_pressure_logic',
        message: 'Systolic pressure must be higher than diastolic pressure'
      }
    ]
  },
  metadata: {
    author: 'hacCare Development Team',
    created: '2025-07-25',
    modified: '2025-07-25',
    tags: ['vitals', 'nursing', 'assessment'],
    clinicalSpecialty: 'general',
    complianceLevel: 'hipaa',
    vitalTypes: ['temperature', 'blood_pressure', 'heart_rate', 'respiratory_rate', 'oxygen_saturation'],
    alertThresholds: {
      temperature: { min: 35.0, max: 39.0 },
      heartRate: { min: 50, max: 120 },
      systolic: { min: 80, max: 160 },
      diastolic: { min: 50, max: 100 },
      respiratoryRate: { min: 10, max: 25 },
      oxygenSaturation: { min: 92, max: 100 }
    },
    units: {
      temperature: '°C',
      heartRate: 'BPM',
      bloodPressure: 'mmHg',
      respiratoryRate: '/min',
      oxygenSaturation: '%'
    }
  }
};

export const vitalsReviewSchema: VitalsSchema = {
  id: 'vitals-review-v1',
  title: 'Vital Signs Review',
  description: 'Review and trend analysis of patient vital signs',
  version: '1.0.0',
  type: 'object',
  properties: {
    patientId: {
      type: 'string',
      title: 'Patient ID',
      required: true
    },
    dateRange: {
      type: 'date',
      title: 'Review Period',
      description: 'Select date range for review',
      required: true
    },
    vitalTrends: {
      type: 'vital-signs',
      title: 'Vital Signs Trends',
      description: 'Historical vital signs data with trend analysis'
    },
    clinicalAssessment: {
      type: 'textarea',
      title: 'Clinical Assessment',
      description: 'Clinical interpretation of vital signs trends'
    }
  },
  required: ['patientId', 'dateRange'],
  layout: {
    type: 'vertical'
  },
  metadata: {
    author: 'hacCare Development Team',
    created: '2025-07-25',
    modified: '2025-07-25',
    tags: ['vitals', 'review', 'trends'],
    clinicalSpecialty: 'general',
    complianceLevel: 'hipaa',
    vitalTypes: ['temperature', 'blood_pressure', 'heart_rate', 'respiratory_rate', 'oxygen_saturation'],
    alertThresholds: {},
    units: {
      temperature: '°C',
      heartRate: 'BPM',
      bloodPressure: 'mmHg',
      respiratoryRate: '/min',
      oxygenSaturation: '%'
    }
  }
};
