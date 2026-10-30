import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';

import type { Patient, Medication } from '../../../../types';
import { createMedication } from '../../../../services/clinical/medicationService';
import { parseReleaseAfterMinutes } from '../../utils/orderRelease';
import { ReleaseDelayField } from '../DoctorsOrderRelease';
import { MedicationEntryFields } from './MedicationEntryFields';
import { useMedicationEntryForm, type MedicationEntryFields as MedicationEntryFieldValues } from './useMedicationEntryForm';
import { useNotInCatalogConfirmation } from './useNotInCatalogConfirmation';
import { secureLogger } from '../../../../lib/security/secureLogger';

interface AddMedicationFormProps {
  patient: Patient;
  currentMedications: Medication[];
  onMedicationAdded: (updatedMedications: Medication[]) => void;
  onClose: () => void;
  canSetReleaseDelay?: boolean;
}

export const AddMedicationForm: React.FC<AddMedicationFormProps> = ({
  patient,
  currentMedications,
  onMedicationAdded,
  onClose,
  canSetReleaseDelay = false,
}) => {
  const entry = useMedicationEntryForm();
  const { confirmSave, dialog: notInCatalogDialog } = useNotInCatalogConfirmation();
  const [prescribedBy, setPrescribedBy] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [releaseInput, setReleaseInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const built = entry.buildFields();
    if (built.error !== null) {
      alert(built.error);
      return;
    }
    if (!prescribedBy) {
      alert('Please fill in all required fields');
      return;
    }
    const { fields } = built;
    confirmSave(fields.catalog_id, fields.name, () => void save(fields));
  };

  const save = async (fields: MedicationEntryFieldValues) => {
    setIsLoading(true);
    try {
      const medicationData: Omit<Medication, 'id'> = {
        ...fields,
        patient_id: patient.id,
        status: 'Active',
        prescribed_by: prescribedBy,
        next_due: entry.initialNextDue(),
        last_administered: undefined,
        release_after_minutes: parseReleaseAfterMinutes(releaseInput),
      };

      secureLogger.debug('Creating medication in database:', medicationData);
      const saved = await createMedication(medicationData);
      secureLogger.debug('Medication saved successfully:', saved);

      onMedicationAdded([...currentMedications, saved]);
      setSuccessMessage(`${fields.category} medication "${fields.name}" added successfully`);
      setTimeout(onClose, 1500);
    } catch (error) {
      secureLogger.error('Error adding medication:', error);
      alert(`Failed to add medication: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Add New Medication</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {successMessage && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <MedicationEntryFields entry={entry} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prescribed By *
              </label>
              <input
                type="text"
                value={prescribedBy}
                onChange={(e) => setPrescribedBy(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Dr. Smith"
              />
            </div>

            {canSetReleaseDelay && (
              <ReleaseDelayField value={releaseInput} onChange={setReleaseInput} itemLabel="medication" />
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-haccare-teal text-white rounded-lg hover:bg-haccare-teal-dark transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Adding...' : 'Add Medication'}
              </button>
            </div>
          </form>
        </div>
      </div>
      {notInCatalogDialog}
    </div>
  );
};
