import { useEffect, useState } from 'react';

import type { Medication } from '../../../../types';
import { fetchMedicationCatalog, catalogDisplayName } from '../../../../services/clinical/medicationService';
import type { CatalogEntry } from './CatalogMedicationPicker';
import { fromDraftRows, toDraftRows, type SlidingScaleDraftRow } from '../../utils/slidingScale';
import {
  dosesPerDay,
  generateFreeEntryBarcode,
  mapCatalogCategory,
  mapCatalogRoute,
  normalizeRoute,
} from '../../utils/medicationFormOptions';
import { calculateNextDue } from './medicationSchedule';
import { todayLocalISODate } from '../../utils/localDate';
import { secureLogger } from '../../../../lib/security/secureLogger';

export interface MedicationEntryState {
  name: string;
  category: string;
  dosage: string;
  route: string;
  frequency: string;
  admin_time: string;
  admin_times: string[];
  start_date: string;
  end_date: string;
  catalog_id: string | null;
  barcode: string | null;
}

/** Medication columns the shared entry fields produce (prescriber, status, delay are the caller's). */
export type MedicationEntryFields = Pick<
  Medication,
  | 'name'
  | 'dosage'
  | 'route'
  | 'frequency'
  | 'category'
  | 'start_date'
  | 'end_date'
  | 'admin_time'
  | 'admin_times'
  | 'catalog_id'
  | 'barcode'
  | 'sliding_scale'
>;

const DEFAULT_TIMES = ['08:00', '14:00', '20:00', '02:00'];

function blankState(): MedicationEntryState {
  return {
    name: '',
    category: '',
    dosage: '',
    route: '',
    frequency: '1 time daily',
    admin_time: '08:00',
    admin_times: ['08:00'],
    start_date: todayLocalISODate(),
    end_date: '',
    catalog_id: null,
    barcode: generateFreeEntryBarcode(''),
  };
}

function stateFromMedication(medication: Medication): MedicationEntryState {
  const expectedCount = dosesPerDay(medication.frequency) || 1;
  let adminTimes = medication.admin_times || [medication.admin_time || '08:00'];
  if (!medication.admin_times || adminTimes.length !== expectedCount) {
    if (expectedCount > 1) {
      adminTimes = DEFAULT_TIMES.slice(0, expectedCount);
      if (medication.admin_time) adminTimes[0] = medication.admin_time;
    }
  }
  return {
    name: medication.name,
    category: medication.category || 'scheduled',
    dosage: medication.dosage,
    route: normalizeRoute(medication.route),
    frequency: medication.frequency,
    admin_time: medication.admin_time || '08:00',
    admin_times: adminTimes,
    start_date: medication.start_date.split('T')[0],
    end_date: medication.end_date ? medication.end_date.split('T')[0] : '',
    catalog_id: medication.catalog_id ?? null,
    barcode: medication.barcode ?? (medication.catalog_id ? null : generateFreeEntryBarcode(medication.name)),
  };
}

export function isMultiTimeFrequency(frequency: string): boolean {
  return (
    (frequency.includes('time daily') || frequency.includes('times daily')) &&
    !frequency.includes('PRN') &&
    !frequency.includes('One Time Admin')
  );
}

/**
 * State and handlers for the medication fields shared by the MAR "Add Medication" form and
 * medication doctors' orders. Pass an existing medication to edit it.
 *
 * With `labelStrength`, dosage holds the package strength (e.g. 25 mg per tablet) and is filled
 * from the catalog; the ordered dose lives on the doctors' order instead.
 */
export function useMedicationEntryForm(initial?: Medication | null, { labelStrength = false } = {}) {
  const [form, setForm] = useState<MedicationEntryState>(() =>
    initial ? stateFromMedication(initial) : blankState()
  );
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogEntry | null>(null);
  const [scaleRows, setScaleRows] = useState<SlidingScaleDraftRow[]>(() =>
    toDraftRows(initial?.sliding_scale ?? null)
  );

  const initialCatalogId = initial?.catalog_id ?? null;
  useEffect(() => {
    fetchMedicationCatalog()
      .then((entries) => {
        setCatalog(entries);
        if (initialCatalogId) {
          setSelectedCatalog(entries.find((e) => e.id === initialCatalogId) ?? null);
        }
      })
      .catch((err) => secureLogger.error('Failed to load medication catalog', err))
      .finally(() => setCatalogLoading(false));
  }, [initialCatalogId]);

  const selectCatalog = (entry: CatalogEntry) => {
    setSelectedCatalog(entry);
    setForm((prev) => ({
      ...prev,
      name: catalogDisplayName(entry),
      route: mapCatalogRoute(entry.route) || prev.route,
      category: mapCatalogCategory(entry.category) || prev.category,
      catalog_id: entry.id,
      barcode: entry.barcode,
      ...(labelStrength && entry.strength ? { dosage: entry.strength } : {}),
    }));
  };

  const clearCatalog = () => {
    setSelectedCatalog(null);
    setForm((prev) => ({ ...prev, catalog_id: null, barcode: generateFreeEntryBarcode(prev.name) }));
  };

  /** Typing a different name after picking from the catalog detaches the catalog entry. */
  const changeName = (name: string) => {
    if (selectedCatalog && name !== catalogDisplayName(selectedCatalog)) {
      setSelectedCatalog(null);
      setForm((prev) => ({ ...prev, name, catalog_id: null, barcode: generateFreeEntryBarcode(name) }));
    } else {
      setForm((prev) => ({ ...prev, name }));
    }
  };

  const updateField = (field: keyof MedicationEntryState, value: string) => {
    if (field === 'frequency') {
      const match = value.match(/(\d+) times?/);
      const count = match ? parseInt(match[1]) : 1;
      setForm((prev) => {
        const newTimes = count > 1 ? DEFAULT_TIMES.slice(0, count) : [prev.admin_time || '08:00'];
        return { ...prev, frequency: value, admin_times: newTimes, admin_time: newTimes[0] };
      });
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  const updateAdminTime = (index: number, time: string) => {
    setForm((prev) => {
      const newTimes = [...prev.admin_times];
      newTimes[index] = time;
      return { ...prev, admin_times: newTimes, admin_time: newTimes[0] };
    });
  };

  /** Validated medication columns ready for create/update, or an error message. */
  const buildFields = (): { fields: MedicationEntryFields; error: null } | { fields: null; error: string } => {
    if (!form.name || !form.category || !form.dosage || !form.route || !form.start_date) {
      return { fields: null, error: 'Please fill in all required medication fields' };
    }
    const { scale, error } =
      form.category === 'diabetic' ? fromDraftRows(scaleRows) : { scale: null, error: null };
    if (error) return { fields: null, error };
    return {
      fields: {
        name: form.name,
        dosage: form.dosage,
        route: form.route,
        frequency: form.frequency,
        category: form.category as Medication['category'],
        start_date: form.start_date,
        end_date: form.end_date || undefined,
        admin_time: form.admin_time,
        admin_times: form.admin_times.length > 1 ? form.admin_times : null,
        catalog_id: form.catalog_id,
        barcode: form.barcode,
        sliding_scale: scale,
      },
      error: null,
    };
  };

  /** next_due for a brand-new medication (updates let medicationService recalculate it). */
  const initialNextDue = () =>
    form.category === 'prn' || form.category === 'stat'
      ? new Date().toISOString()
      : calculateNextDue(form.frequency, form.start_date, form.admin_time, form.admin_times);

  return {
    form,
    catalog,
    catalogLoading,
    selectedCatalog,
    scaleRows,
    setScaleRows,
    selectCatalog,
    clearCatalog,
    changeName,
    updateField,
    updateAdminTime,
    buildFields,
    initialNextDue,
    isMultiTime: isMultiTimeFrequency(form.frequency),
    labelStrength,
  };
}

export type MedicationEntryForm = ReturnType<typeof useMedicationEntryForm>;
