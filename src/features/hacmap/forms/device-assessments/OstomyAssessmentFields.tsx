/**
 * Ostomy Assessment Fields
 */

import React, { useState, useEffect } from 'react';
import type { Device, OstomyAssessmentData } from '../../../../types/hacmap';

interface OstomyAssessmentFieldsProps {
  device: Device;
  onChange: (data: OstomyAssessmentData) => void;
}

export const OstomyAssessmentFields: React.FC<OstomyAssessmentFieldsProps> = ({ device: _device, onChange }) => {
  const [ostomyType, setOstomyType] = useState<OstomyAssessmentData['ostomy_type']>(undefined);
  const [stomaColor, setStomaColor] = useState<OstomyAssessmentData['stoma_color']>(undefined);
  const [stomaMoist, setStomaMoist] = useState(true);
  const [stomaShape, setStomaShape] = useState<OstomyAssessmentData['stoma_shape']>(undefined);
  const [stomaHeight, setStomaHeight] = useState<OstomyAssessmentData['stoma_height']>(undefined);
  const [stomaSizeMm, setStomaSizeMm] = useState<number | undefined>();
  const [peristomalSkin, setPeristomalSkin] = useState<string[]>([]);
  const [peristomalNotes, setPeristomalNotes] = useState('');
  const [outputAmountMl, setOutputAmountMl] = useState<number | undefined>();
  const [outputConsistency, setOutputConsistency] = useState<OstomyAssessmentData['output_consistency']>(undefined);
  const [outputColor, setOutputColor] = useState('');
  const [outputOdor, setOutputOdor] = useState<OstomyAssessmentData['output_odor']>(undefined);
  const [applianceChanged, setApplianceChanged] = useState(false);
  const [applianceLastChanged, setApplianceLastChanged] = useState('');
  const [applianceNotes, setApplianceNotes] = useState('');
  const [patientEducation, setPatientEducation] = useState(false);
  const [patientTolerance, setPatientTolerance] = useState('');

  useEffect(() => {
    const data: OstomyAssessmentData = {
      ostomy_type: ostomyType,
      stoma_color: stomaColor,
      stoma_moist: stomaMoist,
      stoma_shape: stomaShape,
      stoma_height: stomaHeight,
      stoma_size_mm: stomaSizeMm,
      peristomal_skin: peristomalSkin,
      peristomal_notes: peristomalNotes || undefined,
      output_amount_ml: outputAmountMl,
      output_consistency: outputConsistency,
      output_color: outputColor || undefined,
      output_odor: outputOdor,
      appliance_changed: applianceChanged,
      appliance_last_changed: applianceLastChanged || undefined,
      appliance_notes: applianceNotes || undefined,
      patient_education_provided: patientEducation,
      patient_tolerance: patientTolerance || undefined,
    };
    onChange(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ostomyType, stomaColor, stomaMoist, stomaShape, stomaHeight, stomaSizeMm, peristomalSkin, peristomalNotes, outputAmountMl, outputConsistency, outputColor, outputOdor, applianceChanged, applianceLastChanged, applianceNotes, patientEducation, patientTolerance]);

  const toggleArrayItem = (array: string[], setArray: (arr: string[]) => void, value: string) => {
    if (array.includes(value)) {
      setArray(array.filter(v => v !== value));
    } else {
      setArray([...array, value]);
    }
  };

  return (
    <div className="space-y-6 p-4 bg-teal-50 border border-teal-200 rounded-md">
      <h3 className="text-sm font-semibold text-teal-900">Ostomy Assessment</h3>

      {/* Ostomy Type & Construction */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ostomy Type</label>
        <div className="flex gap-3 flex-wrap">
          {(['Colostomy', 'Ileostomy', 'Urostomy', 'Other'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setOstomyType(type)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                ostomyType === type
                  ? 'bg-teal-600 border-teal-600 text-white'
                  : 'border-gray-300 text-gray-600 hover:border-teal-400'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Stoma Appearance */}
      <div className="border-t border-teal-200 pt-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-700">Stoma Appearance</h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <div className="flex flex-wrap gap-2">
              {(['Beefy Red', 'Pink', 'Pale', 'Dusky', 'Dark/Necrotic'] as const).map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setStomaColor(color)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    stomaColor === color
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : 'border-gray-300 text-gray-600 hover:border-teal-400'
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
            {(stomaColor === 'Dusky' || stomaColor === 'Dark/Necrotic') && (
              <p className="mt-1 text-xs text-red-600 font-medium">⚠ Notify provider immediately</p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={stomaMoist}
                onChange={(e) => setStomaMoist(e.target.checked)}
                className="rounded text-teal-500 focus:ring-teal-500"
              />
              <span className="text-sm font-medium text-gray-700">Stoma Moist (Normal)</span>
            </label>
            {!stomaMoist && (
              <p className="text-xs text-amber-700 font-medium">⚠ Dry stoma — assess for dehydration</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shape</label>
            <select
              value={stomaShape || ''}
              onChange={(e) => setStomaShape(e.target.value as OstomyAssessmentData['stoma_shape'] || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select...</option>
              <option value="Round">Round</option>
              <option value="Oval">Oval</option>
              <option value="Irregular">Irregular</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
            <select
              value={stomaHeight || ''}
              onChange={(e) => setStomaHeight(e.target.value as OstomyAssessmentData['stoma_height'] || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select...</option>
              <option value="Protruding/Budded">Protruding / Budded</option>
              <option value="Flush">Flush</option>
              <option value="Retracted">Retracted</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Size (mm)</label>
            <input
              type="number"
              value={stomaSizeMm || ''}
              onChange={(e) => setStomaSizeMm(e.target.value ? parseFloat(e.target.value) : undefined)}
              min="0"
              step="1"
              placeholder="diameter"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Peristomal Skin */}
      <div className="border-t border-teal-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Peristomal Skin Assessment</h4>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {['Intact', 'Reddened', 'Irritated', 'Rash', 'Excoriated', 'Macerated'].map((finding) => (
            <label key={finding} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={peristomalSkin.includes(finding)}
                onChange={() => toggleArrayItem(peristomalSkin, setPeristomalSkin, finding)}
                className="rounded text-teal-500 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-700">{finding}</span>
            </label>
          ))}
        </div>
        <textarea
          value={peristomalNotes}
          onChange={(e) => setPeristomalNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500"
          placeholder="Additional peristomal skin notes..."
        />
      </div>

      {/* Output */}
      <div className="border-t border-teal-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Output</h4>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (mL)</label>
            <input
              type="number"
              value={outputAmountMl || ''}
              onChange={(e) => setOutputAmountMl(e.target.value ? parseFloat(e.target.value) : undefined)}
              min="0"
              step="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Consistency</label>
            <select
              value={outputConsistency || ''}
              onChange={(e) => setOutputConsistency(e.target.value as OstomyAssessmentData['output_consistency'] || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select...</option>
              <option value="Liquid">Liquid</option>
              <option value="Soft">Soft</option>
              <option value="Formed">Formed</option>
              <option value="Hard">Hard</option>
              <option value="None">None</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <input
              type="text"
              value={outputColor}
              onChange={(e) => setOutputColor(e.target.value)}
              placeholder="e.g., Brown, Green, Yellow"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Odor</label>
            <select
              value={outputOdor || ''}
              onChange={(e) => setOutputOdor(e.target.value as OstomyAssessmentData['output_odor'] || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select...</option>
              <option value="Normal">Normal</option>
              <option value="Foul">Foul</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appliance */}
      <div className="border-t border-teal-200 pt-4 space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Pouching System</h4>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={applianceChanged}
            onChange={(e) => setApplianceChanged(e.target.checked)}
            className="rounded text-teal-500 focus:ring-teal-500"
          />
          <span className="text-sm font-medium text-gray-700">Appliance Changed This Assessment</span>
        </label>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Changed (date/time)</label>
          <input
            type="text"
            value={applianceLastChanged}
            onChange={(e) => setApplianceLastChanged(e.target.value)}
            placeholder="e.g., 2026-03-24 08:00"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <textarea
          value={applianceNotes}
          onChange={(e) => setApplianceNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500"
          placeholder="Appliance condition, seal integrity, barrier type..."
        />
      </div>

      {/* Patient */}
      <div className="border-t border-teal-200 pt-4 space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Patient</h4>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={patientEducation}
            onChange={(e) => setPatientEducation(e.target.checked)}
            className="rounded text-teal-500 focus:ring-teal-500"
          />
          <span className="text-sm font-medium text-gray-700">Patient Education Provided</span>
        </label>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Patient Tolerance</label>
          <input
            type="text"
            value={patientTolerance}
            onChange={(e) => setPatientTolerance(e.target.value)}
            placeholder="e.g., Tolerated well, Expressed concerns about odor..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>
    </div>
  );
};
