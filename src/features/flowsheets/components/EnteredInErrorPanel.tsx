/**
 * Shown at the bottom of a flowsheet entry's detail view. A marked entry gets a
 * red notice; an unmarked student entry gets a "Mark as entered in error"
 * button that asks for the student's name and a reason.
 */

import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface EnteredInErrorPanelProps {
  markedAt?: string | null;
  markedBy?: string | null;
  reason?: string | null;
  /** Omit when the entry can't be marked (e.g. an instructor baseline). */
  onMark?: (by: string, reason: string) => Promise<void>;
}

export const EnteredInErrorPanel: React.FC<EnteredInErrorPanelProps> = ({ markedAt, markedBy, reason, onMark }) => {
  const [open, setOpen] = useState(false);
  const [by, setBy] = useState('');
  const [why, setWhy] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (markedAt) {
    return (
      <div className="mx-6 mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <p className="font-semibold flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4" /> Entered in error
        </p>
        <p className="mt-1">
          {markedBy} · {new Date(markedAt).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
        <p className="mt-1 whitespace-pre-wrap">Reason: {reason}</p>
      </div>
    );
  }

  if (!onMark) return null;

  if (!open) {
    return (
      <div className="px-6 pb-5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-medium text-red-700 hover:text-red-900 underline underline-offset-2"
        >
          Mark as entered in error
        </button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!by.trim() || !why.trim()) {
      setError('Enter your name and a reason.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onMark(by, why);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark this entry. Try again.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-6 mb-5 rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
      <p className="text-sm text-red-800">
        The entry stays on the chart, struck through, with your name and reason. Save a new entry with the correct
        information afterwards.
      </p>
      <label className="block text-xs font-medium text-gray-700">
        Your name
        <input
          value={by}
          onChange={e => setBy(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-haccare-mint"
        />
      </label>
      <label className="block text-xs font-medium text-gray-700">
        Reason
        <input
          value={why}
          onChange={e => setWhy(e.target.value)}
          placeholder="e.g. Wrong patient, wrong time, incorrect value"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-haccare-mint"
        />
      </label>
      {error && <p className="text-xs font-medium text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Mark as entered in error'}
        </button>
      </div>
    </form>
  );
};
