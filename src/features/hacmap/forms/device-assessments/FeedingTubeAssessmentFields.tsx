/**
 * Feeding Tube Assessment Fields
 */

import React, { useState, useEffect } from 'react';
import type { Device, FeedingTubeAssessmentData } from '../../../../types/hacmap';

interface FeedingTubeAssessmentFieldsProps {
  device: Device;
  onChange: (data: FeedingTubeAssessmentData) => void;
}

export const FeedingTubeAssessmentFields: React.FC<FeedingTubeAssessmentFieldsProps> = ({ device: _device, onChange }) => {
  const [placementReverified, setPlacementReverified] = useState(false);
  const [reverificationMethod, setReverificationMethod] = useState<string[]>([]);
  const [siteFindings, setSiteFindings] = useState<string[]>([]);
  const [dressingCondition, setDressingCondition] = useState<string[]>([]);
  const [dressingChanged, setDressingChanged] = useState(false);
  const [siteNotes, setSiteNotes] = useState('');
  const [tubeFlushed, setTubeFlushed] = useState(false);
  const [flushResistance, setFlushResistance] = useState<'none' | 'mild' | 'significant' | ''>('');
  const [blockageNoted, setBlockageNoted] = useState(false);
  const [actionsTaken, setActionsTaken] = useState('');
  const [residualVolumeMl, setResidualVolumeMl] = useState<number | undefined>();
  const [residualAppearance, setResidualAppearance] = useState('');
  const [residualReturned, setResidualReturned] = useState(false);
  const [formulaName, setFormulaName] = useState('');
  const [feedingMethod, setFeedingMethod] = useState<'bolus' | 'gravity' | 'continuous' | ''>('');
  const [rateMLPerHr, setRateMLPerHr] = useState<number | undefined>();
  const [volumeGivenMl, setVolumeGivenMl] = useState<number | undefined>();
  const [waterFlushesMl, setWaterFlushesMl] = useState<number | undefined>();
  const [flushTiming, setFlushTiming] = useState<string[]>([]);
  const [nauseaVomiting, setNauseaVomiting] = useState(false);
  const [nauseaNotes, setNauseaNotes] = useState('');
  const [cramping, setCramping] = useState(false);
  const [abdominalDistension, setAbdominalDistension] = useState(false);
  const [bowelSounds, setBowelSounds] = useState<'normal' | 'hypoactive' | 'hyperactive' | 'absent' | ''>('');
  const [hobElevated, setHobElevated] = useState(false);

  useEffect(() => {
    const data: FeedingTubeAssessmentData = {
      placement_reverified: placementReverified,
      reverification_method: reverificationMethod,
      site_findings: siteFindings,
      dressing_condition: dressingCondition,
      dressing_changed: dressingChanged,
      site_notes: siteNotes || undefined,
      tube_flushed: tubeFlushed,
      flush_resistance: flushResistance || undefined,
      blockage_noted: blockageNoted,
      actions_taken: actionsTaken || undefined,
      residual_volume_ml: residualVolumeMl,
      residual_appearance: residualAppearance || undefined,
      residual_returned: residualReturned,
      formula_name: formulaName || undefined,
      feeding_method: feedingMethod || undefined,
      rate_ml_per_hr: rateMLPerHr,
      volume_given_ml: volumeGivenMl,
      water_flushes_ml: waterFlushesMl,
      flush_timing: flushTiming,
      nausea_vomiting: nauseaVomiting,
      nausea_notes: nauseaNotes || undefined,
      cramping,
      abdominal_distension: abdominalDistension,
      bowel_sounds: bowelSounds || undefined,
      hob_elevated: hobElevated
    };
    onChange(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placementReverified, reverificationMethod, siteFindings, dressingCondition, dressingChanged, siteNotes, tubeFlushed, flushResistance, blockageNoted, actionsTaken, residualVolumeMl, residualAppearance, residualReturned, formulaName, feedingMethod, rateMLPerHr, volumeGivenMl, waterFlushesMl, flushTiming, nauseaVomiting, nauseaNotes, cramping, abdominalDistension, bowelSounds, hobElevated]);

  const toggleArrayItem = (array: string[], setArray: (arr: string[]) => void, value: string) => {
    if (array.includes(value)) {
      setArray(array.filter(v => v !== value));
    } else {
      setArray([...array, value]);
    }
  };

  return (
    <div className="space-y-6 p-4 bg-purple-50 border border-purple-200 rounded-md">
      <h3 className="text-sm font-semibold text-purple-900">Feeding Tube Assessment</h3>

      {/* Placement Verification */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700">Placement Verification</h4>
        
        <div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={placementReverified}
              onChange={(e) => setPlacementReverified(e.target.checked)}
              className="rounded text-purple-500 focus:ring-purple-500"
            />
            <span className="text-sm font-semibold text-gray-700">Placement Re-verified Before Use</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Re-verification Method</label>
          <div className="grid grid-cols-2 gap-2">
            {['pH Testing', 'Aspirate Appearance', 'X-ray Confirmation', 'External Length Measurement'].map((method) => (
              <label key={method} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reverificationMethod.includes(method)}
                  onChange={() => toggleArrayItem(reverificationMethod, setReverificationMethod, method)}
                  className="rounded text-purple-500 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">{method}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Site Assessment */}
      <div className="border-t border-purple-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Insertion Site Assessment</h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Site Findings</label>
          <div className="grid grid-cols-3 gap-2">
            {['Clean', 'Dry', 'Redness', 'Drainage', 'Granulation Tissue', 'Excoriation'].map((finding) => (
              <label key={finding} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={siteFindings.includes(finding)}
                  onChange={() => toggleArrayItem(siteFindings, setSiteFindings, finding)}
                  className="rounded text-purple-500 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">{finding}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">Dressing Condition</label>
          <div className="grid grid-cols-3 gap-2">
            {['Intact', 'Clean', 'Dry', 'Soiled', 'Loose'].map((condition) => (
              <label key={condition} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dressingCondition.includes(condition)}
                  onChange={() => toggleArrayItem(dressingCondition, setDressingCondition, condition)}
                  className="rounded text-purple-500 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">{condition}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dressingChanged}
              onChange={(e) => setDressingChanged(e.target.checked)}
              className="rounded text-purple-500 focus:ring-purple-500"
            />
            <span className="text-sm font-medium text-gray-700">Dressing Changed Today</span>
          </label>
        </div>

        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Site Assessment Notes</label>
          <textarea
            value={siteNotes}
            onChange={(e) => setSiteNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
            placeholder="Additional site observations..."
          />
        </div>
      </div>

      {/* Tube Patency */}
      <div className="border-t border-purple-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Tube Patency</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={tubeFlushed}
                onChange={(e) => setTubeFlushed(e.target.checked)}
                className="rounded text-purple-500 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700">Tube Flushed</span>
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Flush Resistance</label>
            <select
              value={flushResistance}
              onChange={(e) => setFlushResistance(e.target.value as typeof flushResistance)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select...</option>
              <option value="none">None</option>
              <option value="mild">Mild</option>
              <option value="significant">Significant</option>
            </select>
          </div>
        </div>

        <div className="mt-3">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={blockageNoted}
              onChange={(e) => setBlockageNoted(e.target.checked)}
              className="rounded text-red-500 focus:ring-red-500"
            />
            <span className="text-sm font-medium text-gray-700">Blockage Noted</span>
          </label>
          {blockageNoted && (
            <textarea
              value={actionsTaken}
              onChange={(e) => setActionsTaken(e.target.value)}
              rows={2}
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
              placeholder="Describe actions taken..."
            />
          )}
        </div>
      </div>

      {/* Gastric Residual */}
      <div className="border-t border-purple-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Gastric Residual</h4>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Volume (mL)</label>
            <input
              type="number"
              value={residualVolumeMl || ''}
              onChange={(e) => setResidualVolumeMl(e.target.value ? parseFloat(e.target.value) : undefined)}
              step="1"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Appearance</label>
            <input
              type="text"
              value={residualAppearance}
              onChange={(e) => setResidualAppearance(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., Clear, Bile-tinged"
            />
          </div>
          
          <div className="flex items-end">
            <label className="flex items-center space-x-2 cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={residualReturned}
                onChange={(e) => setResidualReturned(e.target.checked)}
                className="rounded text-purple-500 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700">Residual Returned</span>
            </label>
          </div>
        </div>
      </div>

      {/* Feeding Administration */}
      <div className="border-t border-purple-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Feeding Administration</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Formula Name</label>
            <input
              type="text"
              value={formulaName}
              onChange={(e) => setFormulaName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., Jevity 1.5"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Feeding Method</label>
            <select
              value={feedingMethod}
              onChange={(e) => setFeedingMethod(e.target.value as typeof feedingMethod)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select...</option>
              <option value="bolus">Bolus</option>
              <option value="gravity">Gravity</option>
              <option value="continuous">Continuous Pump</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rate (mL/hr)</label>
            <input
              type="number"
              value={rateMLPerHr || ''}
              onChange={(e) => setRateMLPerHr(e.target.value ? parseFloat(e.target.value) : undefined)}
              step="1"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Volume Given (mL)</label>
            <input
              type="number"
              value={volumeGivenMl || ''}
              onChange={(e) => setVolumeGivenMl(e.target.value ? parseFloat(e.target.value) : undefined)}
              step="1"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Water Flushes (mL)</label>
            <input
              type="number"
              value={waterFlushesMl || ''}
              onChange={(e) => setWaterFlushesMl(e.target.value ? parseFloat(e.target.value) : undefined)}
              step="1"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">Flush Timing</label>
          <div className="grid grid-cols-3 gap-2">
            {['Pre-feeding', 'Post-feeding', 'Between Medications', 'Q4H'].map((timing) => (
              <label key={timing} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={flushTiming.includes(timing)}
                  onChange={() => toggleArrayItem(flushTiming, setFlushTiming, timing)}
                  className="rounded text-purple-500 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">{timing}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Tolerance Assessment */}
      <div className="border-t border-purple-200 pt-4 bg-purple-100 -m-4 p-4 rounded-b-md">
        <h4 className="text-sm font-semibold text-purple-900 mb-3">Patient Tolerance</h4>
        
        <div className="space-y-3">
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={nauseaVomiting}
                onChange={(e) => setNauseaVomiting(e.target.checked)}
                className="rounded text-purple-600 focus:ring-purple-600"
              />
              <span className="text-sm font-medium text-gray-700">Nausea/Vomiting</span>
            </label>
            {nauseaVomiting && (
              <textarea
                value={nauseaNotes}
                onChange={(e) => setNauseaNotes(e.target.value)}
                rows={2}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                placeholder="Describe symptoms and interventions..."
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cramping}
                onChange={(e) => setCramping(e.target.checked)}
                className="rounded text-purple-600 focus:ring-purple-600"
              />
              <span className="text-sm font-medium text-gray-700">Cramping</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={abdominalDistension}
                onChange={(e) => setAbdominalDistension(e.target.checked)}
                className="rounded text-purple-600 focus:ring-purple-600"
              />
              <span className="text-sm font-medium text-gray-700">Abdominal Distension</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bowel Sounds</label>
              <select
                value={bowelSounds}
                onChange={(e) => setBowelSounds(e.target.value as typeof bowelSounds)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select...</option>
                <option value="normal">Normal</option>
                <option value="hypoactive">Hypoactive</option>
                <option value="hyperactive">Hyperactive</option>
                <option value="absent">Absent</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <label className="flex items-center space-x-2 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={hobElevated}
                  onChange={(e) => setHobElevated(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-600"
                />
                <span className="text-sm font-medium text-gray-700">HOB Elevated ≥30°</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
