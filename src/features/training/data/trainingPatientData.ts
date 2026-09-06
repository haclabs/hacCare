/**
 * Training BCMA sandbox — fixed practice patient + real catalog medications.
 *
 * The patient is a client-side mock only (never written to the database), but
 * its patient_id barcode is a permanently reserved code so a physical wristband
 * can be printed and scanned against it (real system-generated patient
 * barcodes are always 5 digits in the 10000-99999 range, so "00001" can never
 * collide — see generatePatientBarcode() in bcmaService.ts).
 *
 * Medications are real global catalog entries (medications_catalog, tenant_id
 * IS NULL) so their barcode field matches physical QR labels already printed
 * for the catalog — one entry per medication category.
 */

import { supabase } from '../../../lib/api/supabase';
import { secureLogger } from '../../../lib/security/secureLogger';
import type { Patient, Medication } from '../../../types';

export const TRAINING_PATIENT_ID = 'P00001';

export const TRAINING_MEDICATION_CATEGORIES = ['prn', 'scheduled', 'diabetic', 'continuous', 'stat'] as const;
export type TrainingMedicationCategory = typeof TRAINING_MEDICATION_CATEGORIES[number];

const DEFAULT_FREQUENCY: Record<TrainingMedicationCategory, string> = {
  prn: 'Every 4 hours PRN',
  scheduled: 'Twice daily',
  diabetic: 'Before meals',
  continuous: 'Continuous infusion',
  stat: 'Once',
};

interface GlobalCatalogRow {
  id: string;
  barcode: string;
  name: string;
  strength: string;
  route: string;
  category: string;
}

export function buildTrainingPatient(): Patient {
  return {
    id: 'training-sandbox-patient',
    patient_id: TRAINING_PATIENT_ID,
    tenant_id: undefined,
    first_name: 'Training',
    last_name: 'Patient',
    date_of_birth: '1990-01-01',
    gender: 'Other',
    room_number: 'TR',
    bed_number: '1',
    admission_date: new Date().toISOString(),
    condition: 'Stable',
    diagnosis: 'BCMA Practice Sandbox',
    allergies: [],
    blood_type: 'O+',
    emergency_contact_name: 'N/A',
    emergency_contact_relationship: 'N/A',
    emergency_contact_phone: 'N/A',
    vitals: [],
    notes: [],
  };
}

/** Fetch one real global catalog medication per category to build the practice medication list. */
export async function fetchTrainingMedications(): Promise<Medication[]> {
  const { data, error } = await supabase
    .from('medications_catalog')
    .select('id, barcode, name, strength, route, category')
    .is('tenant_id', null)
    .eq('is_active', true)
    .order('display_order', { ascending: true, nullsFirst: false });

  if (error) {
    secureLogger.error('Error fetching training catalog medications', error);
    throw error;
  }

  const rows = (data || []) as GlobalCatalogRow[];
  const now = new Date().toISOString();

  return TRAINING_MEDICATION_CATEGORIES.reduce<Medication[]>((acc, category) => {
    const entry = rows.find(r => r.category === category);
    if (!entry) return acc; // No catalog entry seeded for this category yet — skip it

    acc.push({
      id: `training-med-${category}`,
      patient_id: TRAINING_PATIENT_ID,
      name: entry.name,
      category: category as Medication['category'],
      dosage: entry.strength,
      frequency: DEFAULT_FREQUENCY[category],
      route: entry.route,
      start_date: now,
      prescribed_by: 'Training Program',
      last_administered: undefined,
      next_due: now,
      status: 'Active',
      catalog_id: entry.id,
      barcode: entry.barcode,
    });
    return acc;
  }, []);
}
