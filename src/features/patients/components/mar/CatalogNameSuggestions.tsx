import React from 'react';
import { Package } from 'lucide-react';

import { catalogDisplayName, type CatalogEntry } from '../../../../services/clinical/medicationService';
import { findCatalogSuggestions } from '../../utils/catalogSuggestions';

interface CatalogNameSuggestionsProps {
  name: string;
  catalog: CatalogEntry[];
  selected: CatalogEntry | null;
  onSelect: (entry: CatalogEntry) => void;
}

/** Catalog entries matching a typed medication name, so a free-entry name can be linked in one click. */
export const CatalogNameSuggestions: React.FC<CatalogNameSuggestionsProps> = ({ name, catalog, selected, onSelect }) => {
  if (selected) return null;
  const suggestions = findCatalogSuggestions(name, catalog);
  if (suggestions.length === 0) return null;

  return (
    <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-2">
      <p className="px-1 pb-1 text-xs font-medium text-blue-800">
        In the medication catalog: select one so the pre-printed label scans
      </p>
      <ul className="space-y-1">
        {suggestions.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => onSelect(entry)}
              className="flex w-full items-center gap-2 rounded-md bg-white px-2 py-1.5 text-left hover:bg-blue-100"
            >
              <Package className="h-3.5 w-3.5 flex-shrink-0 text-blue-600" />
              <span className="flex-shrink-0 rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs text-blue-700">
                {entry.barcode}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-gray-900">{catalogDisplayName(entry)}</span>
              <span className="flex-shrink-0 text-xs text-gray-500">
                {entry.strength} · {entry.formulation}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
