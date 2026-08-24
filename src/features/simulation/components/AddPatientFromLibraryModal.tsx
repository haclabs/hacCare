/**
 * Modal to copy a patient from the Patient Library into a simulation
 * template currently being edited. Always mints a fresh patient id/barcode
 * server-side — copy-once, no ongoing sync back to the patient template.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, UserPlus, Loader2, CheckCircle } from 'lucide-react';
import { useTenant } from '../../../contexts/TenantContext';
import { useUserProgramAccess } from '../../../hooks/useUserProgramAccess';
import { getPatientTemplates, addPatientTemplateToSimulationTemplate } from '../../../services/simulation/patientTemplateService';
import type { PatientTemplate } from '../types/patientTemplate';
import { secureLogger } from '../../../lib/security/secureLogger';

interface AddPatientFromLibraryModalProps {
  simulationTemplateId: string;
  onClose: () => void;
}

export const AddPatientFromLibraryModal: React.FC<AddPatientFromLibraryModalProps> = ({
  simulationTemplateId,
  onClose,
}) => {
  const { currentTenant } = useTenant();
  const { filterByPrograms } = useUserProgramAccess();
  const queryClient = useQueryClient();
  const [templates, setTemplates] = useState<PatientTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getPatientTemplates();
        setTemplates(data);
      } catch (err) {
        secureLogger.error('Error loading patient templates:', err);
        setError('Failed to load patient library');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const available = useMemo(
    () => filterByPrograms(templates).filter(t => t.status === 'ready'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [templates],
  );

  const handleAdd = async (patientTemplate: PatientTemplate) => {
    setAddingId(patientTemplate.id);
    setError(null);
    try {
      const result = await addPatientTemplateToSimulationTemplate(patientTemplate.id, simulationTemplateId);
      if (!result.success) {
        setError(result.message || 'Failed to add patient');
        return;
      }
      setAddedIds(prev => [...prev, patientTemplate.id]);
      queryClient.invalidateQueries({ queryKey: ['patients', currentTenant?.id] });
    } catch (err: any) {
      secureLogger.error('Error adding patient template to simulation template:', err);
      setError(err?.message || 'Failed to add patient');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-fuchsia-100 rounded-lg">
              <UserPlus className="h-5 w-5 text-fuchsia-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Add Patient from Library</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          )}

          {!loading && available.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">
              No ready patient templates available in your program(s) yet.
            </p>
          )}

          {!loading && available.map(t => {
            const alreadyAdded = addedIds.includes(t.id);
            return (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 px-4 py-3 border border-slate-200 rounded-lg"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{t.name}</p>
                  {t.description && (
                    <p className="text-xs text-slate-500 truncate">{t.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleAdd(t)}
                  disabled={addingId === t.id || alreadyAdded}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex-shrink-0 ${
                    alreadyAdded
                      ? 'bg-green-50 text-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                  }`}
                >
                  {addingId === t.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : alreadyAdded ? (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" /> Added
                    </>
                  ) : (
                    'Add'
                  )}
                </button>
              </div>
            );
          })}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
