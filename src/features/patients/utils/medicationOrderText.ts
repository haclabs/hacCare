import type { Medication } from '../types/clinical';

type OrderTextSource = Pick<Medication, 'name' | 'dosage' | 'route' | 'frequency' | 'category'> & {
  admin_time?: string | null;
  admin_times?: string[] | null;
};

const UNSCHEDULED_CATEGORIES = new Set(['prn', 'stat', 'continuous']);

/**
 * Default doctors' order wording for a medication, e.g.
 * "Metoprolol 25 mg Oral — 2 times daily (08:00, 20:00)". The instructor can then add
 * hold parameters or other instructions on the following lines.
 */
export function composeMedicationOrderText(med: OrderTextSource): string {
  const drug = [med.name, med.dosage, med.route].map((part) => part?.trim()).filter(Boolean).join(' ');
  if (!drug) return '';

  let schedule = med.frequency?.trim() ?? '';
  if (schedule && !UNSCHEDULED_CATEGORIES.has(med.category ?? '')) {
    const times = med.admin_times?.length ? med.admin_times : med.admin_time ? [med.admin_time] : [];
    if (times.length) schedule += ` (${times.join(', ')})`;
  }
  return schedule ? `${drug} — ${schedule}` : drug;
}
