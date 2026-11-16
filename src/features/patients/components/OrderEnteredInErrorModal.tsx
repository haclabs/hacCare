/**
 * Asks for the student's name and a reason before marking a doctor's order as
 * entered in error. The order stays on the chart, struck through.
 */

import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { DoctorsOrder } from '../../../types';

interface OrderEnteredInErrorModalProps {
  order: DoctorsOrder;
  onConfirm: (studentName: string, reason: string) => Promise<void>;
  onCancel: () => void;
}

export const OrderEnteredInErrorModal: React.FC<OrderEnteredInErrorModalProps> = ({ order, onConfirm, onCancel }) => {
  const [studentName, setStudentName] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) return setError('Enter your name so the correction is documented.');
    if (!reason.trim()) return setError('Enter the reason the order was entered in error.');
    setSaving(true);
    setError(null);
    try {
      await onConfirm(studentName, reason);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark this order. Try again.');
      setSaving(false);
    }
  };

  const inputClass =
    'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-haccare-mint';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <form
        onSubmit={submit}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" /> Mark order as entered in error
          </h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-900 whitespace-pre-line rounded-lg bg-gray-50 border border-gray-200 p-3">
          {order.order_text}
        </p>

        <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
          <li>The order stays on the chart, struck through, with your name and reason. It can't be undone.</li>
          {order.order_link_key && (
            <li className="text-red-700 font-medium">
              Its medication is discontinued on the MAR and can no longer be given.
            </li>
          )}
          <li>Enter the correct order afterwards if one is needed.</li>
        </ul>

        <label className="block text-xs font-medium text-gray-700">
          Your name
          <input value={studentName} onChange={e => setStudentName(e.target.value)} className={inputClass} autoFocus />
        </label>
        <label className="block text-xs font-medium text-gray-700">
          Reason
          <input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Wrong patient, wrong dose, transcription error"
            className={inputClass}
          />
        </label>

        {error && <p className="text-sm font-medium text-red-700">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Mark as entered in error'}
          </button>
        </div>
      </form>
    </div>
  );
};
