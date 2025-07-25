/**
 * JSON Schema Engine for Dynamic Form Generation
 * 
 * This module provides the core engine for generating dynamic forms from JSON schemas.
 * It handles form rendering, validation, conditional logic, and healthcare-specific features.
 * 
 * Features:
 * - Dynamic form generation from JSON schemas
 * - Real-time validation with healthcare rules
 * - Conditional field rendering
 * - Multi-step form support
 * - Clinical validation and alerts
 * - Integration with patient data context
 */

import { 
  JSONSchema, 
  SchemaField, 
  FormData, 
  ValidationResult, 
  FormGenerationContext,
  FieldError,
  FieldWarning,
  ClinicalAlert,
  SchemaCondition
} from '../types/schema';
import { Patient, VitalSigns, Medication } from '../types';

export class SchemaEngine {
  private schemas: Map<string, JSONSchema> = new Map();
  private validators: Map<string, Function> = new Map();
  private clinicalRules: Map<string, Function> = new Map();

  constructor() {
    this.initializeBuiltInValidators();
    this.initializeClinicalRules();
  }

  /**
   * Register a schema for use in dynamic forms
   */
  registerSchema(schema: JSONSchema): void {
    this.schemas.set(schema.id, schema);
  }

  /**
   * Get a registered schema by ID
   */
  getSchema(schemaId: string): JSONSchema | undefined {
    return this.schemas.get(schemaId);
  }

  /**
   * Generate form configuration from schema
   */
  generateFormConfig(
    schemaId: string, 
    context: FormGenerationContext = {}
  ): FormConfiguration | null {
    const schema = this.getSchema(schemaId);
    if (!schema) return null;

    return {
      schema,
      fields: this.processFields(schema, context),
      layout: this.processLayout(schema, context),
      validation: this.processValidation(schema, context),
      context
    };
  }

  /**
   * Validate form data against schema
   */
  async validateFormData(
    schemaId: string, 
    data: FormData, 
    context: FormGenerationContext = {}
  ): Promise<ValidationResult> {
    const schema = this.getSchema(schemaId);
    if (!schema) {
      return {
        valid: false,
        errors: [{ field: '_schema', message: 'Schema not found', type: 'custom' }],
        warnings: []
      };
    }

    const errors: FieldError[] = [];
    const warnings: FieldWarning[] = [];
    const clinicalAlerts: ClinicalAlert[] = [];

    // Basic schema validation
    await this.validateRequiredFields(schema, data, errors);
    await this.validateFieldTypes(schema, data, errors);
    await this.validateFieldConstraints(schema, data, errors, warnings);

    // Healthcare-specific validation
    if (context.patient) {
      await this.validateClinicalRules(schema, data, context, clinicalAlerts);
      await this.validateHealthcareSafety(schema, data, context, clinicalAlerts);
    }

    // Cross-field validation
    if (schema.validation?.crossField) {
      await this.validateCrossFieldRules(schema, data, errors, warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      clinicalAlerts
    };
  }

  /**
   * Evaluate conditional logic for field visibility/requirements
   */
  evaluateCondition(
    condition: SchemaCondition,
    data: FormData,
    context: FormGenerationContext = {}
  ): boolean {
    const fieldValue = this.getFieldValue(condition.field, data, context);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'greater':
        return Number(fieldValue) > Number(condition.value);
      case 'less':
        return Number(fieldValue) < Number(condition.value);
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Process fields with conditional logic
   */
  private processFields(
    schema: JSONSchema, 
    context: FormGenerationContext
  ): ProcessedField[] {
    const processed: ProcessedField[] = [];

    Object.entries(schema.properties).forEach(([fieldName, field]) => {
      const processedField: ProcessedField = {
        name: fieldName,
        ...field,
        visible: this.isFieldVisible(field, schema, {}, context),
        required: this.isFieldRequired(field, schema, {}, context),
        disabled: this.isFieldDisabled(field, schema, {}, context),
        options: this.processFieldOptions(field, context)
      };

      processed.push(processedField);
    });

    return processed;
  }

  /**
   * Process form layout with responsive considerations
   */
  private processLayout(
    schema: JSONSchema, 
    context: FormGenerationContext
  ): ProcessedLayout {
    const layout = schema.layout || { type: 'vertical' };
    
    return {
      ...layout,
      processedSections: layout.sections?.map(section => ({
        ...section,
        visible: section.condition ? 
          this.evaluateCondition(section.condition, {}, context) : true,
        fields: section.fields.filter(fieldName => 
          schema.properties[fieldName] && 
          this.isFieldVisible(schema.properties[fieldName], schema, {}, context)
        )
      })),
      processedSteps: layout.steps?.map(step => ({
        ...step,
        fields: step.fields.filter(fieldName => 
          schema.properties[fieldName] && 
          this.isFieldVisible(schema.properties[fieldName], schema, {}, context)
        )
      }))
    };
  }

  /**
   * Process validation rules with healthcare context
   */
  private processValidation(
    schema: JSONSchema, 
    context: FormGenerationContext
  ): ProcessedValidation {
    return {
      ...schema.validation,
      clinicalContext: context.clinical,
      patientContext: context.patient,
      userPermissions: context.user?.permissions || []
    };
  }

  /**
   * Initialize built-in validators
   */
  private initializeBuiltInValidators(): void {
    // Basic validators
    this.validators.set('required', (value: any) => {
      return value !== null && value !== undefined && value !== '';
    });

    this.validators.set('email', (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    });

    this.validators.set('phone', (value: string) => {
      const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
      return phoneRegex.test(value);
    });

    // Healthcare-specific validators
    this.validators.set('vital_range', (value: number, field: SchemaField) => {
      if (!field.healthcare?.normalRange) return true;
      const { min, max } = field.healthcare.normalRange;
      return value >= min && value <= max;
    });

    this.validators.set('medication_name', (value: string) => {
      // Basic medication name validation
      return value && value.length >= 2 && !/[<>]/.test(value);
    });

    this.validators.set('patient_id', (value: string) => {
      // Patient ID format validation (PT12345)
      const patientIdRegex = /^PT\d{5}$/;
      return patientIdRegex.test(value);
    });
  }

  /**
   * Initialize clinical validation rules
   */
  private initializeClinicalRules(): void {
    this.clinicalRules.set('blood_pressure_logic', (systolic: number, diastolic: number) => {
      return systolic > diastolic;
    });

    this.clinicalRules.set('age_medication_check', (patientAge: number, medicationName: string) => {
      // Example: Some medications have age restrictions
      const ageRestrictedMeds = ['aspirin', 'warfarin'];
      if (ageRestrictedMeds.some(med => medicationName.toLowerCase().includes(med))) {
        return patientAge >= 18;
      }
      return true;
    });

    this.clinicalRules.set('allergy_medication_check', (allergies: string[], medicationName: string) => {
      // Check for potential allergic reactions
      const commonAllergens = {
        'penicillin': ['amoxicillin', 'ampicillin'],
        'sulfa': ['sulfamethoxazole', 'trimethoprim']
      };

      for (const allergy of allergies) {
        const allergenMeds = commonAllergens[allergy.toLowerCase() as keyof typeof commonAllergens];
        if (allergenMeds && allergenMeds.some(med => medicationName.toLowerCase().includes(med))) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Helper methods for field processing
   */
  private isFieldVisible(
    field: SchemaField,
    schema: JSONSchema,
    data: FormData,
    context: FormGenerationContext
  ): boolean {
    if (!field.conditional) return true;
    
    const conditions = field.conditional.conditions;
    let result = true;

    conditions.forEach((condition, index) => {
      const conditionResult = this.evaluateCondition(condition, data, context);
      
      if (index === 0) {
        result = conditionResult;
      } else {
        const operator = condition.logicalOperator || 'AND';
        result = operator === 'AND' ? result && conditionResult : result || conditionResult;
      }
    });

    return field.conditional.action === 'show' ? result : !result;
  }

  private isFieldRequired(
    field: SchemaField,
    schema: JSONSchema,
    data: FormData,
    context: FormGenerationContext
  ): boolean {
    let required = field.required || schema.required?.includes(field.title) || false;
    
    // Check conditional requirements
    if (field.conditional?.action === 'require') {
      const conditionMet = field.conditional.conditions.every(condition =>
        this.evaluateCondition(condition, data, context)
      );
      required = required || conditionMet;
    }

    return required;
  }

  private isFieldDisabled(
    field: SchemaField,
    schema: JSONSchema,
    data: FormData,
    context: FormGenerationContext
  ): boolean {
    if (field.conditional?.action === 'disable') {
      return field.conditional.conditions.every(condition =>
        this.evaluateCondition(condition, data, context)
      );
    }
    return false;
  }

  private processFieldOptions(field: SchemaField, context: FormGenerationContext): any[] {
    if (!field.options) return [];

    if (field.options.dynamic) {
      // Handle dynamic options loading
      return this.loadDynamicOptions(field.options.dynamic, context);
    }

    if (field.options.grouped) {
      return field.options.grouped.groups;
    }

    // Return static options
    return field.options.enum?.map((value, index) => ({
      value,
      label: field.options?.enumNames?.[index] || String(value)
    })) || [];
  }

  private loadDynamicOptions(
    dynamicConfig: any,
    context: FormGenerationContext
  ): any[] {
    // Implementation would load options from API, database, or function
    // For now, return empty array - this would be implemented based on specific needs
    return [];
  }

  private getFieldValue(field: string, data: FormData, context: FormGenerationContext): any {
    // Check form data first
    if (data.hasOwnProperty(field)) {
      return data[field];
    }

    // Check context data (patient, clinical, etc.)
    if (field.startsWith('patient.') && context.patient) {
      const patientField = field.replace('patient.', '');
      return (context.patient as any)[patientField];
    }

    return null;
  }

  private async validateRequiredFields(
    schema: JSONSchema,
    data: FormData,
    errors: FieldError[]
  ): Promise<void> {
    schema.required?.forEach(fieldName => {
      if (!data.hasOwnProperty(fieldName) || data[fieldName] === null || data[fieldName] === '') {
        errors.push({
          field: fieldName,
          message: `${fieldName} is required`,
          type: 'required'
        });
      }
    });
  }

  private async validateFieldTypes(
    schema: JSONSchema,
    data: FormData,
    errors: FieldError[]
  ): Promise<void> {
    Object.entries(data).forEach(([fieldName, value]) => {
      const field = schema.properties[fieldName];
      if (!field || value === null || value === undefined) return;

      const isValid = this.validateFieldType(field.type, value);
      if (!isValid) {
        errors.push({
          field: fieldName,
          message: `Invalid ${field.type} format`,
          type: 'format'
        });
      }
    });
  }

  private validateFieldType(type: string, value: any): boolean {
    switch (type) {
      case 'number':
        return !isNaN(Number(value));
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        return !isNaN(Date.parse(value));
      case 'email':
        return this.validators.get('email')?.(value) || false;
      case 'phone':
        return this.validators.get('phone')?.(value) || false;
      default:
        return true; // String types and others
    }
  }

  private async validateFieldConstraints(
    schema: JSONSchema,
    data: FormData,
    errors: FieldError[],
    warnings: FieldWarning[]
  ): Promise<void> {
    Object.entries(data).forEach(([fieldName, value]) => {
      const field = schema.properties[fieldName];
      if (!field?.validation) return;

      const validation = field.validation;

      // Min/Max validation
      if (validation.min !== undefined && Number(value) < validation.min) {
        errors.push({
          field: fieldName,
          message: `Value must be at least ${validation.min}`,
          type: 'range'
        });
      }

      if (validation.max !== undefined && Number(value) > validation.max) {
        errors.push({
          field: fieldName,
          message: `Value must be at most ${validation.max}`,
          type: 'range'
        });
      }

      // Pattern validation
      if (validation.pattern && typeof value === 'string') {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          errors.push({
            field: fieldName,
            message: 'Invalid format',
            type: 'format'
          });
        }
      }
    });
  }

  private async validateClinicalRules(
    schema: JSONSchema,
    data: FormData,
    context: FormGenerationContext,
    alerts: ClinicalAlert[]
  ): Promise<void> {
    // Blood pressure logic validation
    if (data.systolic && data.diastolic) {
      const isValid = this.clinicalRules.get('blood_pressure_logic')?.(data.systolic, data.diastolic);
      if (!isValid) {
        alerts.push({
          type: 'vital_range',
          severity: 'medium',
          message: 'Systolic pressure should be higher than diastolic pressure',
          recommendedAction: 'Please verify blood pressure readings'
        });
      }
    }

    // Age-medication validation
    if (data.medicationName && context.patient?.age) {
      const isValid = this.clinicalRules.get('age_medication_check')?.(
        context.patient.age, 
        data.medicationName
      );
      if (!isValid) {
        alerts.push({
          type: 'age_restriction',
          severity: 'high',
          message: 'This medication may not be appropriate for patient age',
          recommendedAction: 'Consult with physician before administration'
        });
      }
    }

    // Allergy-medication validation
    if (data.medicationName && context.patient?.allergies) {
      const isValid = this.clinicalRules.get('allergy_medication_check')?.(
        context.patient.allergies,
        data.medicationName
      );
      if (!isValid) {
        alerts.push({
          type: 'allergy',
          severity: 'critical',
          message: 'Patient has known allergy to this medication class',
          recommendedAction: 'DO NOT ADMINISTER. Consult physician immediately.'
        });
      }
    }
  }

  private async validateHealthcareSafety(
    schema: JSONSchema,
    data: FormData,
    context: FormGenerationContext,
    alerts: ClinicalAlert[]
  ): Promise<void> {
    // Vital signs safety checks
    Object.entries(data).forEach(([fieldName, value]) => {
      const field = schema.properties[fieldName];
      if (field?.healthcare?.alertThresholds && typeof value === 'number') {
        const { low, high } = field.healthcare.alertThresholds;
        
        if (value < low || value > high) {
          alerts.push({
            type: 'vital_range',
            severity: value < low * 0.8 || value > high * 1.2 ? 'critical' : 'medium',
            message: `${field.title} is outside normal range (${low}-${high})`,
            recommendedAction: 'Consider immediate clinical assessment'
          });
        }
      }
    });
  }

  private async validateCrossFieldRules(
    schema: JSONSchema,
    data: FormData,
    errors: FieldError[],
    warnings: FieldWarning[]
  ): Promise<void> {
    schema.validation?.crossField?.forEach(rule => {
      const fieldValues = rule.fields.map(fieldName => data[fieldName]);
      const validator = this.validators.get(rule.rule);
      
      if (validator && !validator(...fieldValues)) {
        errors.push({
          field: rule.fields[0], // Associate with first field
          message: rule.message,
          type: 'custom'
        });
      }
    });
  }
}

// Supporting interfaces
export interface FormConfiguration {
  schema: JSONSchema;
  fields: ProcessedField[];
  layout: ProcessedLayout;
  validation: ProcessedValidation;
  context: FormGenerationContext;
}

export interface ProcessedField extends SchemaField {
  name: string;
  visible: boolean;
  required: boolean;
  disabled: boolean;
  options: any[];
}

export interface ProcessedLayout {
  type: 'vertical' | 'horizontal' | 'grid' | 'tabs' | 'steps' | 'accordion';
  columns?: number;
  processedSections?: any[];
  processedSteps?: any[];
  responsive?: any;
}

export interface ProcessedValidation {
  onSubmit?: string[];
  onChange?: Record<string, string>;
  crossField?: any[];
  clinical?: any;
  clinicalContext?: any;
  patientContext?: any;
  userPermissions: string[];
}

// Export singleton instance
export const schemaEngine = new SchemaEngine();
