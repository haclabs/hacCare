import React, { useState, useEffect } from 'react';
import { ArrowRight, Copy, Move, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { transferPatient, getAvailableTenantsForTransfer, canTransferPatient, PatientTransferOptions } from '../../../services/patient/patientTransferService';
import { testPatientTransferFunctions } from '../../utils/testPatientTransfer';
import { Patient } from '../../../types';

interface PatientTransferModalProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
  onTransferComplete?: (success: boolean, message: string) => void;
}

interface TenantOption {
  id: string;
  name: string;
  subdomain: string;
}

const PatientTransferModal: React.FC<PatientTransferModalProps> = ({
  patient,
  isOpen,
  onClose,
  onTransferComplete
}) => {
  const [transferType, setTransferType] = useState<'move' | 'duplicate'>('duplicate');
  const [targetTenantId, setTargetTenantId] = useState('');
  const [availableTenants, setAvailableTenants] = useState<TenantOption[]>([]);
  const [newPatientId, setNewPatientId] = useState('');
  const [transferOptions, setTransferOptions] = useState({
    transferVitals: true,
    transferMedications: true,
    transferAssessments: true,
    transferHandoverNotes: true,
    transferAlerts: true,
    transferDiabeticRecords: true,
    transferBowelRecords: true,
    transferWoundCare: true,
    transferDoctorsOrders: true,
    transferAdmissionRecords: true,
    transferAdvancedDirectives: true,
    transferHacmap: true,
  });
  const [loading, setLoading] = useState(false);
  const [canTransfer, setCanTransfer] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && patient) {
      loadAvailableTenants();
      checkTransferPermissions();
    }
  }, [isOpen, patient]);

  const loadAvailableTenants = async () => {
    if (!patient) return;
    
    try {
      const tenants = await getAvailableTenantsForTransfer(patient.id);
      setAvailableTenants(tenants);
    } catch (error) {
      console.error('Failed to load tenants:', error);
      setError('Failed to load available tenants');
    }
  };

  const checkTransferPermissions = async () => {
    if (!patient) return;

    try {
      const result = await canTransferPatient(patient.id);
      setCanTransfer(result.canTransfer);
      if (!result.canTransfer) {
        setError(result.reason || 'Transfer not allowed');
      }
    } catch (error) {
      setCanTransfer(false);
      setError('Failed to check transfer permissions');
    }
  };

  const handleTransfer = async () => {
    if (!patient || !targetTenantId) return;

    setLoading(true);
    setError('');

    const options: PatientTransferOptions = {
      sourcePatientId: patient.id,
      targetTenantId,
      preserveOriginal: transferType === 'duplicate',
      newPatientId: transferType === 'duplicate' ? newPatientId || undefined : undefined,
      ...transferOptions
    };

    try {
      const result = await transferPatient(options);
      
      if (result.success) {
        onTransferComplete?.(true, result.message);
        onClose();
      } else {
        setError(result.error || result.message);
        onTransferComplete?.(false, result.message);
      }
    } catch (error) {
      const errorMessage = 'Transfer failed unexpectedly';
      setError(errorMessage);
      onTransferComplete?.(false, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTransferType('duplicate');
    setTargetTenantId('');
    setNewPatientId('');
    setTransferOptions({
      transferVitals: true,
      transferMedications: true,
      transferAssessments: true,
      transferHandoverNotes: true,
      transferAlerts: true,
      transferDiabeticRecords: true,
      transferBowelRecords: true,
      transferWoundCare: true,
      transferDoctorsOrders: true,
      transferAdmissionRecords: true,
      transferAdvancedDirectives: true,
      transferHacmap: true,
    });
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen || !patient) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Transfer Patient</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {patient.first_name} {patient.last_name} ({patient.patient_id})
          </p>
        </div>

        <div className="p-6">
          {!canTransfer ? (
            <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
              <div>
                <p className="font-medium text-red-900">Transfer Not Allowed</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Transfer Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Transfer Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setTransferType('duplicate')}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      transferType === 'duplicate'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <Copy className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="font-medium">Duplicate</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Create a copy in the target tenant. Original patient remains.
                    </p>
                  </button>

                  <button
                    onClick={() => setTransferType('move')}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      transferType === 'move'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <Move className="h-5 w-5 text-orange-600 mr-2" />
                      <span className="font-medium">Move</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Transfer to target tenant. Removes from current tenant.
                    </p>
                  </button>
                </div>
              </div>

              {/* Target Tenant Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Tenant
                </label>
                <select
                  value={targetTenantId}
                  onChange={(e) => setTargetTenantId(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a tenant...</option>
                  {availableTenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name} ({tenant.subdomain})
                    </option>
                  ))}
                </select>
              </div>

              {/* New Patient ID for Duplicates */}
              {transferType === 'duplicate' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Patient ID (optional)
                  </label>
                  <input
                    type="text"
                    value={newPatientId}
                    onChange={(e) => setNewPatientId(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Leave empty to auto-generate"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    If not specified, a unique ID will be generated automatically
                  </p>
                </div>
              )}

              {/* Transfer Options */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Data to Transfer
                </label>
                <div className="space-y-3">
                  {[
                    { key: 'transferVitals', label: 'Vital Signs', icon: '💓' },
                    { key: 'transferMedications', label: 'Medications', icon: '💊' },
                    { key: 'transferAssessments', label: 'Assessments', icon: '📋' },
                    { key: 'transferHandoverNotes', label: 'Handover Notes (SBAR)', icon: '🔄' },
                    { key: 'transferDoctorsOrders', label: 'Doctors Orders', icon: '🩺' },
                    { key: 'transferWoundCare', label: 'Wound Care', icon: '🏥' },
                    { key: 'transferAlerts', label: 'Patient Alerts', icon: '🚨' },
                    { key: 'transferDiabeticRecords', label: 'Diabetic Records', icon: '🩸' },
                    { key: 'transferBowelRecords', label: 'Bowel Records', icon: '📊' },
                    { key: 'transferAdmissionRecords', label: 'Admission Records', icon: '🏥' },
                    { key: 'transferAdvancedDirectives', label: 'Advanced Directives', icon: '📜' },
                    { key: 'transferHacmap', label: 'hacMap (Devices & Wounds)', icon: '📍' },
                  ].map(({ key, label, icon }) => (
                    <label key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={transferOptions[key as keyof typeof transferOptions]}
                        onChange={(e) =>
                          setTransferOptions(prev => ({
                            ...prev,
                            [key]: e.target.checked
                          }))
                        }
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">
                        {icon} {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Preview */}
              {targetTenantId && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Transfer Summary</h4>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    <span>
                      {transferType === 'duplicate' ? 'Duplicate' : 'Move'} {patient.first_name} {patient.last_name} to{' '}
                      {availableTenants.find(t => t.id === targetTenantId)?.name}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          {canTransfer && (
            <button
              onClick={handleTransfer}
              disabled={!targetTenantId || loading}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
                transferType === 'duplicate'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  {transferType === 'duplicate' ? (
                    <Copy className="h-4 w-4 mr-2" />
                  ) : (
                    <Move className="h-4 w-4 mr-2" />
                  )}
                  {transferType === 'duplicate' ? 'Duplicate Patient' : 'Move Patient'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientTransferModal;