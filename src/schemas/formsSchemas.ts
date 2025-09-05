/**
 * Forms Module Schemas
 * 
 * JSON schemas for clinical assessment and documentation forms
 */

import { AssessmentSchema } from '../types/schema';

export const nursingAssessmentSchema: AssessmentSchema = {
  id: 'nursing-assessment-v1',
  title: 'Comprehensive Nursing Assessment',
  description: 'Complete nursing assessment form with multiple assessment categories',
  version: '1.0.0',
  type: 'object',
  properties: {
    patientId: {
      type: 'string',
      title: 'Patient ID',
      required: true,
      validation: {
        pattern: '^PT\\d{5}$'
      }
    },
    assessmentDate: {
      type: 'datetime',
      title: 'Assessment Date & Time',
      required: true,
      default: 'now'
    },
    nurseName: {
      type: 'string',
      title: 'Assessing Nurse',
      required: true
    },
    assessmentType: {
      type: 'select',
      title: 'Assessment Type',
      required: true,
      options: {
        enum: ['admission', 'shift', 'focused', 'discharge'],
        enumNames: ['Admission Assessment', 'Shift Assessment', 'Focused Assessment', 'Discharge Assessment']
      }
    },
    // Physical Assessment
    generalAppearance: {
      type: 'select',
      title: 'General Appearance',
      options: {
        enum: ['alert', 'lethargic', 'confused', 'agitated', 'unresponsive'],
        enumNames: ['Alert & Oriented', 'Lethargic', 'Confused', 'Agitated', 'Unresponsive']
      }
    },
    levelOfConsciousness: {
      type: 'select',
      title: 'Level of Consciousness',
      options: {
        enum: ['alert', 'drowsy', 'stuporous', 'comatose'],
        enumNames: ['Alert', 'Drowsy', 'Stuporous', 'Comatose']
      }
    },
    respiratoryAssessment: {
      type: 'textarea',
      title: 'Respiratory Assessment',
      description: 'Breath sounds, respiratory effort, oxygen support'
    },
    cardiovascularAssessment: {
      type: 'textarea',
      title: 'Cardiovascular Assessment',
      description: 'Heart sounds, rhythm, peripheral pulses, edema'
    },
    // Pain Assessment
    painPresent: {
      type: 'boolean',
      title: 'Pain Present',
      default: false
    },
    painScale: {
      type: 'pain-scale',
      title: 'Pain Level (0-10)',
      conditional: {
        dependsOn: ['painPresent'],
        conditions: [{
          field: 'painPresent',
          operator: 'equals',
          value: true
        }],
        action: 'show'
      }
    },
    painLocation: {
      type: 'body-diagram',
      title: 'Pain Location',
      description: 'Mark pain location on body diagram',
      conditional: {
        dependsOn: ['painPresent'],
        conditions: [{
          field: 'painPresent',
          operator: 'equals',
          value: true
        }],
        action: 'show'
      }
    },
    painQuality: {
      type: 'select',
      title: 'Pain Quality',
      options: {
        enum: ['sharp', 'dull', 'aching', 'burning', 'stabbing', 'cramping'],
        enumNames: ['Sharp', 'Dull', 'Aching', 'Burning', 'Stabbing', 'Cramping']
      },
      conditional: {
        dependsOn: ['painPresent'],
        conditions: [{
          field: 'painPresent',
          operator: 'equals',
          value: true
        }],
        action: 'show'
      }
    },
    // Neurological Assessment
    glasgowComaScale: {
      type: 'number',
      title: 'Glasgow Coma Scale',
      validation: {
        min: 3,
        max: 15
      }
    },
    motorFunction: {
      type: 'select',
      title: 'Motor Function',
      options: {
        enum: ['normal', 'weakness', 'paralysis', 'tremor'],
        enumNames: ['Normal', 'Weakness', 'Paralysis', 'Tremor']
      }
    },
    cognitiveFunction: {
      type: 'textarea',
      title: 'Cognitive Function',
      description: 'Memory, orientation, decision-making ability'
    },
    // Fall Risk Assessment
    fallRiskFactors: {
      type: 'multiselect',
      title: 'Fall Risk Factors',
      options: {
        enum: ['age_over_65', 'confusion', 'medications', 'mobility_issues', 'history_of_falls', 'incontinence'],
        enumNames: ['Age >65', 'Confusion/Disorientation', 'High-risk Medications', 'Mobility Issues', 'History of Falls', 'Incontinence']
      }
    },
    fallRiskScore: {
      type: 'number',
      title: 'Fall Risk Score',
      description: 'Calculated fall risk score (auto-calculated)',
      disabled: true
    },
    // Skin Assessment
    skinCondition: {
      type: 'select',
      title: 'Overall Skin Condition',
      options: {
        enum: ['intact', 'dry', 'oily', 'fragile', 'compromised'],
        enumNames: ['Intact', 'Dry', 'Oily', 'Fragile', 'Compromised']
      }
    },
    pressureUlcerRisk: {
      type: 'select',
      title: 'Pressure Ulcer Risk',
      options: {
        enum: ['low', 'moderate', 'high', 'very_high'],
        enumNames: ['Low Risk', 'Moderate Risk', 'High Risk', 'Very High Risk']
      }
    },
    woundsPresent: {
      type: 'boolean',
      title: 'Wounds Present',
      default: false
    },
    // Assessment Notes
    assessmentNotes: {
      type: 'textarea',
      title: 'Assessment Notes',
      description: 'Additional clinical observations and notes'
    },
    recommendations: {
      type: 'textarea',
      title: 'Care Recommendations',
      description: 'Recommended interventions and care plan updates'
    },
    followUpRequired: {
      type: 'boolean',
      title: 'Follow-up Required',
      default: false
    },
    priorityLevel: {
      type: 'select',
      title: 'Priority Level',
      options: {
        enum: ['routine', 'urgent', 'emergent'],
        enumNames: ['Routine', 'Urgent', 'Emergent']
      },
      default: 'routine'
    }
  },
  required: ['patientId', 'assessmentDate', 'nurseName', 'assessmentType'],
  layout: {
    type: 'tabs',
    sections: [
      {
        id: 'basic-info',
        title: 'Basic Information',
        fields: ['patientId', 'assessmentDate', 'nurseName', 'assessmentType']
      },
      {
        id: 'physical',
        title: 'Physical Assessment',
        fields: ['generalAppearance', 'levelOfConsciousness', 'respiratoryAssessment', 'cardiovascularAssessment']
      },
      {
        id: 'pain',
        title: 'Pain Assessment',
        fields: ['painPresent', 'painScale', 'painLocation', 'painQuality']
      },
      {
        id: 'neurological',
        title: 'Neurological',
        fields: ['glasgowComaScale', 'motorFunction', 'cognitiveFunction']
      },
      {
        id: 'fall-risk',
        title: 'Fall Risk',
        fields: ['fallRiskFactors', 'fallRiskScore']
      },
      {
        id: 'skin',
        title: 'Skin Assessment',
        fields: ['skinCondition', 'pressureUlcerRisk', 'woundsPresent']
      },
      {
        id: 'notes',
        title: 'Notes & Recommendations',
        fields: ['assessmentNotes', 'recommendations', 'followUpRequired', 'priorityLevel']
      }
    ]
  },
  validation: {
    clinical: {
      vitalsSafety: false,
      medicationSafety: false,
      allergyCheck: false
    },
    crossField: [
      {
        fields: ['painPresent', 'painScale'],
        rule: 'pain_scale_required',
        message: 'Pain scale is required when pain is present'
      }
    ]
  },
  metadata: {
    author: 'hacCare Development Team',
    created: '2025-07-25',
    modified: '2025-07-25',
    tags: ['nursing', 'assessment', 'comprehensive'],
    clinicalSpecialty: 'general',
    complianceLevel: 'hipaa',
    assessmentType: 'nursing',
    scoringSystem: 'fall_risk_morse',
    templateSource: 'nursing_standards'
  }
};

export const admissionAssessmentSchema: AssessmentSchema = {
  id: 'admission-assessment-v1',
  title: 'Patient Admission Assessment',
  description: 'Initial patient assessment upon hospital admission',
  version: '1.0.0',
  type: 'object',
  properties: {
    patientId: {
      type: 'string',
      title: 'Patient ID',
      required: true
    },
    admissionDate: {
      type: 'datetime',
      title: 'Admission Date & Time',
      required: true
    },
    admittingDiagnosis: {
      type: 'string',
      title: 'Admitting Diagnosis',
      required: true
    },
    chiefComplaint: {
      type: 'textarea',
      title: 'Chief Complaint',
      description: 'Patient\'s primary reason for admission',
      required: true
    },
    allergies: {
      type: 'multiselect',
      title: 'Known Allergies',
      options: {
        enum: ['nka', 'penicillin', 'sulfa', 'latex', 'shellfish', 'other'],
        enumNames: ['No Known Allergies', 'Penicillin', 'Sulfa', 'Latex', 'Shellfish', 'Other']
      }
    },
    medications: {
      type: 'medication-lookup',
      title: 'Current Medications',
      description: 'Medications patient is currently taking'
    },
    vitalSigns: {
      type: 'vital-signs',
      title: 'Admission Vital Signs',
      required: true
    },
    orientation: {
      type: 'select',
      title: 'Orientation',
      options: {
        enum: ['oriented_x4', 'oriented_x3', 'oriented_x2', 'oriented_x1', 'disoriented'],
        enumNames: ['Oriented x4', 'Oriented x3', 'Oriented x2', 'Oriented x1', 'Disoriented']
      }
    },
    mobilityStatus: {
      type: 'select',
      title: 'Mobility Status',
      options: {
        enum: ['independent', 'assistance', 'wheelchair', 'bedbound'],
        enumNames: ['Independent', 'Needs Assistance', 'Wheelchair', 'Bedbound']
      }
    }
  },
  required: ['patientId', 'admissionDate', 'admittingDiagnosis', 'chiefComplaint', 'vitalSigns'],
  layout: {
    type: 'sections',
    sections: [
      {
        id: 'basic-info',
        title: 'Admission Information',
        fields: ['patientId', 'admissionDate', 'admittingDiagnosis', 'chiefComplaint']
      },
      {
        id: 'medical-history',
        title: 'Medical History',
        fields: ['allergies', 'medications']
      },
      {
        id: 'assessment',
        title: 'Initial Assessment',
        fields: ['vitalSigns', 'orientation', 'mobilityStatus']
      }
    ]
  },
  metadata: {
    author: 'hacCare Development Team',
    created: '2025-07-25',
    modified: '2025-07-25',
    tags: ['admission', 'assessment', 'initial'],
    clinicalSpecialty: 'general',
    complianceLevel: 'hipaa',
    assessmentType: 'admission'
  }
};

export const bowelAssessmentSchema: AssessmentSchema = {
  id: 'bowel-assessment-v1',
  title: 'Bowel Movement Record',
  description: 'Comprehensive bowel movement assessment and continence tracking',
  version: '1.0.0',
  type: 'object',
  properties: {
    patientId: {
      type: 'string',
      title: 'Patient ID',
      required: true,
      validation: {
        pattern: '^PT\\d{5}$'
      }
    },
    recordedAt: {
      type: 'datetime',
      title: 'Recording Date & Time',
      required: true,
      default: 'now',
      description: 'Date and time when the bowel movement was observed/recorded'
    },
    nurseName: {
      type: 'string',
      title: 'Recording Nurse',
      required: true
    },
    bowelIncontinence: {
      type: 'select',
      title: 'Bowel Incontinence',
      required: true,
      options: {
        enum: ['Continent', 'Incontinent', 'Partial'],
        enumNames: ['Continent', 'Incontinent', 'Partial']
      },
      description: 'Patient continence status'
    },
    stoolAppearance: {
      type: 'select',
      title: 'Stool Appearance',
      required: true,
      options: {
        enum: ['Normal', 'Abnormal', 'Blood present', 'Mucus present'],
        enumNames: ['Normal', 'Abnormal', 'Blood Present', 'Mucus Present']
      },
      description: 'Visual appearance of stool'
    },
    stoolConsistency: {
      type: 'select',
      title: 'Stool Consistency',
      required: true,
      options: {
        enum: ['Formed', 'Loose', 'Watery', 'Hard', 'Soft'],
        enumNames: ['Formed', 'Loose', 'Watery', 'Hard', 'Soft']
      },
      description: 'Consistency and texture of stool'
    },
    stoolColour: {
      type: 'select',
      title: 'Stool Colour',
      required: true,
      options: {
        enum: ['Brown', 'Green', 'Yellow', 'Black', 'Red', 'Clay colored'],
        enumNames: ['Brown', 'Green', 'Yellow', 'Black', 'Red', 'Clay Colored']
      },
      description: 'Color of stool'
    },
    stoolAmount: {
      type: 'select',
      title: 'Stool Amount',
      required: true,
      options: {
        enum: ['None', 'Small', 'Moderate', 'Large'],
        enumNames: ['None', 'Small', 'Moderate', 'Large']
      },
      description: 'Amount/quantity of stool'
    },
    notes: {
      type: 'textarea',
      title: 'Additional Notes',
      required: true,
      description: 'Any additional observations or notes about the bowel movement'
    }
  },
  layout: {
    type: 'accordion',
    sections: [
      {
        id: 'basic-info',
        title: 'Basic Information',
        fields: ['patientId', 'recordedAt', 'nurseName']
      },
      {
        id: 'bowel-assessment',
        title: 'Bowel Assessment',
        fields: ['bowelIncontinence', 'stoolAppearance', 'stoolConsistency', 'stoolColour', 'stoolAmount']
      },
      {
        id: 'additional-notes',
        title: 'Additional Information',
        fields: ['notes']
      }
    ]
  },
  validation: {
    onSubmit: ['validateBowelRecord']
  },
  metadata: {
    author: 'hacCare Development Team',
    created: '2025-09-05',
    modified: '2025-09-05',
    tags: ['bowel', 'assessment', 'continence', 'stool'],
    clinicalSpecialty: 'nursing',
    complianceLevel: 'hipaa',
    assessmentType: 'nursing'
  }
};
