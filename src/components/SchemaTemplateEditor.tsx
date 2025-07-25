/**
 * Schema Template Editor
 * 
 * Allows super admins to edit JSON schema templates for modular forms.
 * Provides a visual interface for customizing healthcare form structures,
 * validation rules, and clinical configurations.
 */

import React, { useState, useEffect } from 'react';
import { Save, X, FileText, AlertTriangle } from 'lucide-react';
import { VitalsSchema } from '../types/schema';
import { schemaEngine } from '../lib/schemaEngine';
import { useTenant } from '../contexts/TenantContext';

interface SchemaTemplateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schema: VitalsSchema) => void;
  initialSchema?: VitalsSchema;
}

export const SchemaTemplateEditor: React.FC<SchemaTemplateEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSchema
}) => {
  const { isMultiTenantAdmin } = useTenant();
  const [schema, setSchema] = useState<VitalsSchema>(initialSchema || getDefaultSchema());
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState('');

  // Initialize JSON text when schema changes
  useEffect(() => {
    setJsonText(JSON.stringify(schema, null, 2));
  }, [schema]);

  // Don't render if user is not super admin
  if (!isMultiTenantAdmin) {
    return null;
  }

  if (!isOpen) return null;

  function getDefaultSchema(): VitalsSchema {
    return {
      id: 'custom-vitals-form',
      title: 'Custom Vitals Form',
      description: 'A customizable vitals form',
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
        vitalSigns: {
          type: 'vital-signs',
          title: 'Vital Signs',
          required: true,
          healthcare: {
            category: 'vitals'
          }
        }
      },
      required: ['patientId', 'vitalSigns'],
      metadata: {
        author: 'Super Admin',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        tags: ['vitals', 'custom'],
        clinicalSpecialty: 'nursing',
        complianceLevel: 'hipaa' as const,
        vitalTypes: ['temperature', 'blood_pressure', 'heart_rate', 'respiratory_rate', 'oxygen_saturation'] as const,
        alertThresholds: {
          temperature: { min: 35.0, max: 39.0 },
          heartRate: { min: 50, max: 120 },
          bloodPressure: { min: 80, max: 160 }
        },
        units: {
          temperature: '°F',
          heartRate: 'bpm',
          respiratoryRate: 'breaths/min',
          oxygenSaturation: '%'
        }
      }
    };
  }

  const handleJsonChange = (value: string) => {
    setJsonText(value);
    try {
      const parsedSchema = JSON.parse(value);
      setSchema(parsedSchema);
      setJsonError(null);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
    }
  };

  const handleSave = () => {
    if (jsonError) {
      alert('Please fix JSON errors before saving');
      return;
    }
    
    try {
      // Validate schema structure
      schemaEngine.registerSchema(schema);
      onSave(schema);
      onClose();
    } catch (error) {
      alert(`Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Schema Template Editor</h2>
              <p className="text-sm text-gray-600">Customize healthcare form templates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <div className="px-6 py-3 font-medium text-sm border-b-2 border-blue-500 text-blue-600">
            <FileText className="h-4 w-4 inline mr-2" />
            JSON Editor
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-4">
            {jsonError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">JSON Error</p>
                  <p className="text-sm text-red-700">{jsonError}</p>
                </div>
              </div>
            )}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Edit the JSON schema to modify form structure, validation rules, and field configurations.
              </p>
            </div>
            <textarea
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              className="w-full h-96 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Edit JSON schema directly..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Schema ID: {schema.id} • Version: {schema.version}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!!jsonError}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save Schema</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
