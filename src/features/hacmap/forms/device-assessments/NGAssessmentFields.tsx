/**
 * Nasogastric Tube (NG) Assessment Fields
 */

import React, { useState, useEffect } from 'react';
import type { Device, NGAssessmentData } from '../../../../types/hacmap';

interface NGAssessmentFieldsProps {
  device: Device;
  onChange: (data: NGAssessmentData) => void;
}

export const NGAssessmentFields: React.FC<NGAssessmentFieldsProps> = ({ device: _device, onChange }) => {
  const [xrayConfirmed, setXrayConfirmed] = useState(false);
  const [tubeSizeFr, setTubeSizeFr] = useState('');
  const [securement, setSecurement] = useState('');
  const [attachedTo, setAttachedTo] = useState('');
  const [gastricPh, setGastricPh] = useState<number | undefined>();
  const [gastricContentsAppearance, setGastricContentsAppearance] = useState('');
  const [externalLengthMm, setExternalLengthMm] = useState<number | undefined>();
  const [residualVolumeMl, setResidualVolumeMl] = useState<number | undefined>();
  const [tubePatent, setTubePatent] = useState(true);
  const [tubeNotes, setTubeNotes] = useState('');

  useEffect(() => {
    const data: NGAssessmentData = {
      xray_confirmed: xrayConfirmed,
      tube_size_fr: tubeSizeFr || undefined,
      securement: securement || undefined,
      attached_to: attachedTo || undefined,
      gastric_ph: gastricPh,
      gastric_contents_appearance: gastricContentsAppearance || undefined,
      external_length_mm: externalLengthMm,
      residual_volume_ml: residualVolumeMl,
      tube_patent: tubePatent,
      tube_notes: tubeNotes || undefined,
    };
    onChange(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xrayConfirmed, tubeSizeFr, securement, attachedTo, gastricPh, gastricContentsAppearance, externalLengthMm, residualVolumeMl, tubePatent, tubeNotes]);

  return (
    <div className="space-y-6 p-4 bg-orange-50 border border-orange-200 rounded-md">
      <h3 className="text-sm font-semibold text-orange-900">Nasogastric Tube (NG) Assessment</h3>

      {/* Placement Verification */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Placement Verification</h4>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={xrayConfirmed}
            onChange={(e) => setXrayConfirmed(e.target.checked)}
            className="rounded text-orange-500 focus:ring-orange-500"
          />
          <span className="text-sm font-medium text-gray-700">Radiographic Confirmation (X-ray) Verified</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={tubePatent}
            onChange={(e) => setTubePatent(e.target.checked)}
            className="rounded text-orange-500 focus:ring-orange-500"
          />
          <span className="text-sm font-medium text-gray-700">Tube Patent</span>
        </label>
      </div>

      {/* Tube Details */}
      <div className="border-t border-orange-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Tube Details</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tube Size (French)</label>
            <input
              type="text"
              value={tubeSizeFr}
              onChange={(e) => setTubeSizeFr(e.target.value)}
              placeholder="e.g., 12, 14, 16"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Securement Device</label>
            <select
              value={securement}
              onChange={(e) => setSecurement(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select...</option>
              <option value="Mefix">Mefix</option>
              <option value="Bridle">Bridle</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Attached To</label>
            <select
              value={attachedTo}
              onChange={(e) => setAttachedTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select...</option>
              <option value="Gravity">Gravity</option>
              <option value="Suction">Suction</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">External Tube Length (mm)</label>
            <input
              type="number"
              value={externalLengthMm || ''}
              onChange={(e) => setExternalLengthMm(e.target.value ? parseFloat(e.target.value) : undefined)}
              min="0"
              step="1"
              placeholder="mm at nare"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Gastric Contents */}
      <div className="border-t border-orange-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Gastric Contents</h4>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">pH of Gastric Contents</label>
            <input
              type="number"
              value={gastricPh || ''}
              onChange={(e) => setGastricPh(e.target.value ? parseFloat(e.target.value) : undefined)}
              step="0.1"
              min="0"
              max="14"
              placeholder="0.0 – 14.0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Residual Volume (mL)</label>
            <input
              type="number"
              value={residualVolumeMl || ''}
              onChange={(e) => setResidualVolumeMl(e.target.value ? parseFloat(e.target.value) : undefined)}
              min="0"
              step="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Visual Inspection of Gastric Contents</label>
          <input
            type="text"
            value={gastricContentsAppearance}
            onChange={(e) => setGastricContentsAppearance(e.target.value)}
            placeholder="e.g., Clear, Bile-tinged, Bloody, Coffee-grounds"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="border-t border-orange-200 pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
        <textarea
          value={tubeNotes}
          onChange={(e) => setTubeNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500"
          placeholder="Any additional NG tube assessment notes..."
        />
      </div>
    </div>
  );
};
