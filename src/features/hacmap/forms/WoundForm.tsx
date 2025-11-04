/**
 * Wound Form - Comprehensive wound assessment form (final spec)
 * Metric measurements (cm), clinical descriptions, 24-hour time
 */

import React, { useState, useEffect } from 'react';
import { Save, Trash2 } from 'lucide-react';
import type { Wound, CreateWoundInput, UpdateWoundInput } from '../../../types/hacmap';
import { WOUND_TYPE_LABELS, type WoundType } from '../../../types/hacmap';

interface WoundFormProps {
  wound?: Wound;
  locationId: string;
  onSave: (data: CreateWoundInput | UpdateWoundInput) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
}

export const WoundForm: React.FC<WoundFormProps> = ({
  wound,
  locationId,
  onSave,
  onDelete,
  onCancel
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Form state
  const [woundType, setWoundType] = useState<WoundType>(wound?.wound_type || 'incision');
  const [periWoundTemperature, setPeriWoundTemperature] = useState(wound?.peri_wound_temperature || '');
  const [woundLengthCm, setWoundLengthCm] = useState<number | undefined>(wound?.wound_length_cm);
  const [woundWidthCm, setWoundWidthCm] = useState<number | undefined>(wound?.wound_width_cm);
  const [woundDepthCm, setWoundDepthCm] = useState<number | undefined>(wound?.wound_depth_cm);
  const [woundDescription, setWoundDescription] = useState(wound?.wound_description || '');
  const [drainageDescription, setDrainageDescription] = useState<string[]>(wound?.drainage_description || []);
  const [drainageConsistency, setDrainageConsistency] = useState<string[]>(wound?.drainage_consistency || []);
  const [woundOdor, setWoundOdor] = useState<string[]>(wound?.wound_odor || []);
  const [drainageAmount, setDrainageAmount] = useState(wound?.drainage_amount || '');
  const [woundEdges, setWoundEdges] = useState(wound?.wound_edges || '');
  const [closure, setClosure] = useState(wound?.closure || '');
  const [sutureSutapleLine, setSutureSutapleLine] = useState(wound?.suture_staple_line || '');
  const [suturesIntact, setSuturesIntact] = useState(wound?.sutures_intact || '');
  const [enteredBy, setEnteredBy] = useState(wound?.entered_by || '');
  const [notes, setNotes] = useState(wound?.notes || '');

  useEffect(() => {
    setIsDirty(true);
  }, [woundType, periWoundTemperature, woundLengthCm, woundWidthCm, woundDepthCm, woundDescription, drainageDescription, drainageConsistency, woundOdor, drainageAmount, woundEdges, closure, sutureSutapleLine, suturesIntact, enteredBy, notes]);

  const handleArrayToggle = (
    value: string,
    state: string[],
    setState: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setState(prev =>
      prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data: any = {
        wound_type: woundType,
        peri_wound_temperature: periWoundTemperature || undefined,
        wound_length_cm: woundLengthCm,
        wound_width_cm: woundWidthCm,
        wound_depth_cm: woundDepthCm,
        wound_description: woundDescription || undefined,
        drainage_description: drainageDescription.length > 0 ? drainageDescription : undefined,
        drainage_consistency: drainageConsistency.length > 0 ? drainageConsistency : undefined,
        wound_odor: woundOdor.length > 0 ? woundOdor : undefined,
        drainage_amount: drainageAmount || undefined,
        wound_edges: woundEdges || undefined,
        closure: closure || undefined,
        suture_staple_line: sutureSutapleLine || undefined,
        sutures_intact: suturesIntact || undefined,
        entered_by: enteredBy || undefined,
        notes: notes || undefined
      };

      if (!wound) {
        data.location_id = locationId;
      }

      await onSave(data);
      setIsDirty(false);
    } catch (error) {
      console.error('Error saving wound:', error);
      alert('Failed to save wound. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!window.confirm('Are you sure you want to delete this wound?')) return;

    setIsSubmitting(true);
    try {
      await onDelete();
    } catch (error) {
      console.error('Error deleting wound:', error);
      alert('Failed to delete wound. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800">
        <p className="font-medium">Note: All measurements use metric units</p>
        <p>Dimensions in cm, temperature in °C, times in 24-hour format</p>
      </div>

      {/* Wound Type */}
      <div>
        <label htmlFor="woundType" className="block text-sm font-medium text-gray-700 mb-1">
          Wound Type <span className="text-red-500">*</span>
        </label>
        <select
          id="woundType"
          value={woundType}
          onChange={(e) => setWoundType(e.target.value as WoundType)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
          required
        >
          {Object.entries(WOUND_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Peri-Wound Temperature */}
      <div>
        <label htmlFor="periWoundTemperature" className="block text-sm font-medium text-gray-700 mb-1">
          Peri-Wound Temperature (°C)
        </label>
        <input
          type="text"
          id="periWoundTemperature"
          value={periWoundTemperature}
          onChange={(e) => setPeriWoundTemperature(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
          placeholder="e.g., 37.2°C"
        />
      </div>

      {/* Wound Dimensions (cm) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Wound Dimensions (cm)
        </label>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="woundLengthCm" className="block text-xs text-gray-600 mb-1">
              Length
            </label>
            <input
              type="number"
              id="woundLengthCm"
              value={woundLengthCm || ''}
              onChange={(e) => setWoundLengthCm(e.target.value ? parseFloat(e.target.value) : undefined)}
              min="0"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              placeholder="cm"
            />
          </div>
          <div>
            <label htmlFor="woundWidthCm" className="block text-xs text-gray-600 mb-1">
              Width
            </label>
            <input
              type="number"
              id="woundWidthCm"
              value={woundWidthCm || ''}
              onChange={(e) => setWoundWidthCm(e.target.value ? parseFloat(e.target.value) : undefined)}
              min="0"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              placeholder="cm"
            />
          </div>
          <div>
            <label htmlFor="woundDepthCm" className="block text-xs text-gray-600 mb-1">
              Depth
            </label>
            <input
              type="number"
              id="woundDepthCm"
              value={woundDepthCm || ''}
              onChange={(e) => setWoundDepthCm(e.target.value ? parseFloat(e.target.value) : undefined)}
              min="0"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              placeholder="cm"
            />
          </div>
        </div>
      </div>

      {/* Wound Description */}
      <div>
        <label htmlFor="woundDescription" className="block text-sm font-medium text-gray-700 mb-1">
          Wound Description
        </label>
        <textarea
          id="woundDescription"
          value={woundDescription}
          onChange={(e) => setWoundDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
          placeholder="Detailed description of wound appearance..."
        />
      </div>

      {/* Drainage Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Drainage Description
        </label>
        <div className="grid grid-cols-2 gap-2">
          {['Serous', 'Sanguineous', 'Serosanguineous', 'Purulent', 'None'].map((option) => (
            <label key={option} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={drainageDescription.includes(option)}
                onChange={() => handleArrayToggle(option, drainageDescription, setDrainageDescription)}
                className="rounded text-pink-500 focus:ring-pink-500"
              />
              <span className="text-sm text-gray-700">{option}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Drainage Consistency */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Drainage Consistency
        </label>
        <div className="grid grid-cols-2 gap-2">
          {['Thin', 'Thick', 'Watery', 'Viscous'].map((option) => (
            <label key={option} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={drainageConsistency.includes(option)}
                onChange={() => handleArrayToggle(option, drainageConsistency, setDrainageConsistency)}
                className="rounded text-pink-500 focus:ring-pink-500"
              />
              <span className="text-sm text-gray-700">{option}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Wound Odor */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Wound Odor
        </label>
        <div className="grid grid-cols-2 gap-2">
          {['None', 'Foul', 'Sweet', 'Musty'].map((option) => (
            <label key={option} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={woundOdor.includes(option)}
                onChange={() => handleArrayToggle(option, woundOdor, setWoundOdor)}
                className="rounded text-pink-500 focus:ring-pink-500"
              />
              <span className="text-sm text-gray-700">{option}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Drainage Amount */}
      <div>
        <label htmlFor="drainageAmount" className="block text-sm font-medium text-gray-700 mb-1">
          Drainage Amount
        </label>
        <select
          id="drainageAmount"
          value={drainageAmount}
          onChange={(e) => setDrainageAmount(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
        >
          <option value="">Select...</option>
          <option value="None">None</option>
          <option value="Scant">Scant</option>
          <option value="Minimal">Minimal</option>
          <option value="Moderate">Moderate</option>
          <option value="Large">Large</option>
          <option value="Copious">Copious</option>
          <option value="UTA">Unable to Assess</option>
        </select>
      </div>

      {/* Wound Edges */}
      <div>
        <label htmlFor="woundEdges" className="block text-sm font-medium text-gray-700 mb-1">
          Wound Edges
        </label>
        <input
          type="text"
          id="woundEdges"
          value={woundEdges}
          onChange={(e) => setWoundEdges(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
          placeholder="e.g., well-approximated, irregular, macerated"
        />
      </div>

      {/* Closure */}
      <div>
        <label htmlFor="closure" className="block text-sm font-medium text-gray-700 mb-1">
          Closure
        </label>
        <input
          type="text"
          id="closure"
          value={closure}
          onChange={(e) => setClosure(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
          placeholder="e.g., primary, secondary, tertiary"
        />
      </div>

      {/* Suture/Staple Line */}
      <div>
        <label htmlFor="sutureSutapleLine" className="block text-sm font-medium text-gray-700 mb-1">
          Suture/Staple Line
        </label>
        <select
          id="sutureSutapleLine"
          value={sutureSutapleLine}
          onChange={(e) => setSutureSutapleLine(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
        >
          <option value="">Select...</option>
          <option value="approximated">Approximated</option>
          <option value="non-approximated">Non-Approximated</option>
        </select>
      </div>

      {/* Sutures Intact */}
      <div>
        <label htmlFor="suturesIntact" className="block text-sm font-medium text-gray-700 mb-1">
          Sutures Intact
        </label>
        <select
          id="suturesIntact"
          value={suturesIntact}
          onChange={(e) => setSuturesIntact(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
        >
          <option value="">Select...</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      {/* Entered By */}
      <div>
        <label htmlFor="enteredBy" className="block text-sm font-medium text-gray-700 mb-1">
          Entered By (Nurse/Clinician Name)
        </label>
        <input
          type="text"
          id="enteredBy"
          value={enteredBy}
          onChange={(e) => setEnteredBy(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
          placeholder="e.g., Sarah Johnson, RN"
        />
      </div>

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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
          placeholder="Any additional notes..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div>
          {wound && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          )}
        </div>
        <div className="flex space-x-3">
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
            disabled={isSubmitting}
            className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{wound ? 'Update' : 'Save'} Wound</span>
          </button>
        </div>
      </div>
    </form>
  );
};
