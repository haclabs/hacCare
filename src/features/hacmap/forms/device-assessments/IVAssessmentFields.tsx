/**
 * IV Assessment Fields - Shared by all IV types (Peripheral, PICC, Port)
 */

import React, { useState, useEffect } from 'react';
import type { Device, IVAssessmentData } from '../../../../types/hacmap';

interface IVAssessmentFieldsProps {
  device: Device;
  onChange: (data: IVAssessmentData) => void;
}

export const IVAssessmentFields: React.FC<IVAssessmentFieldsProps> = ({ device, onChange }) => {
  const [siteLocation, setSiteLocation] = useState(device.site_location || '');
  const [siteSide, setSiteSide] = useState<'Left' | 'Right' | ''>(device.site_side as 'Left' | 'Right' || '');
  const [gauge, setGauge] = useState(device.gauge || '');
  const [localSiteAssessment, setLocalSiteAssessment] = useState<string[]>([]);
  const [infiltrationSuspected, setInfiltrationSuspected] = useState(false);
  const [phlebitisSuspected, setPhlebitisSuspected] = useState(false);
  const [drainageColour, setDrainageColour] = useState<string[]>([]);
  const [siteNotes, setSiteNotes] = useState('');
  const [lineStatus, setLineStatus] = useState<'patent_infusing' | 'patent_saline_lock' | 'sluggish' | 'occluded' | 'discontinued' | ''>('');
  const [lineInterventions, setLineInterventions] = useState<string[]>([]);
  const [dressingType, setDressingType] = useState('');
  const [dressingStatus, setDressingStatus] = useState<string[]>([]);
  const [dressingTolerance, setDressingTolerance] = useState('');

  useEffect(() => {
    const data: IVAssessmentData = {
      site_location: siteLocation,
      site_side: siteSide || undefined,
      gauge,
      local_site_assessment: localSiteAssessment,
      infiltration_suspected: infiltrationSuspected,
      phlebitis_suspected: phlebitisSuspected,
      drainage_colour: drainageColour,
      site_notes: siteNotes || undefined,
      line_status: lineStatus || undefined,
      line_interventions: lineInterventions,
      dressing_type: dressingType || undefined,
      dressing_status: dressingStatus,
      dressing_tolerance: dressingTolerance || undefined
    };
    onChange(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteLocation, siteSide, gauge, localSiteAssessment, infiltrationSuspected, phlebitisSuspected, drainageColour, siteNotes, lineStatus, lineInterventions, dressingType, dressingStatus, dressingTolerance]);

  const toggleArrayItem = (array: string[], setArray: (arr: string[]) => void, value: string) => {
    if (array.includes(value)) {
      setArray(array.filter(v => v !== value));
    } else {
      setArray([...array, value]);
    }
  };

  return (
    <div className="space-y-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
      <h3 className="text-sm font-semibold text-blue-900">IV Site & Line Assessment</h3>

      {/* Site/Orientation */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Site Location</label>
          <input
            type="text"
            value={siteLocation}
            onChange={(e) => setSiteLocation(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Antecubital"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Side</label>
          <select
            value={siteSide}
            onChange={(e) => setSiteSide(e.target.value as 'Left' | 'Right' | '')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            <option value="Left">Left</option>
            <option value="Right">Right</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gauge</label>
          <input
            type="text"
            value={gauge}
            onChange={(e) => setGauge(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 20G"
          />
        </div>
      </div>

      {/* Local Site Assessment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Local Site Assessment</label>
        <div className="grid grid-cols-3 gap-2">
          {['Redness', 'Swelling', 'Pain', 'Warmth', 'Coolness', 'Induration'].map((finding) => (
            <label key={finding} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={localSiteAssessment.includes(finding)}
                onChange={() => toggleArrayItem(localSiteAssessment, setLocalSiteAssessment, finding)}
                className="rounded text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{finding}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Infiltration/Phlebitis */}
      <div className="grid grid-cols-2 gap-4">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={infiltrationSuspected}
            onChange={(e) => setInfiltrationSuspected(e.target.checked)}
            className="rounded text-red-500 focus:ring-red-500"
          />
          <span className="text-sm font-medium text-gray-700">Infiltration Suspected</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={phlebitisSuspected}
            onChange={(e) => setPhlebitisSuspected(e.target.checked)}
            className="rounded text-red-500 focus:ring-red-500"
          />
          <span className="text-sm font-medium text-gray-700">Phlebitis Suspected</span>
        </label>
      </div>

      {/* Drainage Colour */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Drainage Colour (if applicable)</label>
        <div className="grid grid-cols-4 gap-2">
          {['Clear', 'Serous', 'Sanguineous', 'Purulent'].map((colour) => (
            <label key={colour} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={drainageColour.includes(colour)}
                onChange={() => toggleArrayItem(drainageColour, setDrainageColour, colour)}
                className="rounded text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{colour}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Site Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Site Assessment Notes</label>
        <textarea
          value={siteNotes}
          onChange={(e) => setSiteNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          placeholder="Additional site observations..."
        />
      </div>

      {/* Line Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Line Status</label>
        <div className="space-y-2">
          {[
            { value: 'patent_infusing', label: 'Patent & Infusing' },
            { value: 'patent_saline_lock', label: 'Patent - Saline Lock' },
            { value: 'sluggish', label: 'Sluggish' },
            { value: 'occluded', label: 'Occluded' },
            { value: 'discontinued', label: 'Discontinued' }
          ].map(({ value, label }) => (
            <label key={value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="lineStatus"
                checked={lineStatus === value}
                onChange={() => setLineStatus(value as typeof lineStatus)}
                className="text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Line Interventions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Line Interventions Today</label>
        <div className="grid grid-cols-2 gap-2">
          {['Flushed', 'Blood Draw', 'Medication Administration', 'Troubleshooting'].map((intervention) => (
            <label key={intervention} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={lineInterventions.includes(intervention)}
                onChange={() => toggleArrayItem(lineInterventions, setLineInterventions, intervention)}
                className="rounded text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{intervention}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Dressing Assessment */}
      <div className="border-t border-blue-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Dressing Assessment</h4>
        
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dressing Type</label>
            <select
              value={dressingType}
              onChange={(e) => setDressingType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              <option value="Transparent">Transparent Film</option>
              <option value="Gauze">Gauze</option>
              <option value="Biopatch">Biopatch</option>
              <option value="None">None</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dressing Tolerance</label>
            <input
              type="text"
              value={dressingTolerance}
              onChange={(e) => setDressingTolerance(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Well tolerated"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Dressing Status</label>
          <div className="grid grid-cols-3 gap-2">
            {['Intact', 'Clean', 'Dry', 'Soiled', 'Loose', 'Changed'].map((status) => (
              <label key={status} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dressingStatus.includes(status)}
                  onChange={() => toggleArrayItem(dressingStatus, setDressingStatus, status)}
                  className="rounded text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{status}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
