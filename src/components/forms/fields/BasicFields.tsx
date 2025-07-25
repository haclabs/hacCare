/**
 * Basic Field Components for Dynamic Forms
 */

import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { FieldError, FieldWarning } from '../../../types/schema';

interface ProcessedField {
  name: string;
  type: string;
  title: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  visible?: boolean;
  validation?: any;
  options?: any;
}

interface BaseFieldProps {
  field: ProcessedField;
  value: any;
  onChange: (value: any) => void;
  error?: FieldError;
  warning?: FieldWarning;
  disabled?: boolean;
  required?: boolean;
}

export const StringField: React.FC<BaseFieldProps> = ({
  field,
  value = '',
  onChange,
  error,
  warning,
  disabled = false,
  required = false
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-900">
        {field.title}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder={field.description}
      />
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>{error.message}</span>
        </div>
      )}
      {warning && (
        <div className="flex items-center space-x-2 text-yellow-600 text-sm">
          <Info className="h-4 w-4" />
          <span>{warning.message}</span>
        </div>
      )}
    </div>
  );
};

export const NumberField: React.FC<BaseFieldProps> = ({
  field,
  value,
  onChange,
  error,
  warning,
  disabled = false,
  required = false
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-900">
        {field.title}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(parseFloat(e.target.value) || null)}
        disabled={disabled}
        min={field.validation?.min}
        max={field.validation?.max}
        step={field.validation?.step || 'any'}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder={field.description}
      />
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>{error.message}</span>
        </div>
      )}
      {warning && (
        <div className="flex items-center space-x-2 text-yellow-600 text-sm">
          <Info className="h-4 w-4" />
          <span>{warning.message}</span>
        </div>
      )}
    </div>
  );
};

export const BooleanField: React.FC<BaseFieldProps> = ({
  field,
  value = false,
  onChange,
  error,
  warning,
  disabled = false
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label className="text-sm font-medium text-gray-900">
          {field.title}
        </label>
      </div>
      {field.description && (
        <p className="text-sm text-gray-600">{field.description}</p>
      )}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>{error.message}</span>
        </div>
      )}
    </div>
  );
};

export const SelectField: React.FC<BaseFieldProps> = ({
  field,
  value = '',
  onChange,
  error,
  warning,
  disabled = false,
  required = false
}) => {
  const options = field.options || [];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-900">
        {field.title}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Select an option...</option>
        {options.map((option: any, index: number) => (
          <option key={index} value={option.value || option}>
            {option.label || option}
          </option>
        ))}
      </select>
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>{error.message}</span>
        </div>
      )}
      {warning && (
        <div className="flex items-center space-x-2 text-yellow-600 text-sm">
          <Info className="h-4 w-4" />
          <span>{warning.message}</span>
        </div>
      )}
    </div>
  );
};

export const DateField: React.FC<BaseFieldProps> = ({
  field,
  value = '',
  onChange,
  error,
  warning,
  disabled = false,
  required = false
}) => {
  const inputType = field.type === 'datetime' ? 'datetime-local' : 
                   field.type === 'time' ? 'time' : 'date';

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-900">
        {field.title}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>{error.message}</span>
        </div>
      )}
      {warning && (
        <div className="flex items-center space-x-2 text-yellow-600 text-sm">
          <Info className="h-4 w-4" />
          <span>{warning.message}</span>
        </div>
      )}
    </div>
  );
};

export const TextAreaField: React.FC<BaseFieldProps> = ({
  field,
  value = '',
  onChange,
  error,
  warning,
  disabled = false,
  required = false
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-900">
        {field.title}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={4}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder={field.description}
      />
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>{error.message}</span>
        </div>
      )}
      {warning && (
        <div className="flex items-center space-x-2 text-yellow-600 text-sm">
          <Info className="h-4 w-4" />
          <span>{warning.message}</span>
        </div>
      )}
    </div>
  );
};

// Placeholder components for specialized healthcare fields
export const MedicationLookupField: React.FC<BaseFieldProps> = (props) => {
  return (
    <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg">
      <p className="text-gray-600">Medication Lookup Field - To be implemented</p>
      <StringField {...props} />
    </div>
  );
};

export const BodyDiagramField: React.FC<BaseFieldProps> = (props) => {
  return (
    <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg">
      <p className="text-gray-600">Body Diagram Field - To be implemented</p>
      <StringField {...props} />
    </div>
  );
};

export const PainScaleField: React.FC<BaseFieldProps> = ({
  field,
  value = 0,
  onChange,
  error,
  disabled = false,
  required = false
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-900">
        {field.title}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex items-center space-x-4">
        <input
          type="range"
          min="0"
          max="10"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
          className="flex-1"
        />
        <span className={`text-lg font-medium px-3 py-1 rounded ${
          value >= 7 ? 'text-red-600 bg-red-100' :
          value >= 4 ? 'text-yellow-600 bg-yellow-100' :
          'text-green-600 bg-green-100'
        }`}>
          {value}
        </span>
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>No Pain</span>
        <span>Worst Pain</span>
      </div>
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>{error.message}</span>
        </div>
      )}
    </div>
  );
};

export { VitalSignsField } from './VitalSignsField';
