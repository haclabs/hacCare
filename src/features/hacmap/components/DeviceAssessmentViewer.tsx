/**
 * Device Assessment Viewer - Display device assessment details
 */

import React from 'react';
import type { DeviceAssessment, Device } from '../../../types/hacmap';
import { DEVICE_TYPE_LABELS } from '../../../types/hacmap';

interface DeviceAssessmentViewerProps {
  assessment: DeviceAssessment;
  device?: Device;
}

export const DeviceAssessmentViewer: React.FC<DeviceAssessmentViewerProps> = ({ assessment, device }) => {
  const renderAssessmentData = () => {
    const data = assessment.assessment_data;
    if (!data || Object.keys(data).length === 0) {
      return <p className="text-gray-500 italic">No detailed assessment data recorded.</p>;
    }

    return (
      <div className="space-y-4">
        {Object.entries(data).map(([key, value]) => {
          if (value === null || value === undefined || value === '') return null;
          
          const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          let displayValue: string;

          if (Array.isArray(value)) {
            displayValue = value.length > 0 ? value.join(', ') : 'None';
          } else if (typeof value === 'boolean') {
            displayValue = value ? 'Yes' : 'No';
          } else if (typeof value === 'object') {
            displayValue = JSON.stringify(value, null, 2);
          } else {
            displayValue = String(value);
          }

          return (
            <div key={key} className="grid grid-cols-3 gap-2">
              <dt className="text-sm font-medium text-gray-700">{displayKey}</dt>
              <dd className="col-span-2 text-sm text-gray-900">{displayValue}</dd>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">Device Type</label>
            <p className="text-gray-900">{DEVICE_TYPE_LABELS[assessment.device_type]}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">Assessed By</label>
            <p className="text-gray-900">{assessment.student_name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">Assessment Date/Time</label>
            <p className="text-gray-900">{new Date(assessment.assessed_at).toLocaleString()}</p>
          </div>
          {assessment.status && (
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-1">Status</label>
              <p className="text-gray-900">{assessment.status}</p>
            </div>
          )}
        </div>
      </div>

      {/* Device Context */}
      {device && (
        <div className="border-t pt-4">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Device Information</h4>
          <div className="grid grid-cols-2 gap-4">
            {device.gauge && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gauge</label>
                <p className="text-gray-900">{device.gauge}</p>
              </div>
            )}
            {device.route && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
                <p className="text-gray-900">{device.route}</p>
              </div>
            )}
            {device.site_location && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site Location</label>
                <p className="text-gray-900">{device.site_location}</p>
              </div>
            )}
            {device.inserted_by && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inserted By</label>
                <p className="text-gray-900">{device.inserted_by}</p>
              </div>
            )}
            {device.placement_date && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Placement Date</label>
                <p className="text-gray-900">
                  {device.placement_date}
                  {device.placement_time && ` ${device.placement_time}`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generic Assessment Fields */}
      {(assessment.output_amount_ml || assessment.notes) && (
        <div className="border-t pt-4">
          <h4 className="text-md font-semibold text-gray-900 mb-3">General Assessment</h4>
          <div className="space-y-3">
            {assessment.output_amount_ml && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Output Amount</label>
                <p className="text-gray-900">{assessment.output_amount_ml} mL</p>
              </div>
            )}
            {assessment.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <p className="text-gray-900 whitespace-pre-wrap">{assessment.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Device-Specific Assessment Data */}
      <div className="border-t pt-4">
        <h4 className="text-md font-semibold text-gray-900 mb-3">Detailed Assessment</h4>
        {renderAssessmentData()}
      </div>
    </div>
  );
};
