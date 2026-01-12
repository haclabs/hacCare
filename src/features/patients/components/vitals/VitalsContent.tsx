import React, { useState } from 'react';
import { Edit, TrendingUp, RefreshCw, Plus, Thermometer, Heart, Activity, Droplets, Wind } from 'lucide-react';
import { VitalSigns } from '../../../../types';
import { VitalSignsEditor } from './VitalSignsEditor';
import { VitalsTrends } from './VitalsTrends';
import { fetchPatientVitals } from '../../../../services/patient/patientService';
import { calculatePreciseAge } from '../../../../utils/vitalRanges';

interface VitalsContentProps {
  patientId: string;
  patientName: string;
  vitals: VitalSigns[];
  onVitalsUpdated: (vitals: VitalSigns[]) => void;
  patientDateOfBirth?: string; // Optional for age band display
}

export const VitalsContent: React.FC<VitalsContentProps> = ({
  patientId,
  patientName,
  vitals,
  onVitalsUpdated,
  patientDateOfBirth
}) => {
  const [showVitalsEditor, setShowVitalsEditor] = useState(false);
  const [showVitalsTrends, setShowVitalsTrends] = useState(false);
  const [refreshingVitals, setRefreshingVitals] = useState(false);
  
  // Calculate age band if DOB provided
  const ageInfo = patientDateOfBirth ? calculatePreciseAge(patientDateOfBirth) : null;

  const handleVitalsUpdate = async () => {
    if (!patientId) return;
    try {
      const vitalsData = await fetchPatientVitals(patientId);
      onVitalsUpdated(vitalsData);
      setShowVitalsEditor(false);
    } catch (error) {
      console.error('Error updating vitals:', error);
    }
  };

  const refreshVitals = async () => {
    if (!patientId) return;
    try {
      setRefreshingVitals(true);
      const vitalsData = await fetchPatientVitals(patientId);
      onVitalsUpdated(vitalsData);
    } catch (error) {
      console.error('Error refreshing vitals:', error);
    } finally {
      setRefreshingVitals(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Vital Signs</h3>
          {ageInfo && (
            <p className="text-sm text-blue-600 font-medium mt-1">{ageInfo.ageDescription}</p>
          )}
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowVitalsTrends(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            title="View vital signs trends"
          >
            <TrendingUp className="h-4 w-4" />
            <span>View Trends</span>
          </button>
          <button
            onClick={refreshVitals}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${refreshingVitals ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowVitalsEditor(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="h-4 w-4 mr-2" />
            <span>Record Vitals</span>
          </button>
        </div>
      </div>

      {vitals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Thermometer className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-sm font-medium text-gray-600">Temperature</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{vitals[0]?.temperature?.toFixed(1)}°C</p>
            <p className="text-xs text-gray-500 mt-1">{vitals[0]?.lastUpdated ? new Date(vitals[0].lastUpdated).toLocaleTimeString() : 'N/A'}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Heart className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-sm font-medium text-gray-600">Heart Rate</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{vitals[0]?.heartRate} bpm</p>
            <p className="text-xs text-gray-500 mt-1">{vitals[0]?.lastUpdated ? new Date(vitals[0].lastUpdated).toLocaleTimeString() : 'N/A'}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Activity className="h-5 w-5 text-blue-500 mr-2" />
                <span className="text-sm font-medium text-gray-600">Blood Pressure</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{vitals[0]?.bloodPressure?.systolic}/{vitals[0]?.bloodPressure?.diastolic} mmHg</p>
            <p className="text-xs text-gray-500 mt-1">{vitals[0]?.lastUpdated ? new Date(vitals[0].lastUpdated).toLocaleTimeString() : 'N/A'}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Droplets className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm font-medium text-gray-600">Oxygen Saturation</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{vitals[0]?.oxygenSaturation}%</p>
            <p className="text-xs text-gray-500 mt-1">{vitals[0]?.oxygenDelivery || 'Room Air'}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Wind className="h-5 w-5 text-purple-500 mr-2" />
                <span className="text-sm font-medium text-gray-600">Respiratory Rate</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{vitals[0]?.respiratoryRate}/min</p>
            <p className="text-xs text-gray-500 mt-1">{vitals[0]?.lastUpdated ? new Date(vitals[0].lastUpdated).toLocaleTimeString() : 'N/A'}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Droplets className="h-5 w-5 text-cyan-500 mr-2" />
                <span className="text-sm font-medium text-gray-600">Oxygen Delivery</span>
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900 mt-2">{vitals[0]?.oxygenDelivery || 'Room Air'}</p>
            <p className="text-xs text-gray-500 mt-1">{vitals[0]?.lastUpdated ? new Date(vitals[0].lastUpdated).toLocaleTimeString() : 'N/A'}</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Vital Signs Recorded</h3>
          <p className="text-gray-600 mb-6">Start recording vital signs to see patient health data.</p>
          <button
            onClick={() => setShowVitalsEditor(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Record First Vitals
          </button>
        </div>
      )}
      
      {showVitalsEditor && (
        <VitalSignsEditor
          patientId={patientId}
          onSave={handleVitalsUpdate}
          onCancel={() => setShowVitalsEditor(false)}
        />
      )}
      
      {showVitalsTrends && (
        <VitalsTrends
          patientId={patientId}
          patientName={patientName}
          onClose={() => setShowVitalsTrends(false)}
          onRecordVitals={() => {
            console.log("Record vitals clicked from trends");
            setShowVitalsTrends(false);
            setShowVitalsEditor(true);
          }}
        />
      )}
    </div>
  );
};