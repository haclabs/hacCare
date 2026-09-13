/**
 * Basic Field Components for Dynamic Forms
 */

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Info, Package, Plus, X } from 'lucide-react';
import { FieldError, FieldWarning } from '../../../types/schema';
import { fetchMedicationCatalog, CatalogEntry } from '../../../services/clinical/medicationService';
import { secureLogger } from '../../../lib/security/secureLogger';

interface ProcessedField {
  name: string;
  type: string;
  title: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  visible?: boolean;
  validation?: any;
  options?: any;
}

interface BaseFieldProps {
  field: ProcessedField;
  value: any;
  onChange: (value: any) => void;
  error?: FieldError;
  warning?: FieldWarning;
  disabled?: boolean;
  required?: boolean;
}

export const StringField: React.FC<BaseFieldProps> = ({
  field,
  value = '',
  onChange,
  error,
  warning,
  disabled = false,
  required = false
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-900">
        {field.title}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        readOnly={disabled}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          disabled ? 'bg-gray-100 cursor-not-allowed text-gray-600' : ''
        }`}
        placeholder={field.description}
      />
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>{error.message}</span>
        </div>
      )}
      {warning && (
        <div className="flex items-center space-x-2 text-yellow-600 text-sm">
          <Info className="h-4 w-4" />
          <span>{warning.message}</span>
        </div>
      )}
    </div>
  );
};

export const NumberField: React.FC<BaseFieldProps> = ({
  field,
  value,
  onChange,
  error,
  warning,
  disabled = false,
  required = false
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-900">
        {field.title}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(parseFloat(e.target.value) || null)}
        disabled={disabled}
        min={field.validation?.min}
        max={field.validation?.max}
        step={field.validation?.step || 'any'}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder={field.description}
      />
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>{error.message}</span>
        </div>
      )}
      {warning && (
        <div className="flex items-center space-x-2 text-yellow-600 text-sm">
          <Info className="h-4 w-4" />
          <span>{warning.message}</span>
        </div>
      )}
    </div>
  );
};

export const BooleanField: React.FC<BaseFieldProps> = ({
  field,
  value = false,
  onChange,
  error,
  disabled = false
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label className="text-sm font-medium text-gray-900">
          {field.title}
        </label>
      </div>
      {field.description && (
        <p className="text-sm text-gray-600">{field.description}</p>
      )}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>{error.message}</span>
        </div>
      )}
    </div>
  );
};

export const SelectField: React.FC<BaseFieldProps> = ({
  field,
  value = '',
  onChange,
  error,
  warning,
  disabled = false,
  required = false
}) => {
  const options = field.options || [];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-900">
        {field.title}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Select an option...</option>
        {options.map((option: any, index: number) => (
          <option key={index} value={option.value || option}>
            {option.label || option}
          </option>
        ))}
      </select>
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>{error.message}</span>
        </div>
      )}
      {warning && (
        <div className="flex items-center space-x-2 text-yellow-600 text-sm">
          <Info className="h-4 w-4" />
          <span>{warning.message}</span>
        </div>
      )}
    </div>
  );
};

export const DateField: React.FC<BaseFieldProps> = ({
  field,
  value = '',
  onChange,
  error,
  warning,
  disabled = false,
  required = false
}) => {
  const inputType = field.type === 'datetime' ? 'datetime-local' : 
                   field.type === 'time' ? 'time' : 'date';

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-900">
        {field.title}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>{error.message}</span>
        </div>
      )}
      {warning && (
        <div className="flex items-center space-x-2 text-yellow-600 text-sm">
          <Info className="h-4 w-4" />
          <span>{warning.message}</span>
        </div>
      )}
    </div>
  );
};

export const TextAreaField: React.FC<BaseFieldProps> = ({
  field,
  value = '',
  onChange,
  error,
  warning,
  disabled = false,
  required = false
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-900">
        {field.title}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={4}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder={field.description}
      />
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>{error.message}</span>
        </div>
      )}
      {warning && (
        <div className="flex items-center space-x-2 text-yellow-600 text-sm">
          <Info className="h-4 w-4" />
          <span>{warning.message}</span>
        </div>
      )}
    </div>
  );
};

// Multi-entry medication list backed by the medications catalog, with a free-text fallback
// for medications that aren't in the catalog.
export const MedicationLookupField: React.FC<BaseFieldProps> = ({
  field,
  value,
  onChange,
  error,
  warning,
  disabled = false,
  required = false
}) => {
  const items: string[] = Array.isArray(value) ? value : (typeof value === 'string' && value ? [value] : []);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMedicationCatalog()
      .then((data) => { if (!cancelled) setCatalog(data); })
      .catch((err) => secureLogger.error('Failed to load medication catalog', err))
      .finally(() => { if (!cancelled) setCatalogLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = search.trim().length === 0
    ? []
    : catalog.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        (e.generic_name?.toLowerCase().includes(search.toLowerCase()) ?? false)
      ).slice(0, 8);

  const addMedication = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || items.includes(trimmed)) { setSearch(''); setOpen(false); return; }
    onChange([...items, trimmed]);
    setSearch('');
    setOpen(false);
  };

  const removeMedication = (name: string) => {
    onChange(items.filter((m) => m !== name));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-900">
        {field.title}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.description && <p className="text-xs text-gray-500">{field.description}</p>}

      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((med) => (
            <span key={med} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              {med}
              {!disabled && (
                <button type="button" onClick={() => removeMedication(med)} className="hover:text-blue-900" title={`Remove ${med}`}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {!disabled && (
        <div ref={containerRef} className="relative">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addMedication(search); }
                }}
                placeholder={catalogLoading ? 'Loading catalog…' : 'Search catalog or type a medication…'}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={() => addMedication(search)}
              disabled={!search.trim()}
              className="px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>

          {open && filtered.length > 0 && (
            <ul className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
              {filtered.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); addMedication(`${entry.name} ${entry.strength}`.trim()); }}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-start gap-2 border-b border-gray-100 last:border-0"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-gray-900 truncate">{entry.name}</span>
                      <span className="block text-xs text-gray-500">{entry.strength} · {entry.formulation}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {open && !catalogLoading && search.trim().length > 0 && filtered.length === 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 p-2.5 bg-white border border-gray-200 rounded-lg shadow-lg text-xs text-gray-500">
              No catalog matches — press Enter or Add to use this as free text
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>{error.message}</span>
        </div>
      )}
      {warning && (
        <div className="flex items-center space-x-2 text-yellow-600 text-sm">
          <Info className="h-4 w-4" />
          <span>{warning.message}</span>
        </div>
      )}
    </div>
  );
};

export const BodyDiagramField: React.FC<BaseFieldProps> = (props) => {
  return (
    <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg">
      <p className="text-gray-600">Body Diagram Field - To be implemented</p>
      <StringField {...props} />
    </div>
  );
};

export const PainScaleField: React.FC<BaseFieldProps> = ({
  field,
  value = 0,
  onChange,
  error,
  disabled = false,
  required = false
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-900">
        {field.title}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex items-center space-x-4">
        <input
          type="range"
          min="0"
          max="10"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
          className="flex-1"
        />
        <span className={`text-lg font-medium px-3 py-1 rounded ${
          value >= 7 ? 'text-red-600 bg-red-100' :
          value >= 4 ? 'text-yellow-600 bg-yellow-100' :
          'text-green-600 bg-green-100'
        }`}>
          {value}
        </span>
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>No Pain</span>
        <span>Worst Pain</span>
      </div>
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>{error.message}</span>
        </div>
      )}
    </div>
  );
};

export { VitalSignsField } from './VitalSignsField';
