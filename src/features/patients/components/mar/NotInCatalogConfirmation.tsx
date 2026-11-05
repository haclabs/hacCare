import React, { useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';

import { CATALOG_SUPPORT_EMAIL } from '../../utils/catalogSuggestions';

const supportLink = (
  <a href={`mailto:${CATALOG_SUPPORT_EMAIL}`} className="font-medium underline">
    {CATALOG_SUPPORT_EMAIL}
  </a>
);

interface NotInCatalogDialogProps {
  medicationName: string;
  onChooseFromCatalog: () => void;
  onSaveAnyway: () => void;
}

/** Confirms saving a free-entry medication, whose barcode matches no pre-printed catalog label. */
export const NotInCatalogDialog: React.FC<NotInCatalogDialogProps> = ({ medicationName, onChooseFromCatalog, onSaveAnyway }) => {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div role="alertdialog" aria-modal="true" aria-labelledby="not-in-catalog-title" className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 dark:bg-amber-900/40 p-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 id="not-in-catalog-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              Not in the medication catalog
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              <strong>{medicationName || 'This medication'}</strong> wasn't selected from the catalog, so it gets a
              barcode of its own.
            </p>
          </div>
        </div>

        <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
          <li>No pre-printed catalog label will scan for it at the bedside.</li>
          <li>You must print its label from this template or simulation and keep it with that simulation's labels.</li>
        </ul>

        <p className="mb-4 rounded-md bg-gray-50 dark:bg-gray-700/50 p-3 text-sm text-gray-700 dark:text-gray-300">
          Please select an existing medication from the catalog, or email {supportLink} to have this medication added
          to the catalog.
        </p>

        <label className="mb-5 flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600"
          />
          I understand this medication needs its own printed label and won't scan with catalog label stock.
        </label>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onChooseFromCatalog}
            className="flex-1 rounded-lg bg-haccare-teal px-4 py-2 text-white transition-colors hover:bg-haccare-teal-dark"
          >
            Choose from catalog
          </button>
          <button
            type="button"
            onClick={onSaveAnyway}
            disabled={!acknowledged}
            className="flex-1 rounded-lg border border-amber-300 dark:border-amber-700 px-4 py-2 text-amber-800 dark:text-amber-200 transition-colors hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save anyway
          </button>
        </div>
      </div>
    </div>
  );
};

/** Inline note for students, who shouldn't be stopped by a dialog mid-scenario. */
export const NotInCatalogNote: React.FC = () => (
  <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-200">
    <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
    <p>
      This medication isn't from the catalog, so its label won't scan until one is printed for it. Select it in the
      catalog lookup if it's listed, otherwise let your instructor know.
    </p>
  </div>
);
