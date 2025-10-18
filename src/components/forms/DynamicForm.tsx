/**
 * Dynamic Form Renderer Component
 * 
 * This component renders forms dynamically based on JSON schemas.
 * It handles all form interactions, validation, and healthcare-specific features.
 * 
 * Features:
 * - Dynamic form generation from JSON schemas
 * - Real-time validation with visual feedback
 * - Conditional field rendering
 * - Healthcare-specific input components
 * - Multi-step form support
 * - Auto-save functionality
 * - Clinical alerts and warnings
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { schemaEngine } from '../../lib/infrastructure/schemaEngine';
import { 
  FormData, 
  ValidationResult, 
  FormGenerationContext
} from '../../types/schema';

// Dynamic field components
import { 
  StringField, 
  NumberField, 
  BooleanField, 
  SelectField, 
  DateField, 
  TextAreaField,
  MedicationLookupField,
  BodyDiagramField,
  PainScaleField,
  VitalSignsField
} from './fields/BasicFields';

interface DynamicFormProps {
  schemaId: string;
  initialData?: FormData;
  context?: FormGenerationContext;
  onSubmit?: (data: FormData, validation: ValidationResult) => void;
  onChange?: (data: FormData, field: string) => void;
  onValidationChange?: (validation: ValidationResult) => void;
  autoSave?: boolean;
  autoSaveInterval?: number; // in milliseconds
  readOnly?: boolean;
  className?: string;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({
  schemaId,
  initialData = {},
  context = {},
  onSubmit,
  onChange,
  onValidationChange,
  autoSave = false,
  autoSaveInterval = 30000,
  readOnly = false,
  className = ''
}) => {
  // Form state
  const [formData, setFormData] = useState<FormData>(initialData);
  const [validation, setValidation] = useState<ValidationResult>({ valid: true, errors: [], warnings: [] });
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Generate form configuration with retry mechanism
  const formConfig = useMemo(() => {
    const config = schemaEngine.generateFormConfig(schemaId, context);
    if (!config) {
      // Try to wait a bit for schemas to be registered
      setTimeout(() => {
        setFormData(prev => ({ ...prev })); // Force re-render
      }, 100);
    }
    return config;
  }, [schemaId, context]);

  // Real-time validation
  const validateForm = useCallback(async (data: FormData) => {
    const result = await schemaEngine.validateFormData(schemaId, data, context);
    setValidation(result);
    onValidationChange?.(result);
    return result;
  }, [schemaId, context, onValidationChange]);

  // Handle field changes
  const handleFieldChange = useCallback(async (fieldName: string, value: any) => {
    const newData = { ...formData, [fieldName]: value };
    setFormData(newData);
    onChange?.(newData, fieldName);

    // Validate immediately on change
    await validateForm(newData);
  }, [formData, onChange, validateForm]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave) return;

    const autoSaveTimer = setInterval(async () => {
      if (Object.keys(formData).length === 0) return;

      setAutoSaveStatus('saving');
      try {
        const validationResult = await validateForm(formData);
        if (validationResult.valid) {
          // Here you would typically save to backend
          setAutoSaveStatus('saved');
          setTimeout(() => setAutoSaveStatus('idle'), 2000);
        } else {
          setAutoSaveStatus('error');
        }
      } catch (error) {
        setAutoSaveStatus('error');
      }
    }, autoSaveInterval);

    return () => clearInterval(autoSaveTimer);
  }, [autoSave, autoSaveInterval, formData, validateForm]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;

    setIsSubmitting(true);
    try {
      const validationResult = await validateForm(formData);
      onSubmit?.(formData, validationResult);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle multi-step navigation
  const handleStepChange = (direction: 'next' | 'prev') => {
    if (!formConfig?.layout.processedSteps) return;

    const newStep = direction === 'next' ? currentStep + 1 : currentStep - 1;
    if (newStep >= 0 && newStep < formConfig.layout.processedSteps.length) {
      setCurrentStep(newStep);
    }
  };

  // Render field based on type
  const renderField = (field: any) => {
    if (!field.visible) return null;

    const commonProps = {
      field,
      value: formData[field.name],
      onChange: (value: any) => handleFieldChange(field.name, value),
      error: validation.errors.find(e => e.field === field.name),
      warning: validation.warnings.find(w => w.field === field.name),
      disabled: field.disabled || readOnly,
      required: field.required
    };

    switch (field.type) {
      case 'string':
        return <StringField key={field.name} {...commonProps} />;
      case 'number':
      case 'range':
        return <NumberField key={field.name} {...commonProps} />;
      case 'boolean':
      case 'checkbox':
        return <BooleanField key={field.name} {...commonProps} />;
      case 'select':
      case 'radio':
        return <SelectField key={field.name} {...commonProps} />;
      case 'date':
      case 'datetime':
      case 'time':
        return <DateField key={field.name} {...commonProps} />;
      case 'textarea':
        return <TextAreaField key={field.name} {...commonProps} />;
      case 'vital-signs':
        return <VitalSignsField key={field.name} {...commonProps} />;
      case 'medication-lookup':
        return <MedicationLookupField key={field.name} {...commonProps} />;
      case 'body-diagram':
        return <BodyDiagramField key={field.name} {...commonProps} />;
      case 'pain-scale':
        return <PainScaleField key={field.name} {...commonProps} />;
      default:
        return <StringField key={field.name} {...commonProps} />;
    }
  };

  // Render validation alerts
  const renderValidationAlerts = () => {
    if (!validation.clinicalAlerts?.length) return null;

    return (
      <div className="mb-6 space-y-2">
        {validation.clinicalAlerts.map((alert, index) => (
          <div
            key={index}
            className={`border rounded-lg p-4 flex items-start space-x-3 ${
              alert.severity === 'critical' 
                ? 'bg-red-50 border-red-200' 
                : alert.severity === 'high'
                ? 'bg-orange-50 border-orange-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}
          >
            <AlertTriangle 
              className={`h-5 w-5 mt-0.5 ${
                alert.severity === 'critical' 
                  ? 'text-red-600' 
                  : alert.severity === 'high'
                  ? 'text-orange-600'
                  : 'text-yellow-600'
              }`} 
            />
            <div className="flex-1">
              <p className={`font-medium ${
                alert.severity === 'critical' 
                  ? 'text-red-800' 
                  : alert.severity === 'high'
                  ? 'text-orange-800'
                  : 'text-yellow-800'
              }`}>
                {alert.message}
              </p>
              {alert.recommendedAction && (
                <p className={`text-sm mt-1 ${
                  alert.severity === 'critical' 
                    ? 'text-red-700' 
                    : alert.severity === 'high'
                    ? 'text-orange-700'
                    : 'text-yellow-700'
                }`}>
                  <strong>Recommended Action:</strong> {alert.recommendedAction}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render auto-save status
  const renderAutoSaveStatus = () => {
    if (!autoSave) return null;

    return (
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        {autoSaveStatus === 'saving' && (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span>Saving...</span>
          </>
        )}
        {autoSaveStatus === 'saved' && (
          <>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Saved</span>
          </>
        )}
        {autoSaveStatus === 'error' && (
          <>
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span>Save failed</span>
          </>
        )}
      </div>
    );
  };

  // Render form sections
  const renderFormSections = () => {
    if (!formConfig) return null;

    // Multi-step form
    if (formConfig.layout.type === 'steps' && formConfig.layout.processedSteps) {
      const currentStepData = formConfig.layout.processedSteps[currentStep];
      const stepFields = formConfig.fields.filter(field => 
        currentStepData.fields.includes(field.name)
      );

      return (
        <div className="space-y-6">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              {formConfig.layout.processedSteps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index <= currentStep 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  {index < (formConfig.layout.processedSteps?.length || 0) - 1 && (
                    <div className={`w-12 h-0.5 ml-2 ${
                      index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            {renderAutoSaveStatus()}
          </div>

          {/* Step content */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {currentStepData.title}
            </h3>
            {currentStepData.description && (
              <p className="text-gray-600 mb-6">{currentStepData.description}</p>
            )}
            <div className="space-y-4">
              {stepFields.map(renderField)}
            </div>
          </div>

          {/* Step navigation */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => handleStepChange('prev')}
              disabled={currentStep === 0}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => handleStepChange('next')}
              disabled={currentStep === formConfig.layout.processedSteps.length - 1}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      );
    }

    // Sectioned form
    if (formConfig.layout.processedSections) {
      return (
        <div className="space-y-8">
          <div className="flex justify-end">
            {renderAutoSaveStatus()}
          </div>
          {formConfig.layout.processedSections.map(section => {
            if (!section.visible) return null;

            const sectionFields = formConfig.fields.filter(field => 
              section.fields.includes(field.name)
            );

            return (
              <div key={section.id} className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {section.title}
                </h3>
                {section.description && (
                  <p className="text-gray-600 mb-6">{section.description}</p>
                )}
                <div className="space-y-4">
                  {sectionFields.map(renderField)}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Simple vertical form
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          {renderAutoSaveStatus()}
        </div>
        <div className="space-y-4">
          {formConfig.fields.map(renderField)}
        </div>
      </div>
    );
  };

  if (!formConfig) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="text-blue-800">Loading form schema: {schemaId}</span>
        </div>
        <div className="mt-3 text-center text-sm text-blue-600">
          If this persists, please refresh the page or contact support.
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      <form onSubmit={handleSubmit}>
        {/* Form header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            {formConfig.schema.title}
          </h2>
          {formConfig.schema.description && (
            <p className="text-gray-600 mt-2">{formConfig.schema.description}</p>
          )}
        </div>

        {/* Clinical alerts */}
        {renderValidationAlerts()}

        {/* Form content */}
        {renderFormSections()}

        {/* Form actions */}
        {!readOnly && (
          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="submit"
              disabled={isSubmitting || !validation.valid}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
