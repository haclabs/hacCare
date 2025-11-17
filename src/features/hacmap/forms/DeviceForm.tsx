/**
 * Device Form - Comprehensive form for device placement
 * Default: Closed Suction Drain with metric units and 24-hour time
 */

import React, { useState, useEffect } from 'react';
import { Save, Trash2 } from 'lucide-react';
import type { Device, CreateDeviceInput, UpdateDeviceInput } from '../../../types/hacmap';
import {
  DEVICE_TYPE_LABELS,
  RESERVOIR_TYPE_LABELS,
  ORIENTATION_LABELS,
  type DeviceType,
  type ReservoirType,
  type Orientation
} from '../../../types/hacmap';

interface DeviceFormProps {
  device?: Device;
  locationId: string;
  onSave: (data: CreateDeviceInput | UpdateDeviceInput) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
}

export const DeviceForm: React.FC<DeviceFormProps> = ({
  device,
  locationId,
  onSave,
  onDelete,
  onCancel
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [_isDirty, setIsDirty] = useState(false);
  
  // Form state
  const [type, setType] = useState<DeviceType>(device?.type || 'closed-suction-drain');
  const [placementDate, setPlacementDate] = useState(device?.placement_date || '');
  const [placementTime, setPlacementTime] = useState(device?.placement_time || '');
  const [placedPreArrival, setPlacedPreArrival] = useState(device?.placed_pre_arrival || '');
  const [insertedBy, setInsertedBy] = useState(device?.inserted_by || '');
  const [tubeNumber, setTubeNumber] = useState<number | undefined>(device?.tube_number);
  const [orientation, setOrientation] = useState<Orientation[]>(device?.orientation || []);
  const [tubeSizeFr, setTubeSizeFr] = useState(device?.tube_size_fr || '');
  const [numberOfSutures, setNumberOfSutures] = useState<number | undefined>(device?.number_of_sutures_placed);
  const [reservoirType, setReservoirType] = useState<ReservoirType | undefined>(device?.reservoir_type);
  const [reservoirSizeMl, setReservoirSizeMl] = useState<number | undefined>(device?.reservoir_size_ml);
  const [securementMethod, setSecurementMethod] = useState<string[]>(device?.securement_method || []);
  const [patientTolerance, setPatientTolerance] = useState(device?.patient_tolerance || '');
  const [notes, setNotes] = useState(device?.notes || '');
  const [studentName, setStudentName] = useState('');
  
  // IV-specific fields
  const [gauge, setGauge] = useState(device?.gauge || '');
  const [siteSide, setSiteSide] = useState(device?.site_side || '');
  const [siteLocation, setSiteLocation] = useState(device?.site_location || '');
  
  // Feeding Tube-specific fields
  const [route, setRoute] = useState(device?.route || '');
  const [externalLengthCm, setExternalLengthCm] = useState<number | undefined>(device?.external_length_cm);
  const [initialXrayConfirmed, setInitialXrayConfirmed] = useState(device?.initial_xray_confirmed || false);
  const [initialPh, setInitialPh] = useState<number | undefined>(device?.initial_ph);
  const [initialAspirateAppearance, setInitialAspirateAppearance] = useState(device?.initial_aspirate_appearance || '');
  const [placementConfirmed, setPlacementConfirmed] = useState(device?.placement_confirmed || false);

  useEffect(() => {
    setIsDirty(true);
  }, [type, placementDate, placementTime, placedPreArrival, insertedBy, tubeNumber, orientation, tubeSizeFr, numberOfSutures, reservoirType, reservoirSizeMl, securementMethod, patientTolerance, notes, studentName, gauge, siteSide, siteLocation, route, externalLengthCm, initialXrayConfirmed, initialPh, initialAspirateAppearance, placementConfirmed]);

  const handleOrientationToggle = (value: Orientation) => {
    setOrientation(prev =>
      prev.includes(value) ? prev.filter(o => o !== value) : [...prev, value]
    );
  };

  const handleSecurementMethodToggle = (value: string) => {
    setSecurementMethod(prev =>
      prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: Record<string, any> = {
        type,
        placement_date: placementDate || undefined,
        placement_time: placementTime || undefined,
        placed_pre_arrival: placedPreArrival || undefined,
        inserted_by: studentName || insertedBy || undefined,  // Use studentName for student tracking
        tube_number: tubeNumber,
        orientation: orientation.length > 0 ? orientation : undefined,
        tube_size_fr: tubeSizeFr || undefined,
        number_of_sutures_placed: numberOfSutures,
        reservoir_type: reservoirType,
        reservoir_size_ml: reservoirSizeMl,
        securement_method: securementMethod.length > 0 ? securementMethod : undefined,
        patient_tolerance: patientTolerance || undefined,
        notes: notes || undefined,
        // IV-specific fields
        gauge: gauge || undefined,
        site_side: siteSide || undefined,
        site_location: siteLocation || undefined,
        // Feeding Tube-specific fields
        route: route || undefined,
        external_length_cm: externalLengthCm,
        initial_xray_confirmed: initialXrayConfirmed || undefined,
        initial_ph: initialPh,
        initial_aspirate_appearance: initialAspirateAppearance || undefined,
        placement_confirmed: placementConfirmed || undefined
      };

      if (!device) {
        data.location_id = locationId;
      }

      await onSave(data);
      setIsDirty(false);
    } catch (error) {
      console.error('Error saving device:', error);
      alert('Failed to save device. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!window.confirm('Are you sure you want to delete this device?')) return;

    setIsSubmitting(true);
    try {
      await onDelete();
    } catch (error) {
      console.error('Error deleting device:', error);
      alert('Failed to delete device. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800">
        <p className="font-medium">Note: All measurements use metric units</p>
        <p>Times are in 24-hour format (HH:MM)</p>
      </div>

      {/* Device Type */}
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
          Device Type <span className="text-red-500">*</span>
        </label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as DeviceType)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          required
        >
          {Object.entries(DEVICE_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* IV-Specific Fields */}
      {(type === 'iv-peripheral' || type === 'iv-picc' || type === 'iv-port') && (
        <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-sm font-semibold text-blue-900">IV Site Information</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="gauge" className="block text-sm font-medium text-gray-700 mb-1">
                Gauge Size
              </label>
              <select
                id="gauge"
                value={gauge}
                onChange={(e) => setGauge(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select...</option>
                <option value="14G">14G</option>
                <option value="16G">16G</option>
                <option value="18G">18G</option>
                <option value="20G">20G</option>
                <option value="22G">22G</option>
                <option value="24G">24G</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="siteSide" className="block text-sm font-medium text-gray-700 mb-1">
                Site Side
              </label>
              <select
                id="siteSide"
                value={siteSide}
                onChange={(e) => setSiteSide(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select...</option>
                <option value="Left">Left</option>
                <option value="Right">Right</option>
              </select>
            </div>
          </div>
          
          <div>
            <label htmlFor="siteLocation" className="block text-sm font-medium text-gray-700 mb-1">
              Site Location
            </label>
            <input
              type="text"
              id="siteLocation"
              value={siteLocation}
              onChange={(e) => setSiteLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Left Antecubital, Right Hand Dorsum"
            />
          </div>
        </div>
      )}
      
      {/* Feeding Tube-Specific Fields */}
      {type === 'feeding-tube' && (
        <div className="space-y-4 p-4 bg-purple-50 border border-purple-200 rounded-md">
          <h3 className="text-sm font-semibold text-purple-900">Feeding Tube Information</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="route" className="block text-sm font-medium text-gray-700 mb-1">
                Route
              </label>
              <select
                id="route"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Select...</option>
                <option value="NG">NG (Nasogastric)</option>
                <option value="OG">OG (Orogastric)</option>
                <option value="PEG">PEG (Percutaneous Endoscopic Gastrostomy)</option>
                <option value="PEJ">PEJ (Percutaneous Endoscopic Jejunostomy)</option>
                <option value="GJ">GJ (Gastrojejunal)</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="externalLengthCm" className="block text-sm font-medium text-gray-700 mb-1">
                External Length (cm)
              </label>
              <input
                type="number"
                id="externalLengthCm"
                value={externalLengthCm || ''}
                onChange={(e) => setExternalLengthCm(e.target.value ? parseFloat(e.target.value) : undefined)}
                step="0.1"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
          
          <div className="border-t border-purple-200 pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Initial Placement Verification</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="initialPh" className="block text-sm font-medium text-gray-700 mb-1">
                  Initial pH
                </label>
                <input
                  type="number"
                  id="initialPh"
                  value={initialPh || ''}
                  onChange={(e) => setInitialPh(e.target.value ? parseFloat(e.target.value) : undefined)}
                  step="0.1"
                  min="0"
                  max="14"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="0.0 - 14.0"
                />
              </div>
              
              <div>
                <label htmlFor="initialAspirateAppearance" className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Aspirate Appearance
                </label>
                <input
                  type="text"
                  id="initialAspirateAppearance"
                  value={initialAspirateAppearance}
                  onChange={(e) => setInitialAspirateAppearance(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., Clear, Bile-tinged"
                />
              </div>
            </div>
            
            <div className="space-y-2 mt-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={initialXrayConfirmed}
                  onChange={(e) => setInitialXrayConfirmed(e.target.checked)}
                  className="rounded text-purple-500 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Initial X-ray Confirmed Placement</span>
              </label>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={placementConfirmed}
                  onChange={(e) => setPlacementConfirmed(e.target.checked)}
                  className="rounded text-purple-500 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700 font-medium">Placement Confirmed (Required before use)</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Placement Date & Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="placementDate" className="block text-sm font-medium text-gray-700 mb-1">
            Placement Date
          </label>
          <input
            type="date"
            id="placementDate"
            value={placementDate}
            onChange={(e) => setPlacementDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <div>
          <label htmlFor="placementTime" className="block text-sm font-medium text-gray-700 mb-1">
            Placement Time (24h)
          </label>
          <input
            type="time"
            id="placementTime"
            value={placementTime}
            onChange={(e) => setPlacementTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>

      {/* Placed Pre-Arrival */}
      <div>
        <label htmlFor="placedPreArrival" className="block text-sm font-medium text-gray-700 mb-1">
          Placed Pre-Arrival
        </label>
        <select
          id="placedPreArrival"
          value={placedPreArrival}
          onChange={(e) => setPlacedPreArrival(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
        >
          <option value="">Select...</option>
          <option value="EMS">EMS</option>
          <option value="NH">Nursing Home</option>
          <option value="Clinic">Clinic</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Inserted By */}
      <div>
        <label htmlFor="insertedBy" className="block text-sm font-medium text-gray-700 mb-1">
          Inserted By
        </label>
        <input
          type="text"
          id="insertedBy"
          value={insertedBy}
          onChange={(e) => setInsertedBy(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          placeholder="Provider name"
        />
      </div>

      {/* Tube Number */}
      <div>
        <label htmlFor="tubeNumber" className="block text-sm font-medium text-gray-700 mb-1">
          Tube Number (1-10)
        </label>
        <input
          type="number"
          id="tubeNumber"
          value={tubeNumber || ''}
          onChange={(e) => setTubeNumber(e.target.value ? parseInt(e.target.value) : undefined)}
          min="1"
          max="10"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
      </div>

      {/* Orientation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Orientation
        </label>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(ORIENTATION_LABELS).map(([value, label]) => (
            <label key={value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={orientation.includes(value as Orientation)}
                onChange={() => handleOrientationToggle(value as Orientation)}
                className="rounded text-green-500 focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Tube Size (French) */}
      <div>
        <label htmlFor="tubeSizeFr" className="block text-sm font-medium text-gray-700 mb-1">
          Tube Size (French)
        </label>
        <input
          type="text"
          id="tubeSizeFr"
          value={tubeSizeFr}
          onChange={(e) => setTubeSizeFr(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          placeholder="e.g., 10 Fr"
        />
      </div>

      {/* Number of Sutures */}
      <div>
        <label htmlFor="numberOfSutures" className="block text-sm font-medium text-gray-700 mb-1">
          Number of Sutures Placed
        </label>
        <input
          type="number"
          id="numberOfSutures"
          value={numberOfSutures || ''}
          onChange={(e) => setNumberOfSutures(e.target.value ? parseInt(e.target.value) : undefined)}
          min="0"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
      </div>

      {/* Reservoir Type */}
      <div>
        <label htmlFor="reservoirType" className="block text-sm font-medium text-gray-700 mb-1">
          Reservoir Type
        </label>
        <select
          id="reservoirType"
          value={reservoirType || ''}
          onChange={(e) => setReservoirType(e.target.value as ReservoirType || undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
        >
          <option value="">Select...</option>
          {Object.entries(RESERVOIR_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Reservoir Size (mL) */}
      <div>
        <label htmlFor="reservoirSizeMl" className="block text-sm font-medium text-gray-700 mb-1">
          Reservoir Size (mL)
        </label>
        <input
          type="number"
          id="reservoirSizeMl"
          value={reservoirSizeMl || ''}
          onChange={(e) => setReservoirSizeMl(e.target.value ? parseInt(e.target.value) : undefined)}
          min="0"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
      </div>

      {/* Securement Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Securement Method
        </label>
        <div className="space-y-2">
          {['Suture', 'Tape', 'StatLock', 'Other'].map((method) => (
            <label key={method} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={securementMethod.includes(method)}
                onChange={() => handleSecurementMethodToggle(method)}
                className="rounded text-green-500 focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">{method}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Patient Tolerance */}
      <div>
        <label htmlFor="patientTolerance" className="block text-sm font-medium text-gray-700 mb-1">
          Patient Tolerance
        </label>
        <textarea
          id="patientTolerance"
          value={patientTolerance}
          onChange={(e) => setPatientTolerance(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          placeholder="Describe patient's tolerance to procedure..."
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          placeholder="Any additional notes..."
        />
      </div>

      {/* Student Name Verification */}
      <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-md">
        <label htmlFor="studentName" className="block text-sm font-medium text-gray-900 mb-2">
          Student Name
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
        <p className="mt-2 text-xs text-gray-600">
          By entering your name, you verify you placed this device.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div>
          {device && onDelete && (
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
            disabled={isSubmitting || !studentName.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{device ? 'Update' : 'Save'} Device</span>
          </button>
        </div>
      </div>
    </form>
  );
};
