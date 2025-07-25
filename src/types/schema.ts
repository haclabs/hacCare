/**
 * JSON Schema Types for Dynamic Form Generation
 * 
 * This module defines the TypeScript interfaces for JSON schemas that drive
 * dynamic form generation across patient modules (Vitals, MAR, Forms).
 * 
 * Features:
 * - Healthcare-specific field types and validations
 * - Conditional field rendering based on patient data
 * - Multi-step form support for complex workflows
 * - Real-time validation with clinical rules
 * - Integration with existing Patient/VitalSigns/Medication types
 */

// Base schema interfaces
export interface JSONSchema {
  id: string;
  title: string;
  description?: string;
  version: string;
  type: 'object' | 'array';
  properties: Record<string, SchemaField>;
  required?: string[];
  dependencies?: Record<string, SchemaCondition>;
  layout?: FormLayout;
  validation?: ValidationRules;
  metadata?: SchemaMetadata;
}

export interface SchemaField {
  type: FieldType;
  title: string;
  description?: string;
  default?: any;
  required?: boolean;
  validation?: FieldValidation;
  options?: FieldOptions;
  conditional?: ConditionalField;
  layout?: FieldLayout;
  healthcare?: HealthcareFieldConfig;
}

// Field types supported in healthcare forms
export type FieldType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'date' 
  | 'datetime' 
  | 'time'
  | 'select' 
  | 'multiselect' 
  | 'radio' 
  | 'checkbox'
  | 'textarea' 
  | 'email' 
  | 'phone' 
  | 'url'
  | 'range' 
  | 'rating'
  | 'file' 
  | 'image'
  | 'signature'
  | 'barcode'
  | 'vital-signs'
  | 'medication-lookup'
  | 'diagnosis-code'
  | 'body-diagram'
  | 'pain-scale'
  | 'assessment-grid';

// Healthcare-specific field configurations
export interface HealthcareFieldConfig {
  category: 'demographics' | 'vitals' | 'medications' | 'assessments' | 'clinical';
  units?: string;
  normalRange?: { min: number; max: number };
  alertThresholds?: { low: number; high: number };
  requiredFor?: ('admission' | 'discharge' | 'transfer' | 'assessment')[];
  hipaaLevel?: 'standard' | 'sensitive' | 'restricted';
  clinicalContext?: string[];
}

// Field validation rules
export interface FieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  custom?: string; // Custom validation function name
  required?: boolean;
  healthcareRules?: HealthcareValidation;
}

export interface HealthcareValidation {
  ageRestrictions?: { minAge?: number; maxAge?: number };
  clinicalLogic?: string; // e.g., "BP_SYSTOLIC > BP_DIASTOLIC"
  drugInteractions?: string[];
  allergyCheck?: boolean;
  vitalRanges?: boolean;
}

// Field options for selects, radios, etc.
export interface FieldOptions {
  enum?: (string | number)[];
  enumNames?: string[];
  dynamic?: DynamicOptions;
  grouped?: GroupedOptions;
}

export interface DynamicOptions {
  source: 'api' | 'database' | 'function';
  endpoint?: string;
  query?: string;
  functionName?: string;
  parameters?: Record<string, any>;
  cacheFor?: number; // Cache duration in minutes
}

export interface GroupedOptions {
  groups: Array<{
    label: string;
    options: Array<{ value: any; label: string; disabled?: boolean }>;
  }>;
}

// Conditional field rendering
export interface ConditionalField {
  dependsOn: string | string[];
  conditions: SchemaCondition[];
  action: 'show' | 'hide' | 'require' | 'disable';
}

export interface SchemaCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater' | 'less' | 'contains' | 'in' | 'not_in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

// Form layout and styling
export interface FormLayout {
  type: 'vertical' | 'horizontal' | 'grid' | 'tabs' | 'steps' | 'accordion';
  columns?: number;
  sections?: FormSection[];
  steps?: FormStep[];
  responsive?: ResponsiveLayout;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: string[];
  collapsible?: boolean;
  initiallyCollapsed?: boolean;
  condition?: SchemaCondition;
}

export interface FormStep {
  id: string;
  title: string;
  description?: string;
  fields: string[];
  validation?: ValidationRules;
  nextCondition?: SchemaCondition;
}

export interface FieldLayout {
  width?: 'full' | 'half' | 'third' | 'quarter' | string;
  row?: number;
  column?: number;
  span?: number;
  label?: LabelConfig;
  helpText?: HelpTextConfig;
}

export interface LabelConfig {
  position: 'top' | 'left' | 'right' | 'inline';
  width?: string;
  required?: boolean;
  tooltip?: string;
}

export interface HelpTextConfig {
  text: string;
  position: 'below' | 'tooltip' | 'popover';
  type: 'info' | 'warning' | 'error';
}

export interface ResponsiveLayout {
  mobile?: Partial<FormLayout>;
  tablet?: Partial<FormLayout>;
  desktop?: Partial<FormLayout>;
}

// Validation and business rules
export interface ValidationRules {
  onSubmit?: string[]; // Function names to run on submit
  onChange?: Record<string, string>; // Field-specific validation functions
  crossField?: CrossFieldValidation[];
  clinical?: ClinicalValidationRules;
}

export interface CrossFieldValidation {
  fields: string[];
  rule: string; // Validation function name
  message: string;
}

export interface ClinicalValidationRules {
  vitalsSafety?: boolean;
  medicationSafety?: boolean;
  allergyCheck?: boolean;
  drugInteractions?: boolean;
  dosageCalculation?: string; // Function for dosage validation
}

// Schema metadata
export interface SchemaMetadata {
  author: string;
  created: string;
  modified: string;
  tags: string[];
  clinicalSpecialty?: string;
  approvedBy?: string;
  reviewDate?: string;
  complianceLevel?: 'basic' | 'hipaa' | 'fda';
}

// Form data and submission
export interface FormData {
  [key: string]: any;
}

export interface FormSubmission {
  schemaId: string;
  patientId: string;
  submittedBy: string;
  timestamp: string;
  data: FormData;
  validation: ValidationResult;
  metadata?: SubmissionMetadata;
}

export interface ValidationResult {
  valid: boolean;
  errors: FieldError[];
  warnings: FieldWarning[];
  clinicalAlerts?: ClinicalAlert[];
}

export interface FieldError {
  field: string;
  message: string;
  type: 'required' | 'format' | 'range' | 'custom' | 'clinical';
}

export interface FieldWarning {
  field: string;
  message: string;
  type: 'clinical' | 'business' | 'suggestion';
}

export interface ClinicalAlert {
  type: 'drug_interaction' | 'allergy' | 'vital_range' | 'age_restriction';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendedAction?: string;
}

export interface SubmissionMetadata {
  source: 'web' | 'mobile' | 'tablet' | 'api';
  location?: string;
  sessionId?: string;
  formVersion: string;
  submissionTime: number; // Time taken to complete form in seconds
}

// Module-specific schema types
export interface VitalsSchema extends JSONSchema {
  metadata: SchemaMetadata & {
    vitalTypes: ('temperature' | 'blood_pressure' | 'heart_rate' | 'respiratory_rate' | 'oxygen_saturation')[];
    alertThresholds: Record<string, { min: number; max: number }>;
    units: Record<string, string>;
  };
}

export interface MedicationSchema extends JSONSchema {
  metadata: SchemaMetadata & {
    medicationType: 'administration' | 'prescription' | 'reconciliation';
    drugDatabase?: string;
    interactionChecking: boolean;
    dosageCalculation: boolean;
  };
}

export interface AssessmentSchema extends JSONSchema {
  metadata: SchemaMetadata & {
    assessmentType: 'admission' | 'nursing' | 'pain' | 'fall_risk' | 'wound' | 'discharge';
    scoringSystem?: string;
    templateSource?: string;
  };
}

// Dynamic form generation context
export interface FormGenerationContext {
  patient?: {
    id: string;
    age: number;
    gender: string;
    allergies: string[];
    currentMedications: string[];
    condition: string;
  };
  user?: {
    id: string;
    role: string;
    department: string;
    permissions: string[];
  };
  clinical?: {
    currentVitals?: any;
    recentAssessments?: any[];
    activeMedications?: any[];
  };
  form?: {
    mode: 'create' | 'edit' | 'view';
    previousData?: FormData;
    autoSave?: boolean;
  };
}
