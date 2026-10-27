import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Printer, Pill, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/api/supabase';
import { fetchMedicationLabels, dedupeMedicationLabels } from '../../../services/operations/bulkLabelService';
import { MedicationLabelsModal } from './MedicationLabelsModal';

interface PatientTemplateLabelsModalProps {
  templateName: string;
  tenantId: string;
  onClose: () => void;
}

/**
 * Medication labels for a Patient Library template. Medication barcodes are carried
 * through when the patient is copied into a simulation template and on launch, so these
 * labels scan in any simulation built from it. Wristbands are not offered: patient
 * barcodes are regenerated on every copy.
 */
export const PatientTemplateLabelsModal: React.FC<PatientTemplateLabelsModalProps> = ({
  templateName,
  tenantId,
  onClose,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [startRow, setStartRow] = useState(1);
  const [printing, setPrinting] = useState(false);

  const { data: medications = [], isLoading, error } = useQuery({
    queryKey: ['patientTemplateMedicationLabels', tenantId],
    queryFn: async () => {
      // RLS only shows a template tenant's rows to its members; instructors who have
      // never opened the template for editing are not members yet
      const { error: accessError } = await supabase.rpc('ensure_tenant_access', { p_tenant_id: tenantId });
      if (accessError) throw accessError;
      return fetchMedicationLabels(tenantId);
    },
    staleTime: 0,
  });

  const items = useMemo(() => dedupeMedicationLabels(medications), [medications]);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-5 border-b">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-900">Print Medication Labels</h2>
              <p className="text-sm text-gray-600 mt-0.5 truncate">{templateName}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Close">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-haccare-teal"></div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error instanceof Error ? error.message : 'Failed to load medications'}
              </div>
            )}

            {!isLoading && !error && (
              <>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Pill className="h-5 w-5 text-green-700" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 leading-none">{items.length}</p>
                    <p className="text-xs text-gray-500 mt-1">One label per distinct medication</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm text-gray-700">
                    <span className="block font-medium mb-1">Qty per medication</span>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-haccare-mint"
                    />
                  </label>
                  <label className="text-sm text-gray-700">
                    <span className="block font-medium mb-1">Start at row</span>
                    <select
                      value={startRow}
                      onChange={(e) => setStartRow(Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-haccare-mint"
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(row => (
                        <option key={row} value={row}>Row {row}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <p className="text-xs text-gray-500">
                  Avery 5160 sheets (30 labels). These labels scan in every simulation built from this patient.
                </p>

                <button
                  onClick={() => setPrinting(true)}
                  disabled={items.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-haccare-teal hover:bg-haccare-teal-dark text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer className="h-4 w-4" />
                  {items.length === 0 ? 'No medications on this patient' : `Print ${items.length * quantity} labels`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {printing && items.length > 0 && (
        <MedicationLabelsModal
          items={items}
          simulationName={templateName}
          participants={[]}
          headerDetail="Patient Library template"
          onClose={() => setPrinting(false)}
          quantity={quantity}
          startRow={startRow}
        />
      )}
    </>
  );
};
