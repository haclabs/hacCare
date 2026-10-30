import React from 'react';
import { Lock } from 'lucide-react';

import { CatalogMedicationPicker } from './CatalogMedicationPicker';
import { CatalogNameSuggestions } from './CatalogNameSuggestions';
import { NotInCatalogNote } from './NotInCatalogConfirmation';
import { SlidingScaleEditor } from './SlidingScaleEditor';
import { TimeInput } from './TimeInput';
import type { MedicationEntryForm } from './useMedicationEntryForm';
import {
  CATEGORY_OPTIONS,
  FREQUENCY_OPTIONS,
  ROUTE_OPTIONS,
  withCurrentValue,
} from '../../utils/medicationFormOptions';

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';

/**
 * Catalog lookup, barcode, dose, route, frequency and schedule fields for one medication.
 * Rendered inside the caller's <form>; state lives in useMedicationEntryForm.
 * `showNotInCatalogNote` is for students, who get an inline note instead of the save-time dialog.
 */
export const MedicationEntryFields: React.FC<{ entry: MedicationEntryForm; showNotInCatalogNote?: boolean }> = ({
  entry,
  showNotInCatalogNote = false,
}) => {
  const { form, updateField } = entry;

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Catalog Lookup</label>
        <CatalogMedicationPicker
          catalog={entry.catalog}
          selected={entry.selectedCatalog}
          onSelect={entry.selectCatalog}
          onClear={entry.clearCatalog}
          isLoading={entry.catalogLoading}
        />
        <p className="text-xs text-gray-400 mt-1">
          Select from catalog for a stable QR barcode, or fill in manually below
        </p>
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
          <Lock className="h-3.5 w-3.5 text-gray-400" />
          QR Barcode
        </label>
        <input
          type="text"
          value={form.barcode ?? ''}
          readOnly
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-500 font-mono text-sm cursor-not-allowed select-all"
        />
        <p className="text-xs text-gray-400 mt-1">
          {form.catalog_id
            ? 'Catalog barcode — stable across resets'
            : 'Auto-assigned — locked to prevent duplicate scanning'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Medication Name *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => entry.changeName(e.target.value)}
          required
          className={inputClass}
          placeholder="Enter medication name"
        />
        <CatalogNameSuggestions
          name={form.name}
          catalog={entry.catalog}
          selected={entry.selectedCatalog}
          onSelect={entry.selectCatalog}
        />
      </div>

      {showNotInCatalogNote && !form.catalog_id && form.name.trim() && <NotInCatalogNote />}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
        <select
          value={form.category}
          onChange={(e) => updateField('category', e.target.value)}
          required
          className={inputClass}
        >
          <option value="">Select category</option>
          {withCurrentValue(CATEGORY_OPTIONS, form.category).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {form.category === 'diabetic' && (
        <SlidingScaleEditor rows={entry.scaleRows} onChange={entry.setScaleRows} />
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {entry.labelStrength ? 'Label strength (on MAR) *' : 'Dosage *'}
        </label>
        <input
          type="text"
          value={form.dosage}
          onChange={(e) => updateField('dosage', e.target.value)}
          required
          className={inputClass}
          placeholder={entry.labelStrength ? 'e.g., 25 mg (per tablet), 10 mg/mL' : 'e.g., 10mg, 5ml'}
        />
        {entry.labelStrength ? (
          <p className="text-xs text-gray-500 mt-1">
            Strength printed on the package — students work out how much to give from the ordered dose
          </p>
        ) : entry.selectedCatalog && (
          <p className="text-xs text-gray-500 mt-1">
            Catalog product: {entry.selectedCatalog.strength} {entry.selectedCatalog.formulation} — enter
            the ordered dose
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Route *</label>
        <select
          value={form.route}
          onChange={(e) => updateField('route', e.target.value)}
          required
          className={inputClass}
        >
          <option value="">Select route</option>
          {withCurrentValue(ROUTE_OPTIONS, form.route).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Frequency *</label>
        <select
          value={form.frequency}
          onChange={(e) => updateField('frequency', e.target.value)}
          required
          className={inputClass}
        >
          <option value="">Select frequency</option>
          {withCurrentValue(FREQUENCY_OPTIONS, form.frequency).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-blue-700 mb-3">
          ⏰ Administration {entry.isMultiTime ? 'Times' : 'Time'} *{' '}
          {!entry.isMultiTime && <span className="text-gray-500 font-normal">(24-hour format)</span>}
        </label>
        {entry.isMultiTime ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {form.admin_times.map((time, i) => (
              <div key={i} className="space-y-1">
                <label className="text-xs text-blue-600 font-medium">
                  Time {i + 1} <span className="text-gray-500">(24h)</span>
                </label>
                <TimeInput value={time} onChange={(v) => entry.updateAdminTime(i, v)} />
              </div>
            ))}
          </div>
        ) : (
          <TimeInput value={form.admin_time} onChange={(v) => updateField('admin_time', v)} />
        )}
        <p className="text-xs text-blue-600 mt-3 font-medium">
          🔔 Enter time in 24-hour format (e.g., 08:00, 14:30) • Used for alerts and BCMA validation
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => updateField('start_date', e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Optional)</label>
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => updateField('end_date', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
    </>
  );
};
