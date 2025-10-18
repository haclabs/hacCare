import React, { useState } from 'react';
import { VitalSigns } from '../../../../types';
import { Save, X, Thermometer, Heart, Activity, Droplets } from 'lucide-react';
import { updatePatientVitals } from '../../../../services/patient/patientService';
import { usePatients } from '../../hooks/usePatients';

interface VitalSignsEditorProps {
  patientId: string;
  vitals?: VitalSigns; // Make vitals optional
  onSave: (vitals: VitalSigns) => void;
  onCancel: () => void;
}

// Default vital signs values
const defaultVitals: VitalSigns = {
  temperature: 37.0, // Store in Celsius
  heartRate: 72,
  bloodPressure: {
    systolic: 120,
    diastolic: 80
  },
  respiratoryRate: 16,
  oxygenSaturation: 98,
  oxygenDelivery: 'Room Air',
  lastUpdated: new Date().toISOString()
};

export const VitalSignsEditor: React.FC<VitalSignsEditorProps> = ({
  patientId,
  vitals,
  onSave,
  onCancel
}) => {
  const [editedVitals, setEditedVitals] = useState<VitalSigns>({
    ...defaultVitals,
    ...vitals, // Override defaults with actual vitals if provided
    lastUpdated: new Date().toISOString()
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { refreshPatients } = usePatients();

  // Convert Celsius to Celsius (no conversion needed)
  const formatTemperature = (temp: number) => {
    return temp;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(''); 

    try {
      console.log('Saving vitals for patient:', patientId, editedVitals);
      
      // Format temperature (already in Celsius)
      const vitalsToSave = { 
        ...editedVitals,
        temperature: formatTemperature(editedVitals.temperature)
      };
      
      console.log('Formatted vitals to save:', vitalsToSave);
      
      // Save vitals to database
      await updatePatientVitals(patientId, vitalsToSave);
      console.log('Vitals saved successfully');
      
      // Refresh patients to get updated vitals
      await refreshPatients();
      console.log('Patients refreshed');
      
      // Call the onSave callback
      onSave(vitalsToSave);
    } catch (err: any) {
      console.error('Error saving vitals:', err);
      setError(err.message || 'Failed to save vital signs');
    } finally {
      setLoading(false);
    }
  };

  const updateVital = (field: keyof VitalSigns, value: any) => {
    setEditedVitals(prev => ({
      ...prev, 
      [field]: value 
    }));
  };

  const updateBloodPressure = (type: 'systolic' | 'diastolic', value: number) => {
    setEditedVitals(prev => ({
      ...prev,
      bloodPressure: { 
        ...prev.bloodPressure, 
        [type]: value 
      } 
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Update Vital Signs</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Temperature */}
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3"> 
                <Thermometer className="h-5 w-5 text-red-600" /> 
                <label className="text-sm font-medium text-red-900">Temperature (°C)</label>
              </div>
              <input
                type="number"
                step="0.1"
                min="35"
                max="42"
                value={editedVitals.temperature}
                onChange={(e) => updateVital('temperature', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="37.0"
                required
              />
            </div>

            {/* Heart Rate */}
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Heart className="h-5 w-5 text-green-600" />
                <label className="text-sm font-medium text-green-900">Heart Rate (BPM)</label>
              </div>
              <input
                type="number"
                min="30"
                max="200"
                value={editedVitals.heartRate}
                onChange={(e) => updateVital('heartRate', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            {/* Blood Pressure */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Activity className="h-5 w-5 text-blue-600" />
                <label className="text-sm font-medium text-blue-900">Blood Pressure</label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-blue-700 mb-1 block">Systolic</label>
                  <input
                    type="number"
                    min="70"
                    max="250"
                    value={editedVitals.bloodPressure.systolic}
                    onChange={(e) => updateBloodPressure('systolic', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-blue-700 mb-1 block">Diastolic</label>
                  <input
                    type="number"
                    min="40"
                    max="150"
                    value={editedVitals.bloodPressure.diastolic}
                    onChange={(e) => updateBloodPressure('diastolic', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Oxygen Saturation */}
            <div className="bg-teal-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Droplets className="h-5 w-5 text-teal-600" />
                <label className="text-sm font-medium text-teal-900">O2 Saturation (%)</label>
              </div>
              <input
                type="number"
                min="70"
                max="100"
                value={editedVitals.oxygenSaturation}
                onChange={(e) => updateVital('oxygenSaturation', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-teal-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                required
              />
            </div>

            {/* Oxygen Delivery */}
            <div className="bg-cyan-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Droplets className="h-5 w-5 text-cyan-600" />
                <label className="text-sm font-medium text-cyan-900">Oxygen Delivery</label>
              </div>
              <select
                value={editedVitals.oxygenDelivery || 'Room Air'}
                onChange={(e) => updateVital('oxygenDelivery', e.target.value)}
                className="w-full px-3 py-2 border border-cyan-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white"
                required
              >
                <option value="Room Air">Room Air (RA)</option>
                {Array.from({ length: 15 }, (_, i) => i + 1).map(flow => (
                  <option key={flow} value={`O2 ${flow} L/min`}>
                    O2 {flow} L/min
                  </option>
                ))}
              </select>
            </div>

            {/* Respiratory Rate */}
            <div className="bg-purple-50 rounded-lg p-4 md:col-span-2">
              <div className="flex items-center space-x-2 mb-3">
                <Activity className="h-5 w-5 text-purple-600" />
                <label className="text-sm font-medium text-purple-900">Respiratory Rate (breaths/min)</label>
              </div>
              <input
                type="number"
                min="8"
                max="40"
                value={editedVitals.respiratoryRate}
                onChange={(e) => updateVital('respiratoryRate', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Saving...' : 'Save Vitals'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};