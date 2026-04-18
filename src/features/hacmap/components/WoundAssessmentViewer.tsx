import React from 'react';
import type { Assessment } from '../../../types/hacmap';

interface WoundAssessmentViewerProps {
  assessment: Assessment;
}

export const WoundAssessmentViewer: React.FC<WoundAssessmentViewerProps> = ({ assessment }) => {
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-purple-900 mb-1">
              Assessment Type
            </label>
            <p className="text-gray-900">
              {assessment.device_id ? 'Device Assessment' : 'Wound Assessment'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-900 mb-1">
              Assessed By
            </label>
            <p className="text-gray-900">{assessment.student_name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-900 mb-1">
              Assessment Date/Time
            </label>
            <p className="text-gray-900">
              {new Date(assessment.assessed_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Common Fields */}
      <div className="grid grid-cols-2 gap-4">
        {assessment.site_condition && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Site Condition
            </label>
            <p className="text-gray-900 capitalize">{assessment.site_condition}</p>
          </div>
        )}
        {assessment.pain_level !== null && assessment.pain_level !== undefined && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pain Level
            </label>
            <p className="text-gray-900">{assessment.pain_level}/10</p>
          </div>
        )}
      </div>

      {/* Device-Specific Fields */}
      {assessment.device_id && (
        <div className="border-t pt-4">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Device Details</h4>
          <div className="grid grid-cols-2 gap-4">
            {assessment.device_functioning !== null && assessment.device_functioning !== undefined && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Functioning
                </label>
                <p className="text-gray-900">
                  {assessment.device_functioning ? 'Yes' : 'No'}
                </p>
              </div>
            )}
            {assessment.output_amount_ml && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Output Amount
                </label>
                <p className="text-gray-900">{assessment.output_amount_ml} mL</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Wound-Specific Fields */}
      {assessment.wound_id && (
        <div className="border-t pt-4">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Wound Details</h4>
          <div className="space-y-4">
            {(assessment.wound_length_cm || assessment.wound_width_cm || assessment.wound_depth_cm) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dimensions
                </label>
                <p className="text-gray-900">
                  L: {assessment.wound_length_cm || '-'} cm ×{' '}
                  W: {assessment.wound_width_cm || '-'} cm ×{' '}
                  D: {assessment.wound_depth_cm || '-'} cm
                </p>
              </div>
            )}

            {assessment.wound_appearance && (Array.isArray(assessment.wound_appearance) ? assessment.wound_appearance.length > 0 : (assessment.wound_appearance as string).length > 0) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wound Appearance
                </label>
                <p className="text-gray-900 capitalize">
                  {Array.isArray(assessment.wound_appearance)
                    ? assessment.wound_appearance.join(', ')
                    : (assessment.wound_appearance as string)}
                </p>
              </div>
            )}

            {assessment.surrounding_skin && (Array.isArray(assessment.surrounding_skin) ? assessment.surrounding_skin.length > 0 : (assessment.surrounding_skin as string).length > 0) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Surrounding Skin
                </label>
                <p className="text-gray-900 capitalize">
                  {Array.isArray(assessment.surrounding_skin)
                    ? assessment.surrounding_skin.map((s: string) =>
                        s === 'erythema' ? 'Erythema (Redness)' :
                        s === 'edema' ? 'Edema (Swelling)' :
                        s.charAt(0).toUpperCase() + s.slice(1)
                      ).join(', ')
                    : (assessment.surrounding_skin as string)}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {assessment.drainage_amount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Drainage Amount
                  </label>
                  <p className="text-gray-900 capitalize">{assessment.drainage_amount}</p>
                </div>
              )}
              {assessment.drainage_type && (Array.isArray(assessment.drainage_type) ? assessment.drainage_type.length > 0 : (assessment.drainage_type as string).length > 0) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Drainage Type
                  </label>
                  <p className="text-gray-900 capitalize">
                    {Array.isArray(assessment.drainage_type)
                      ? assessment.drainage_type.join(', ')
                      : (assessment.drainage_type as string)}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {assessment.treatment_applied && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Treatment Applied
                  </label>
                  <p className="text-gray-900">{assessment.treatment_applied}</p>
                </div>
              )}
              {assessment.dressing_type && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dressing Type
                  </label>
                  <p className="text-gray-900">{assessment.dressing_type}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {assessment.notes && (
        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes
          </label>
          <p className="text-gray-900 whitespace-pre-wrap">{assessment.notes}</p>
        </div>
      )}
    </div>
  );
};
