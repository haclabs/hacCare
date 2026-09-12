/**
 * ===========================================================================
 * TEMPLATE STATES MODAL
 * ===========================================================================
 * Lists the named states saved for a template (e.g. "Week 1", "Week 2"),
 * saved via TemplateEditingBanner's "Save as New State" option. Lets an
 * instructor rename/edit the changelog note or delete a state. Selecting
 * which state to load happens later, in the Active Simulations reset modal.
 * ===========================================================================
 */

import React, { useState, useEffect } from 'react';
import { X, Layers, Trash2, Pencil, Check, Loader2 } from 'lucide-react';
import { getTemplateStates, updateTemplateState, deleteTemplateState } from '../../../services/simulation/simulationService';
import { formatDistanceToNow } from 'date-fns';
import { secureLogger } from '../../../lib/security/secureLogger';

interface TemplateState {
  id: string;
  label: string;
  changelog_note: string | null;
  sort_order: number;
  created_at: string;
  created_by: string | null;
}

interface Props {
  templateId: string;
  templateName: string;
  onClose: () => void;
}

export const TemplateStatesModal: React.FC<Props> = ({ templateId, templateName, onClose }) => {
  const [states, setStates] = useState<TemplateState[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editNote, setEditNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getTemplateStates(templateId);
      setStates(data);
    } catch (error) {
      secureLogger.error('Error loading template states:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const startEdit = (state: TemplateState) => {
    setEditingId(state.id);
    setEditLabel(state.label);
    setEditNote(state.changelog_note || '');
  };

  const saveEdit = async (stateId: string) => {
    if (!editLabel.trim()) return;
    setBusyId(stateId);
    try {
      await updateTemplateState(stateId, { label: editLabel.trim(), changelog_note: editNote.trim() || undefined });
      setEditingId(null);
      await load();
    } catch (error) {
      secureLogger.error('Error updating template state:', error);
      alert('Failed to update state');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (state: TemplateState) => {
    if (!confirm(`Delete state "${state.label}"? This cannot be undone.`)) return;
    setBusyId(state.id);
    try {
      await deleteTemplateState(state.id);
      await load();
    } catch (error) {
      secureLogger.error('Error deleting template state:', error);
      alert('Failed to delete state');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Layers className="h-4 w-4 text-purple-600" />
            States — {templateName}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : states.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-8">
              No named states yet. Save one from the "Save & Exit" menu while editing this template.
            </p>
          ) : (
            states.map((state) => (
              <div key={state.id} className="border border-gray-200 rounded-lg p-3">
                {editingId === state.id ? (
                  <div className="space-y-2">
                    <input
                      autoFocus
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm bg-white text-gray-900 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                    <textarea
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      rows={2}
                      placeholder="Changelog note…"
                      className="w-full px-2 py-1.5 text-xs bg-white text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(state.id)}
                        disabled={busyId === state.id || !editLabel.trim()}
                        className="flex-1 px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-md flex items-center justify-center gap-1"
                      >
                        <Check className="h-3 w-3" />
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{state.label}</p>
                      {state.changelog_note && (
                        <p className="text-xs text-gray-500 mt-0.5">{state.changelog_note}</p>
                      )}
                      <p className="text-[11px] text-gray-400 mt-1">
                        Saved {formatDistanceToNow(new Date(state.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => startEdit(state)}
                        className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                        title="Rename / edit note"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(state)}
                        disabled={busyId === state.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                        title="Delete state"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateStatesModal;
