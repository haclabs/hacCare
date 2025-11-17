/**
 * Foley Catheter Assessment Fields
 */

import React, { useState, useEffect } from 'react';
import type { Device, FoleyAssessmentData } from '../../../../types/hacmap';

interface FoleyAssessmentFieldsProps {
  device: Device;
  onChange: (data: FoleyAssessmentData) => void;
}

export const FoleyAssessmentFields: React.FC<FoleyAssessmentFieldsProps> = ({ device: _device, onChange }) => {
  const [patencyMaintained, setPatencyMaintained] = useState(true);
  const [patencyNotes, setPatencyNotes] = useState('');
  const [systemIntegrity, setSystemIntegrity] = useState(true);
  const [integrityNotes, setIntegrityNotes] = useState('');
  const [catheterSecure, setCatheterSecure] = useState(true);
  const [securementNotes, setSecurementNotes] = useState('');
  const [urineAmountMl, setUrineAmountMl] = useState<number | undefined>();
  const [urineAppearance, setUrineAppearance] = useState('');
  const [urineOdor, setUrineOdor] = useState<'normal' | 'foul' | ''>('');
  const [siteFindings, setSiteFindings] = useState<string[]>([]);
  const [siteNotes, setSiteNotes] = useState('');
  const [patientComfort, setPatientComfort] = useState('');
  const [hygieneProvided, setHygieneProvided] = useState(false);
  const [hygieneNotes, setHygieneNotes] = useState('');
  const [indicationValid, setIndicationValid] = useState(true);
  const [plan, setPlan] = useState<'continue' | 'consider_removal' | 'remove_today' | ''>('');

  useEffect(() => {
    const data: FoleyAssessmentData = {
      patency_maintained: patencyMaintained,
      patency_notes: patencyNotes || undefined,
      system_integrity: systemIntegrity,
      integrity_notes: integrityNotes || undefined,
      catheter_secure: catheterSecure,
      securement_notes: securementNotes || undefined,
      urine_amount_ml: urineAmountMl,
      urine_appearance: urineAppearance || undefined,
      urine_odor: urineOdor || undefined,
      site_findings: siteFindings,
      site_notes: siteNotes || undefined,
      patient_comfort: patientComfort || undefined,
      hygiene_provided: hygieneProvided,
      hygiene_notes: hygieneNotes || undefined,
      indication_valid: indicationValid,
      plan: plan || undefined
    };
    onChange(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patencyMaintained, patencyNotes, systemIntegrity, integrityNotes, catheterSecure, securementNotes, urineAmountMl, urineAppearance, urineOdor, siteFindings, siteNotes, patientComfort, hygieneProvided, hygieneNotes, indicationValid, plan]);

  const toggleArrayItem = (array: string[], setArray: (arr: string[]) => void, value: string) => {
    if (array.includes(value)) {
      setArray(array.filter(v => v !== value));
    } else {
      setArray([...array, value]);
    }
  };

  return (
    <div className="space-y-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
      <h3 className="text-sm font-semibold text-amber-900">Foley Catheter Assessment</h3>

      {/* Catheter Function */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700">Catheter Function</h4>
        
        <div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={patencyMaintained}
              onChange={(e) => setPatencyMaintained(e.target.checked)}
              className="rounded text-amber-500 focus:ring-amber-500"
            />
            <span className="text-sm font-medium text-gray-700">Patency Maintained</span>
          </label>
          {!patencyMaintained && (
            <textarea
              value={patencyNotes}
              onChange={(e) => setPatencyNotes(e.target.value)}
              rows={2}
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
              placeholder="Describe patency issues..."
            />
          )}
        </div>

        <div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={systemIntegrity}
              onChange={(e) => setSystemIntegrity(e.target.checked)}
              className="rounded text-amber-500 focus:ring-amber-500"
            />
            <span className="text-sm font-medium text-gray-700">System Integrity Maintained</span>
          </label>
          {!systemIntegrity && (
            <textarea
              value={integrityNotes}
              onChange={(e) => setIntegrityNotes(e.target.value)}
              rows={2}
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
              placeholder="Describe integrity concerns..."
            />
          )}
        </div>

        <div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={catheterSecure}
              onChange={(e) => setCatheterSecure(e.target.checked)}
              className="rounded text-amber-500 focus:ring-amber-500"
            />
            <span className="text-sm font-medium text-gray-700">Catheter Securely Anchored</span>
          </label>
          {!catheterSecure && (
            <textarea
              value={securementNotes}
              onChange={(e) => setSecurementNotes(e.target.value)}
              rows={2}
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
              placeholder="Describe securement issues..."
            />
          )}
        </div>
      </div>

      {/* Urine Output */}
      <div className="border-t border-amber-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Urine Output Characteristics</h4>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (mL)</label>
            <input
              type="number"
              value={urineAmountMl || ''}
              onChange={(e) => setUrineAmountMl(e.target.value ? parseFloat(e.target.value) : undefined)}
              step="0.1"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Appearance</label>
            <select
              value={urineAppearance}
              onChange={(e) => setUrineAppearance(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Select...</option>
              <option value="Clear Yellow">Clear Yellow</option>
              <option value="Amber">Amber</option>
              <option value="Dark">Dark</option>
              <option value="Cloudy">Cloudy</option>
              <option value="Blood-Tinged">Blood-Tinged</option>
              <option value="Frank Blood">Frank Blood</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Odor</label>
            <select
              value={urineOdor}
              onChange={(e) => setUrineOdor(e.target.value as typeof urineOdor)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Select...</option>
              <option value="normal">Normal</option>
              <option value="foul">Foul</option>
            </select>
          </div>
        </div>
      </div>

      {/* Site Assessment */}
      <div className="border-t border-amber-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Insertion Site Assessment</h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Site Findings</label>
          <div className="grid grid-cols-3 gap-2">
            {['No Issues', 'Redness', 'Swelling', 'Drainage', 'Discomfort', 'Excoriation'].map((finding) => (
              <label key={finding} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={siteFindings.includes(finding)}
                  onChange={() => toggleArrayItem(siteFindings, setSiteFindings, finding)}
                  className="rounded text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-gray-700">{finding}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Site Assessment Notes</label>
          <textarea
            value={siteNotes}
            onChange={(e) => setSiteNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
            placeholder="Additional site observations..."
          />
        </div>
      </div>

      {/* Patient Comfort & Hygiene */}
      <div className="border-t border-amber-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Patient Comfort & Care</h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Patient Comfort Level</label>
          <input
            type="text"
            value={patientComfort}
            onChange={(e) => setPatientComfort(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
            placeholder="e.g., No discomfort reported, Mild pulling sensation"
          />
        </div>

        <div className="mt-3">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hygieneProvided}
              onChange={(e) => setHygieneProvided(e.target.checked)}
              className="rounded text-amber-500 focus:ring-amber-500"
            />
            <span className="text-sm font-medium text-gray-700">Perineal Hygiene Provided</span>
          </label>
          {hygieneProvided && (
            <textarea
              value={hygieneNotes}
              onChange={(e) => setHygieneNotes(e.target.value)}
              rows={2}
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
              placeholder="Hygiene care details..."
            />
          )}
        </div>
      </div>

      {/* CAUTI Prevention */}
      <div className="border-t border-amber-200 pt-4 bg-amber-100 -m-4 p-4 rounded-b-md">
        <h4 className="text-sm font-semibold text-amber-900 mb-3">CAUTI Risk Assessment</h4>
        
        <div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={indicationValid}
              onChange={(e) => setIndicationValid(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-600"
            />
            <span className="text-sm font-medium text-gray-700">Indication for Catheter Still Valid</span>
          </label>
        </div>

        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">Plan</label>
          <div className="space-y-2">
            {[
              { value: 'continue', label: 'Continue catheter - indication valid' },
              { value: 'consider_removal', label: 'Consider removal - discuss with provider' },
              { value: 'remove_today', label: 'Remove today - no longer indicated' }
            ].map(({ value, label }) => (
              <label key={value} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="plan"
                  checked={plan === value}
                  onChange={() => setPlan(value as typeof plan)}
                  className="text-amber-600 focus:ring-amber-600"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
