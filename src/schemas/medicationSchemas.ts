/**
 * MAR (Medication Administration Record) Module Schemas
 * 
 * JSON schemas for dynamic medication administration forms
 */

import { MedicationSchema } from '../types/schema';

export const medicationAdministrationSchema: MedicationSchema = {
  id: 'medication-administration-v1',
  title: 'Medication Administration Record',
  description: 'Record medication administration with safety checks and validation',
  version: '1.0.0',
  type: 'object',
  properties: {
    patientId: {
      type: 'string',
      title: 'Patient ID',
      description: 'Patient receiving medication',
      required: true,
      validation: {
        pattern: '^PT\\d{5}$'
      }
    },
    medicationId: {
      type: 'medication-lookup',
      title: 'Medication',
      description: 'Search and select medication',
      required: true,
      healthcare: {
        category: 'medications',
        requiredFor: ['administration']
      }
    },
    dosage: {
      type: 'string',
      title: 'Dosage',
      description: 'Prescribed dosage amount',
      required: true,
      validation: {
        pattern: '^\\d+(\\.\\d+)?\\s*(mg|g|ml|L|units?)$'
      }
    },
    route: {
      type: 'select',
      title: 'Route of Administration',
      required: true,
      options: {
        enum: ['oral', 'iv', 'im', 'sc', 'topical', 'inhaled', 'rectal', 'other'],
        enumNames: ['Oral', 'Intravenous', 'Intramuscular', 'Subcutaneous', 'Topical', 'Inhaled', 'Rectal', 'Other']
      }
    },
    administeredBy: {
      type: 'string',
      title: 'Administered By',
      description: 'Nurse administering medication',
      required: true
    },
    administrationTime: {
      type: 'datetime',
      title: 'Administration Time',
      description: 'When medication was given',
      required: true,
      default: 'now'
    },
    patientResponse: {
      type: 'select',
      title: 'Patient Response',
      options: {
        enum: ['accepted', 'refused', 'unable', 'partial'],
        enumNames: ['Accepted', 'Refused', 'Unable to Take', 'Partial Dose']
      },
      default: 'accepted'
    },
    refusalReason: {
      type: 'textarea',
      title: 'Reason for Refusal',
      description: 'Document reason if medication was refused',
      conditional: {
        dependsOn: ['patientResponse'],
        conditions: [{
          field: 'patientResponse',
          operator: 'equals',
          value: 'refused'
        }],
        action: 'show'
      },
      validation: {
        required: true
      }
    },
    vitalSignsRequired: {
      type: 'boolean',
      title: 'Vital Signs Check Required',
      description: 'Some medications require pre/post vital signs',
      default: false
    },
    preVitals: {
      type: 'vital-signs',
      title: 'Pre-Administration Vitals',
      conditional: {
        dependsOn: ['vitalSignsRequired'],
        conditions: [{
          field: 'vitalSignsRequired',
          operator: 'equals',
          value: true
        }],
        action: 'show'
      }
    },
    notes: {
      type: 'textarea',
      title: 'Administration Notes',
      description: 'Additional notes about administration',
      validation: {
        maxLength: 300
      }
    },
    allergyCheck: {
      type: 'boolean',
      title: 'Allergy Check Completed',
      description: 'Verified patient has no known allergies to this medication',
      required: true,
      healthcare: {
        category: 'medications',
        requiredFor: ['administration']
      }
    }
  },
  required: ['patientId', 'medicationId', 'dosage', 'route', 'administeredBy', 'administrationTime', 'allergyCheck'],
  layout: {
    type: 'steps',
    steps: [
      {
        id: 'medication-info',
        title: 'Medication Information',
        description: 'Select medication and verify details',
        fields: ['patientId', 'medicationId', 'dosage', 'route']
      },
      {
        id: 'safety-checks',
        title: 'Safety Verification',
        description: 'Complete required safety checks',
        fields: ['allergyCheck', 'vitalSignsRequired', 'preVitals']
      },
      {
        id: 'administration',
        title: 'Administration',
        description: 'Record administration details',
        fields: ['administeredBy', 'administrationTime', 'patientResponse', 'refusalReason', 'notes']
      }
    ]
  },
  validation: {
    clinical: {
      vitalsSafety: true,
      medicationSafety: true,
      allergyCheck: true,
      drugInteractions: true
    },
    crossField: [
      {
        fields: ['patientResponse', 'refusalReason'],
        rule: 'refusal_reason_required',
        message: 'Refusal reason is required when medication is refused'
      }
    ]
  },
  metadata: {
    author: 'hacCare Development Team',
    created: '2025-07-25',
    modified: '2025-07-25',
    tags: ['medication', 'administration', 'MAR'],
    clinicalSpecialty: 'general',
    complianceLevel: 'hipaa',
    medicationType: 'administration',
    interactionChecking: true,
    dosageCalculation: true
  }
};

export const medicationReconciliationSchema: MedicationSchema = {
  id: 'medication-reconciliation-v1',
  title: 'Medication Reconciliation',
  description: 'Reconcile patient medications during admission, transfer, or discharge',
  version: '1.0.0',
  type: 'object',
  properties: {
    patientId: {
      type: 'string',
      title: 'Patient ID',
      required: true
    },
    reconciliationType: {
      type: 'select',
      title: 'Reconciliation Type',
      required: true,
      options: {
        enum: ['admission', 'transfer', 'discharge'],
        enumNames: ['Admission', 'Transfer', 'Discharge']
      }
    },
    currentMedications: {
      type: 'medication-lookup',
      title: 'Current Hospital Medications',
      description: 'Medications currently prescribed in hospital'
    },
    homeMedications: {
      type: 'medication-lookup',
      title: 'Home Medications',
      description: 'Medications patient takes at home'
    },
    discrepancies: {
      type: 'textarea',
      title: 'Identified Discrepancies',
      description: 'Document any medication discrepancies found'
    },
    physicianNotified: {
      type: 'boolean',
      title: 'Physician Notified',
      description: 'Physician has been notified of discrepancies',
      conditional: {
        dependsOn: ['discrepancies'],
        conditions: [{
          field: 'discrepancies',
          operator: 'not_equals',
          value: ''
        }],
        action: 'show'
      }
    }
  },
  required: ['patientId', 'reconciliationType'],
  layout: {
    type: 'sections',
    sections: [
      {
        id: 'patient-info',
        title: 'Patient & Reconciliation Details',
        fields: ['patientId', 'reconciliationType']
      },
      {
        id: 'medications',
        title: 'Medication Comparison',
        fields: ['currentMedications', 'homeMedications']
      },
      {
        id: 'review',
        title: 'Reconciliation Review',
        fields: ['discrepancies', 'physicianNotified']
      }
    ]
  },
  metadata: {
    author: 'hacCare Development Team',
    created: '2025-07-25',
    modified: '2025-07-25',
    tags: ['medication', 'reconciliation', 'safety'],
    clinicalSpecialty: 'general',
    complianceLevel: 'hipaa',
    medicationType: 'reconciliation',
    interactionChecking: true,
    dosageCalculation: false
  }
};
