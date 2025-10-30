// Basic Simulation Run Page
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSimRun } from '../hooks/useSimulation';

const SimulationRunPage: React.FC = () => {
  const { runId } = useParams<{ runId: string }>();
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  const {
    run,
    patients,
    barcodePool,
    loading,
    error,
    resetSimulation,
    recordVitals,
    administerMedication
  } = useSimRun(runId || '');

  const handleReset = async () => {
    try {
      setResetting(true);
      await resetSimulation();
      setShowResetConfirm(false);
      // Show success message
      alert('Simulation reset successfully! All student data cleared, printed IDs preserved.');
    } catch (error) {
      alert('Reset failed: ' + (error as Error).message);
    } finally {
      setResetting(false);
    }
  };

  const handleRecordVitals = async (patientId: string) => {
    const vitalType = prompt('Enter vital type (blood_pressure, heart_rate, temperature, etc.):');
    if (!vitalType) return;

    let value: Record<string, unknown> | null = null;
    if (vitalType === 'blood_pressure') {
      const systolic = prompt('Systolic BP:');
      const diastolic = prompt('Diastolic BP:');
      if (systolic && diastolic) {
        value = { systolic: parseInt(systolic), diastolic: parseInt(diastolic) };
      }
    } else {
      const val = prompt(`Enter ${vitalType} value:`);
      if (val) {
        value = { value: parseFloat(val) || val };
      }
    }

    if (value) {
      try {
        await recordVitals(patientId, vitalType, value);
        alert('Vitals recorded successfully!');
      } catch (error) {
        alert('Failed to record vitals: ' + (error as Error).message);
      }
    }
  };

  const handleMedicationAdmin = async (patientId: string) => {
    const barcode = prompt('Scan or enter barcode:');
    if (!barcode) return;

    // Find medication by barcode
    const barcodeEntry = barcodePool.find(b => b.public_barcode_id === barcode);
    if (!barcodeEntry) {
      alert('Barcode not found in this simulation!');
      return;
    }

    const amount = prompt('Enter dose amount:');
    const route = prompt('Enter route (IV, PO, etc.):');
    
    if (amount && route) {
      try {
        await administerMedication(
          patientId,
          barcode,
          barcodeEntry.medication_name,
          { amount, route },
          prompt('Additional notes (optional):') || undefined
        );
        alert('Medication administered successfully!');
      } catch (error) {
        alert('Failed to administer medication: ' + (error as Error).message);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading simulation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 text-lg font-semibold mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-gray-800 text-xl font-semibold mb-2">Simulation Not Found</h2>
          <p className="text-gray-600">The requested simulation could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{run.name}</h1>
              <p className="text-sm text-gray-500">
                Status: <span className="capitalize font-medium">{run.status}</span> • 
                Started: {new Date(run.started_at).toLocaleString()}
              </p>
            </div>
            
            {/* Reset Button */}
            <div>
              <button
                onClick={() => setShowResetConfirm(true)}
                disabled={resetting || run.status !== 'active'}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {resetting ? 'Resetting...' : 'Reset Simulation'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Patients Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {patients.map((patient) => (
            <div key={patient.id} className="bg-white rounded-lg shadow-sm border p-6">
              {/* Patient Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Patient ID: {patient.public_patient_id}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {patient.room && `Room: ${patient.room}`}
                    {patient.bed && ` • Bed: ${patient.bed}`}
                  </p>
                </div>
                <div className="w-3 h-3 bg-green-400 rounded-full" title="Active"></div>
              </div>

              {/* Demographics */}
              {patient.demographics && (
                <div className="mb-4 p-3 bg-gray-50 rounded">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Demographics</h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    {patient.demographics.age && <p>Age: {patient.demographics.age}</p>}
                    {patient.demographics.gender && <p>Gender: {patient.demographics.gender}</p>}
                    {patient.demographics.diagnosis && <p>Diagnosis: {patient.demographics.diagnosis}</p>}
                  </div>
                </div>
              )}

              {/* Recent Vitals */}
              {patient.recent_vitals && patient.recent_vitals.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Vitals</h4>
                  <div className="space-y-2">
                    {patient.recent_vitals.slice(0, 3).map((vital, index) => (
                      <div key={index} className="text-xs bg-blue-50 p-2 rounded">
                        <span className="font-medium">{vital.type}:</span>{' '}
                        {typeof vital.value === 'object' ? 
                          Object.entries(vital.value).map(([k, v]) => `${k}: ${v}`).join(', ') :
                          vital.value
                        }
                        <div className="text-gray-500 mt-1">
                          {new Date(vital.recorded_at).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Med Admin */}
              {patient.recent_med_admin && patient.recent_med_admin.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Medications</h4>
                  <div className="space-y-2">
                    {patient.recent_med_admin.slice(0, 2).map((med, index) => (
                      <div key={index} className="text-xs bg-green-50 p-2 rounded">
                        <span className="font-medium">{med.medication_name}</span>
                        <div>Dose: {JSON.stringify(med.dose_given)}</div>
                        <div className="text-gray-500 mt-1">
                          {new Date(med.administered_at).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleRecordVitals(patient.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium"
                >
                  Record Vitals
                </button>
                <button
                  onClick={() => handleMedicationAdmin(patient.id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium"
                >
                  Give Medication
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Available Barcodes */}
        {barcodePool.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Medication Barcodes</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {barcodePool.map((barcode) => (
                <div 
                  key={barcode.id} 
                  className={`p-3 rounded border text-sm ${
                    barcode.assigned_to_patient_id 
                      ? 'bg-gray-50 border-gray-200' 
                      : 'bg-green-50 border-green-200'
                  }`}
                >
                  <div className="font-mono font-bold">{barcode.public_barcode_id}</div>
                  <div className="text-gray-600">{barcode.medication_name}</div>
                  {barcode.assigned_to_patient_id && (
                    <div className="text-xs text-gray-500 mt-1">
                      Used at {barcode.assigned_at ? new Date(barcode.assigned_at).toLocaleTimeString() : 'Unknown'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reset Simulation</h3>
            <p className="text-gray-600 mb-6">
              This will delete all student-entered data (vitals, medication administration, notes, acknowledgments) 
              but preserve all printed patient IDs and barcodes. Are you sure?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium"
              >
                {resetting ? 'Resetting...' : 'Reset Simulation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimulationRunPage;