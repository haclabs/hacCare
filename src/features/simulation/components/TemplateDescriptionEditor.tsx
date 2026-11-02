import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { updateSimulationTemplate } from '../../../services/simulation/simulationService';
import { secureLogger } from '../../../lib/security/secureLogger';

interface TemplateDescriptionEditorProps {
  templateId: string;
  description: string | null;
  onSaved: (description: string | null) => void;
}

const TemplateDescriptionEditor: React.FC<TemplateDescriptionEditorProps> = ({ templateId, description, onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setDraft(description ?? '');
    setError(null);
    setEditing(true);
  };

  const handleSave = async () => {
    const next = draft.trim() || null;
    setSaving(true);
    setError(null);
    try {
      await updateSimulationTemplate(templateId, { description: next });
      onSaved(next);
      setEditing(false);
    } catch (err) {
      secureLogger.error('Error saving template description:', err);
      setError('Could not save the description. You may not have permission to edit this template.');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex items-start gap-2">
        {description ? (
          <p className="text-sm text-gray-700 leading-relaxed flex-1 whitespace-pre-line">{description}</p>
        ) : (
          <p className="text-sm text-gray-400 italic flex-1">No description provided.</p>
        )}
        <button
          type="button"
          onClick={startEditing}
          className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors"
          title="Edit description"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        autoFocus
        disabled={saving}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-haccare-mint"
        placeholder="Brief description of the simulation scenario..."
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 text-xs font-medium bg-haccare-teal hover:bg-haccare-teal-dark text-white rounded-lg disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={saving}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default TemplateDescriptionEditor;
