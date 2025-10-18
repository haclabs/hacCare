// Lab Acknowledge Modal
// Shows abnormal results and allows nurses/students to acknowledge

import React, { useState } from 'react';
import { X, AlertTriangle, Check } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { acknowledgeLabs } from '../../services/clinical/labService';
import type { LabPanel, LabResult } from '../../types/labs';
import { getFlagLabel, getFlagColorClass, getEffectiveRangeDisplay } from '../../types/labs';

interface LabAcknowledgeModalProps {
  panel: LabPanel;
  results: LabResult[];
  patientId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const LabAcknowledgeModal: React.FC<LabAcknowledgeModalProps> = ({
  panel,
  results,
  patientId,
  onClose,
  onSuccess,
}) => {
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  // Filter unacknowledged results
  const unackedResults = results.filter(r => !r.ack_at);
  
  // Filter abnormal/critical results
  const abnormalResults = unackedResults.filter(r => r.flag !== 'normal');

  const handleAcknowledge = async () => {
    if (!currentTenant) {
      setError('No tenant selected');
      return;
    }

    setLoading(true);
    setError('');

    const { error: err } = await acknowledgeLabs(
      {
        panel_id: panel.id,
        scope: 'panel',
        note: note || undefined,
      },
      patientId,
      currentTenant.id
    );

    if (err) {
      setError('Failed to acknowledge labs');
      console.error(err);
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Acknowledge Labs
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date(panel.panel_time).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              You are about to acknowledge {unackedResults.length} lab result{unackedResults.length !== 1 ? 's' : ''}.
            </p>
          </div>

          {/* Abnormal warning */}
          {abnormalResults.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-yellow-900 mb-2">
                    Abnormal Values Detected
                  </h4>
                  <p className="text-sm text-yellow-800 mb-3">
                    {abnormalResults.length} result{abnormalResults.length !== 1 ? 's have' : ' has'} abnormal or critical values. 
                    Please review carefully:
                  </p>

                  {/* Abnormal results list */}
                  <div className="space-y-2">
                    {abnormalResults.map((result) => {
                      const refRange = getEffectiveRangeDisplay(
                        result.ref_low,
                        result.ref_high,
                        result.ref_operator,
                        result.sex_ref,
                        null
                      );

                      return (
                        <div
                          key={result.id}
                          className="bg-white border border-yellow-300 rounded-lg p-3"
                        >
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {result.test_name}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {result.test_code}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded ${getFlagColorClass(
                                result.flag
                              )}`}
                            >
                              {getFlagLabel(result.flag)}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                            <div>
                              <span className="text-gray-500">Value:</span>
                              <span className="ml-1 font-medium text-gray-900">
                                {result.value} {result.units}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-500">Expected:</span>
                              <span className="ml-1 text-gray-900">
                                {refRange} {result.units}
                              </span>
                            </div>
                          </div>
                          {result.comments && (
                            <p className="text-xs text-gray-600 mt-2 italic">
                              {result.comments}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* All results preview */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              All Results ({unackedResults.length})
            </h4>
            <div className="bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="pb-2">Test</th>
                    <th className="pb-2">Value</th>
                    <th className="pb-2">Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {unackedResults.map((result) => (
                    <tr key={result.id}>
                      <td className="py-1.5">{result.test_name}</td>
                      <td className="py-1.5">
                        {result.value !== null ? `${result.value} ${result.units || ''}` : '-'}
                      </td>
                      <td className="py-1.5">
                        <span
                          className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded ${getFlagColorClass(
                            result.flag
                          )}`}
                        >
                          {getFlagLabel(result.flag)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              placeholder="Add any notes about this acknowledgement..."
            />
          </div>

          {/* Confirmation */}
          {abnormalResults.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-600">
                By acknowledging, you confirm that you have reviewed all results, 
                including the {abnormalResults.length} abnormal value{abnormalResults.length !== 1 ? 's' : ''}, 
                and will take appropriate clinical action as needed.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAcknowledge}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Acknowledging...' : 'Acknowledge Labs'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
