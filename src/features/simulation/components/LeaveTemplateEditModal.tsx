import React from 'react';
import { AlertTriangle, Loader2, Save, X } from 'lucide-react';

interface LeaveTemplateEditModalProps {
  templateName: string;
  destinationLabel: string;
  saving: boolean;
  onSaveAndContinue: () => void;
  onStay: () => void;
}

/** Shown when an instructor in template edit mode clicks a sidebar item that would leave the template's patients. */
export const LeaveTemplateEditModal: React.FC<LeaveTemplateEditModalProps> = ({
  templateName,
  destinationLabel,
  saving,
  onSaveAndContinue,
  onStay,
}) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full text-gray-800">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          You're still editing a template
        </h3>
        <button onClick={onStay} disabled={saving} className="text-gray-400 hover:text-gray-600" aria-label="Stay">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-sm text-gray-600">
          You're editing <span className="font-semibold text-gray-900">{templateName}</span>. Save and exit the
          template before going to <span className="font-semibold text-gray-900">{destinationLabel}</span>, otherwise
          you'll stay inside the template and your changes won't be saved to it.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onStay}
            disabled={saving}
            className="flex-1 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-lg transition-colors"
          >
            Stay & Keep Editing
          </button>
          <button
            onClick={onSaveAndContinue}
            disabled={saving}
            className="flex-1 px-4 py-2 text-sm bg-haccare-teal hover:bg-haccare-teal-dark disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save & Exit Template
          </button>
        </div>
      </div>
    </div>
  </div>
);
