/**
 * Simulation name with an inline rename control, used on Active Simulations cards.
 */

import React, { useState } from 'react';
import { Pencil, Check, X, Loader2 } from 'lucide-react';
import { getErrorMessage } from '@/lib/errors';

interface SimulationNameEditorProps {
  name: string;
  onRename: (name: string) => Promise<void>;
}

export const SimulationNameEditor: React.FC<SimulationNameEditorProps> = ({ name, onRename }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setDraft(name);
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }
    if (trimmed === name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onRename(trimmed);
      setEditing(false);
    } catch (err) {
      setError(getErrorMessage(err) || 'Failed to rename simulation');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5 group">
        <h3 className={`text-sm font-semibold ${name.trim() ? 'text-gray-900' : 'italic text-gray-400'}`}>
          {name.trim() || 'Unnamed simulation'}
        </h3>
        <button
          type="button"
          onClick={startEditing}
          className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title="Rename simulation"
          aria-label="Rename simulation"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') setEditing(false);
          }}
          disabled={saving}
          autoFocus
          aria-label="Simulation name"
          className="text-sm font-semibold px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-haccare-mint focus:outline-none min-w-[16rem]"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving || !draft.trim()}
          className="p-1 rounded bg-haccare-teal hover:bg-haccare-teal-dark text-white disabled:opacity-50 transition-colors"
          title="Save name"
          aria-label="Save name"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={saving}
          className="p-1 rounded text-gray-500 hover:bg-gray-100 transition-colors"
          title="Cancel"
          aria-label="Cancel rename"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
};
