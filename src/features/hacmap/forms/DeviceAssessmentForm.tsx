/**
 * Device Assessment Form - Dynamic form for device assessments
 * Routes to device-type-specific field components
 */

import React, { useState } from 'react';
import { Save } from 'lucide-react';
import type { Device, CreateDeviceAssessmentInput } from '../../../types/hacmap';
import { DEVICE_TYPE_LABELS } from '../../../types/hacmap';
import { IVAssessmentFields } from './device-assessments/IVAssessmentFields';
import { FoleyAssessmentFields } from './device-assessments/FoleyAssessmentFields';
import { FeedingTubeAssessmentFields } from './device-assessments/FeedingTubeAssessmentFields';

interface DeviceAssessmentFormProps {
  device: Device;
  patientId: string;
  tenantId: string;
  onSave: (data: CreateDeviceAssessmentInput) => Promise<void>;
  onCancel: () => void;
}

export const DeviceAssessmentForm: React.FC<DeviceAssessmentFormProps> = ({
  device,
  patientId,
  tenantId,
  onSave,
  onCancel
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [status, setStatus] = useState<string>('');
  const [outputAmountMl, setOutputAmountMl] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [assessmentData, setAssessmentData] = useState<Record<string, any>>({});

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAssessmentDataChange = (data: Record<string, any>) => {
    setAssessmentData(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data: CreateDeviceAssessmentInput = {
        device_id: device.id,
        patient_id: patientId,
        tenant_id: tenantId,
        student_name: studentName,
        device_type: device.type,
        status: status || undefined,
        output_amount_ml: outputAmountMl,
        notes: notes || undefined,
        assessment_data: assessmentData
      };

      await onSave(data);
    } catch (error) {
      console.error('Error saving device assessment:', error);
      alert('Failed to save assessment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDeviceSpecificFields = () => {
    switch (device.type) {
      case 'iv-peripheral':
      case 'iv-picc':
      case 'iv-port':
        return <IVAssessmentFields device={device} onChange={handleAssessmentDataChange} />;
      
      case 'foley':
        return <FoleyAssessmentFields device={device} onChange={handleAssessmentDataChange} />;
      
      case 'feeding-tube':
        return <FeedingTubeAssessmentFields device={device} onChange={handleAssessmentDataChange} />;
      
      case 'chest-tube':
      case 'closed-suction-drain':
        // Generic fields are sufficient for now (output_amount_ml, status, notes)
        return (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-sm text-gray-600">
              Use the Output Amount and Status fields below. Chest Tube and Drain-specific assessment fields coming soon.
            </p>
          </div>
        );
      
      case 'other':
        // Notes-only for Other
        return (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-sm text-gray-600">
              Use the Notes field below to document your assessment.
            </p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800">
        <p className="font-medium">Assessment Information</p>
        <p>All measurements use metric units (mL, cm). Times are in 24-hour format.</p>
      </div>

      {/* Device Information Header (Read-Only) */}
      <div className="p-4 bg-gray-100 border border-gray-300 rounded-md">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Device Being Assessed</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Type:</span>{' '}
            <span className="text-gray-900">{DEVICE_TYPE_LABELS[device.type]}</span>
          </div>
          {device.gauge && (
            <div>
              <span className="font-medium text-gray-700">Gauge:</span>{' '}
              <span className="text-gray-900">{device.gauge}</span>
            </div>
          )}
          {device.route && (
            <div>
              <span className="font-medium text-gray-700">Route:</span>{' '}
              <span className="text-gray-900">{device.route}</span>
            </div>
          )}
          {device.site_location && (
            <div>
              <span className="font-medium text-gray-700">Location:</span>{' '}
              <span className="text-gray-900">{device.site_location}</span>
            </div>
          )}
          {device.inserted_by && (
            <div>
              <span className="font-medium text-gray-700">Inserted By:</span>{' '}
              <span className="text-gray-900">{device.inserted_by}</span>
            </div>
          )}
          {device.placement_date && (
            <div>
              <span className="font-medium text-gray-700">Insertion Date:</span>{' '}
              <span className="text-gray-900">
                {device.placement_date}
                {device.placement_time && ` ${device.placement_time}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Device-Specific Assessment Fields */}
      {renderDeviceSpecificFields()}

      {/* Generic Fields */}
      <div className="space-y-4">
        {/* Status */}
        {device.type !== 'other' && (
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Overall Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Select...</option>
              <option value="Normal">Normal / No Issues</option>
              <option value="Monitor">Monitor Closely</option>
              <option value="Intervention Required">Intervention Required</option>
              <option value="Discontinued">Discontinued</option>
            </select>
          </div>
        )}

        {/* Output Amount */}
        {(device.type === 'foley' || device.type === 'chest-tube' || device.type === 'closed-suction-drain') && (
          <div>
            <label htmlFor="outputAmountMl" className="block text-sm font-medium text-gray-700 mb-1">
              Output Amount (mL)
            </label>
            <input
              type="number"
              id="outputAmountMl"
              value={outputAmountMl || ''}
              onChange={(e) => setOutputAmountMl(e.target.value ? parseFloat(e.target.value) : undefined)}
              step="0.1"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Any additional observations or concerns..."
          />
        </div>
      </div>

      {/* Student Name Verification */}
      <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-md">
        <label htmlFor="studentName" className="block text-sm font-medium text-gray-900 mb-2">
          Student Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="studentName"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          placeholder="Enter your full name"
        />
        <p className="mt-2 text-xs text-gray-700 font-medium">
          By entering your name, you verify this assessment is accurate.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !studentName.trim()}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>Save Assessment</span>
        </button>
      </div>
    </form>
  );
};
