import React, { useState, useRef, useEffect } from 'react';
import { Package, X, ChevronDown } from 'lucide-react';
import type { CatalogEntry } from '../../../../services/clinical/medicationService';

export type { CatalogEntry };

interface CatalogMedicationPickerProps {
  catalog: CatalogEntry[];
  selected: CatalogEntry | null;
  onSelect: (entry: CatalogEntry) => void;
  onClear: () => void;
  isLoading?: boolean;
}

export const CatalogMedicationPicker: React.FC<CatalogMedicationPickerProps> = ({
  catalog,
  selected,
  onSelect,
  onClear,
  isLoading = false,
}) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = search.trim().length === 0
    ? catalog
    : catalog.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.barcode.toLowerCase().includes(search.toLowerCase()) ||
        (e.generic_name?.toLowerCase().includes(search.toLowerCase()) ?? false)
      );

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (selected) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
        <Package className="h-4 w-4 text-green-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-800 truncate">{selected.name}</p>
          <p className="text-xs text-green-600">
            <span className="font-mono">{selected.barcode}</span>
            {' · '}{selected.strength}{' · '}{selected.formulation}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="flex-shrink-0 text-green-600 hover:text-green-800 p-1 rounded"
          title="Clear catalog selection (switch to free entry)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={isLoading ? 'Loading catalog…' : 'Search catalog (optional)…'}
          disabled={isLoading}
          className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
        />
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>

      {open && !isLoading && filtered.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {filtered.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(entry);
                  setSearch('');
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 flex items-start gap-2 border-b border-gray-100 last:border-0"
              >
                <span className="inline-block bg-blue-100 text-blue-700 text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                  {entry.barcode}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-gray-900 truncate">{entry.name}</span>
                  <span className="block text-xs text-gray-500">
                    {entry.strength} · {entry.formulation}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !isLoading && filtered.length === 0 && search.trim().length > 0 && (
        <div className="absolute z-20 left-0 right-0 mt-1 p-3 bg-white border border-gray-200 rounded-lg shadow-lg text-sm text-gray-500">
          No catalog matches — enter manually below
        </div>
      )}
    </div>
  );
};
