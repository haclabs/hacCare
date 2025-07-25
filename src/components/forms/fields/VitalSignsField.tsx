/**
 * Vital Signs Field Component
 * 
 * Specialized form field for collecting vital signs data with healthcare-specific
 * validation, normal ranges, and clinical alerts.
 */

import React, { useState } from 'react';
import { Thermometer, Heart, Activity, Droplets, Wind, AlertTriangle, Info } from 'lucide-react';
import { FieldError, FieldWarning } from '../../../types/schema';

interface ProcessedField {
  name: string;
  type: string;
  title: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  visible?: boolean;
}

interface VitalSignsFieldProps {
  field: ProcessedField;
  value: any;
  onChange: (value: any) => void;
  error?: FieldError;
  warning?: FieldWarning;
  disabled?: boolean;
  required?: boolean;
}

interface VitalSignsData {
  temperature?: number;
  heartRate?: number;
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  };
  respiratoryRate?: number;
  oxygenSaturation?: number;
  painScale?: number;
}

export const VitalSignsField: React.FC<VitalSignsFieldProps> = ({
  field,
  value = {},
  onChange,
  error,
  warning,
  disabled = false,
  required = false
}) => {
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleVitalChange = (vitalType: keyof VitalSignsData, newValue: any) => {
    const updatedValue = { ...value, [vitalType]: newValue };
    onChange(updatedValue);
  };

  const handleBloodPressureChange = (type: 'systolic' | 'diastolic', newValue: number) => {
    const updatedBP = { 
      ...value.bloodPressure, 
      [type]: newValue 
    };
    handleVitalChange('bloodPressure', updatedBP);
  };

  const getFieldStatus = (currentValue: number, ranges?: any) => {
    if (!ranges || !currentValue) return 'normal';
    
    const { min, max, critical } = ranges;
    
    if (critical && (currentValue <= critical.low || currentValue >= critical.high)) {
      return 'critical';
    }
    if (currentValue < min || currentValue > max) {
      return 'abnormal';
    }
    return 'normal';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'border-red-500 bg-red-50';
      case 'abnormal':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'abnormal':
        return <Info className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  // Define normal ranges (these would typically come from field configuration)
  const ranges = {
    temperature: { min: 36.1, max: 37.2, critical: { low: 35, high: 40 } },
    heartRate: { min: 60, max: 100, critical: { low: 40, high: 150 } },
    systolic: { min: 90, max: 140, critical: { low: 70, high: 180 } },
    diastolic: { min: 60, max: 90, critical: { low: 40, high: 110 } },
    respiratoryRate: { min: 12, max: 20, critical: { low: 8, high: 30 } },
    oxygenSaturation: { min: 95, max: 100, critical: { low: 90, high: 100 } }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-900">
          {field.title}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {field.description && (
          <div className="relative group">
            <Info className="h-4 w-4 text-gray-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              {field.description}
            </div>
          </div>
        )}
      </div>

      {/* Temperature */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Thermometer className="h-4 w-4 text-red-500" />
            <label className="text-sm font-medium text-gray-700">Temperature (°C)</label>
            {getStatusIcon(getFieldStatus(value.temperature, ranges.temperature))}
          </div>
          <input
            type="number"
            step="0.1"
            min="35"
            max="42"
            value={value.temperature || ''}
            onChange={(e) => handleVitalChange('temperature', parseFloat(e.target.value) || null)}
            onFocus={() => setFocusedField('temperature')}
            onBlur={() => setFocusedField(null)}
            disabled={disabled}
            className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              getStatusColor(getFieldStatus(value.temperature, ranges.temperature))
            }`}
            placeholder="37.0"
          />
          {focusedField === 'temperature' && (
            <p className="text-xs text-gray-600">Normal: 36.1-37.2°C</p>
          )}
        </div>

        {/* Heart Rate */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Heart className="h-4 w-4 text-red-500" />
            <label className="text-sm font-medium text-gray-700">Heart Rate (BPM)</label>
            {getStatusIcon(getFieldStatus(value.heartRate, ranges.heartRate))}
          </div>
          <input
            type="number"
            min="30"
            max="200"
            value={value.heartRate || ''}
            onChange={(e) => handleVitalChange('heartRate', parseInt(e.target.value) || null)}
            onFocus={() => setFocusedField('heartRate')}
            onBlur={() => setFocusedField(null)}
            disabled={disabled}
            className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              getStatusColor(getFieldStatus(value.heartRate, ranges.heartRate))
            }`}
            placeholder="72"
          />
          {focusedField === 'heartRate' && (
            <p className="text-xs text-gray-600">Normal: 60-100 BPM</p>
          )}
        </div>

        {/* Oxygen Saturation */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Droplets className="h-4 w-4 text-blue-500" />
            <label className="text-sm font-medium text-gray-700">O2 Saturation (%)</label>
            {getStatusIcon(getFieldStatus(value.oxygenSaturation, ranges.oxygenSaturation))}
          </div>
          <input
            type="number"
            min="70"
            max="100"
            value={value.oxygenSaturation || ''}
            onChange={(e) => handleVitalChange('oxygenSaturation', parseInt(e.target.value) || null)}
            onFocus={() => setFocusedField('oxygenSaturation')}
            onBlur={() => setFocusedField(null)}
            disabled={disabled}
            className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              getStatusColor(getFieldStatus(value.oxygenSaturation, ranges.oxygenSaturation))
            }`}
            placeholder="98"
          />
          {focusedField === 'oxygenSaturation' && (
            <p className="text-xs text-gray-600">Normal: 95-100%</p>
          )}
        </div>
      </div>

      {/* Blood Pressure */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Activity className="h-4 w-4 text-green-500" />
          <label className="text-sm font-medium text-gray-700">Blood Pressure (mmHg)</label>
          {(getStatusIcon(getFieldStatus(value.bloodPressure?.systolic, ranges.systolic)) ||
            getStatusIcon(getFieldStatus(value.bloodPressure?.diastolic, ranges.diastolic)))}
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            min="50"
            max="250"
            value={value.bloodPressure?.systolic || ''}
            onChange={(e) => handleBloodPressureChange('systolic', parseInt(e.target.value) || 0)}
            onFocus={() => setFocusedField('systolic')}
            onBlur={() => setFocusedField(null)}
            disabled={disabled}
            className={`w-24 px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              getStatusColor(getFieldStatus(value.bloodPressure?.systolic, ranges.systolic))
            }`}
            placeholder="120"
          />
          <span className="text-gray-500 font-medium">/</span>
          <input
            type="number"
            min="30"
            max="150"
            value={value.bloodPressure?.diastolic || ''}
            onChange={(e) => handleBloodPressureChange('diastolic', parseInt(e.target.value) || 0)}
            onFocus={() => setFocusedField('diastolic')}
            onBlur={() => setFocusedField(null)}
            disabled={disabled}
            className={`w-24 px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              getStatusColor(getFieldStatus(value.bloodPressure?.diastolic, ranges.diastolic))
            }`}
            placeholder="80"
          />
          {(focusedField === 'systolic' || focusedField === 'diastolic') && (
            <p className="text-xs text-gray-600 ml-2">Normal: 90-140/60-90 mmHg</p>
          )}
        </div>
      </div>

      {/* Respiratory Rate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Wind className="h-4 w-4 text-purple-500" />
            <label className="text-sm font-medium text-gray-700">Respiratory Rate (/min)</label>
            {getStatusIcon(getFieldStatus(value.respiratoryRate, ranges.respiratoryRate))}
          </div>
          <input
            type="number"
            min="8"
            max="40"
            value={value.respiratoryRate || ''}
            onChange={(e) => handleVitalChange('respiratoryRate', parseInt(e.target.value) || null)}
            onFocus={() => setFocusedField('respiratoryRate')}
            onBlur={() => setFocusedField(null)}
            disabled={disabled}
            className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              getStatusColor(getFieldStatus(value.respiratoryRate, ranges.respiratoryRate))
            }`}
            placeholder="16"
          />
          {focusedField === 'respiratoryRate' && (
            <p className="text-xs text-gray-600">Normal: 12-20 /min</p>
          )}
        </div>

        {/* Pain Scale */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Pain Scale (0-10)</label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="0"
              max="10"
              value={value.painScale || 0}
              onChange={(e) => handleVitalChange('painScale', parseInt(e.target.value))}
              disabled={disabled}
              className="flex-1"
            />
            <span className={`text-lg font-medium px-2 py-1 rounded ${
              (value.painScale || 0) >= 7 ? 'text-red-600 bg-red-100' :
              (value.painScale || 0) >= 4 ? 'text-yellow-600 bg-yellow-100' :
              'text-green-600 bg-green-100'
            }`}>
              {value.painScale || 0}
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>No Pain</span>
            <span>Worst Pain</span>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>{error.message}</span>
        </div>
      )}

      {/* Warning display */}
      {warning && (
        <div className="flex items-center space-x-2 text-yellow-600 text-sm">
          <Info className="h-4 w-4" />
          <span>{warning.message}</span>
        </div>
      )}
    </div>
  );
};
