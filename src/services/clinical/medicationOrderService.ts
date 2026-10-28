/**
 * Medication doctors' orders: a doctors_orders row that also owns a MAR entry.
 *
 * The pair share order_link_key (see migration 20261028195855 for why it is not a foreign key).
 * Editing the order updates its MAR entry; deleting the order deletes the MAR entry.
 */

import { supabase } from '../../lib/api/supabase';
import type { DoctorsOrder, Medication } from '../../types';
import { secureLogger } from '../../lib/security/secureLogger';
import {
  createDoctorsOrder,
  deleteDoctorsOrder,
  updateDoctorsOrder,
  type CreateDoctorsOrderData,
  type UpdateDoctorsOrderData,
} from './doctorsOrdersService';
import { stripDoctorTitle } from '../../features/patients/utils/doctorName';
import { createMedication, deleteMedication, fetchPatientMedications, updateMedication } from './medicationService';

/** MAR columns supplied by the order form; status, prescriber and release delay come from the order. */
export type MedicationOrderDetails = Omit<
  Medication,
  'id' | 'patient_id' | 'status' | 'prescribed_by' | 'release_after_minutes' | 'order_link_key' | 'next_due'
> & { next_due: string };

/** The parts of a medication order the MAR and BCMA display next to the linked medication. */
export type LinkedMedicationOrder = Pick<
  DoctorsOrder,
  'id' | 'order_text' | 'ordering_doctor' | 'order_date' | 'order_time' | 'notes' | 'order_type' | 'ordered_dose'
> & { order_link_key: string };

export const prescriberFromOrder = (orderingDoctor: string) => `Dr. ${stripDoctorTitle(orderingDoctor)}`;

export async function fetchLinkedMedication(order: DoctorsOrder): Promise<Medication | null> {
  if (!order.order_link_key) return null;
  const meds = await fetchPatientMedications(order.patient_id);
  return meds.find((m) => m.order_link_key === order.order_link_key) ?? null;
}

export async function fetchLinkedMedicationOrders(
  patientId: string,
  tenantId: string
): Promise<LinkedMedicationOrder[]> {
  const { data, error } = await supabase
    .from('doctors_orders')
    .select('id, order_link_key, order_text, ordering_doctor, order_date, order_time, notes, order_type, ordered_dose')
    .eq('tenant_id', tenantId)
    .eq('patient_id', patientId)
    .not('order_link_key', 'is', null);

  if (error) {
    // Column missing until the migration is deployed — the MAR simply shows no linked orders
    secureLogger.warn('Could not load medication orders for the MAR:', error);
    return [];
  }
  return (data ?? []) as LinkedMedicationOrder[];
}

export async function createMedicationOrder(
  orderData: CreateDoctorsOrderData,
  medication: MedicationOrderDetails
): Promise<{ order: DoctorsOrder; medication: Medication }> {
  const order = await createDoctorsOrder({ ...orderData, order_link_key: crypto.randomUUID() });
  try {
    const created = await createMedication({
      ...medication,
      patient_id: order.patient_id,
      status: 'Active',
      prescribed_by: prescriberFromOrder(order.ordering_doctor),
      release_after_minutes: order.release_after_minutes ?? null,
      order_link_key: order.order_link_key,
    });
    return { order, medication: created };
  } catch (error) {
    // Don't leave an order on the chart whose medication never reached the MAR
    await deleteDoctorsOrder(order.id).catch((cleanupError) =>
      secureLogger.error('Failed to remove medication order after MAR insert failed:', cleanupError)
    );
    throw error;
  }
}

/** Saves the order and brings its MAR entry in line, creating one if it is missing. */
export async function updateMedicationOrder(
  existing: DoctorsOrder,
  orderData: UpdateDoctorsOrderData,
  medication: MedicationOrderDetails
): Promise<{ order: DoctorsOrder; medication: Medication }> {
  const order_link_key = existing.order_link_key ?? crypto.randomUUID();
  const order = await updateDoctorsOrder(existing.id, { ...orderData, order_link_key });
  const linked = await fetchLinkedMedication(order);
  const shared = {
    prescribed_by: prescriberFromOrder(order.ordering_doctor),
    release_after_minutes: order.release_after_minutes ?? null,
  };

  if (linked) {
    // next_due is recalculated by updateMedication when the schedule changes
    const { next_due: _nextDue, ...fields } = medication;
    return { order, medication: await updateMedication(linked.id, { ...fields, ...shared }) };
  }
  const created = await createMedication({
    ...medication,
    ...shared,
    patient_id: order.patient_id,
    status: 'Active',
    order_link_key,
  });
  return { order, medication: created };
}

/** Deletes an order and, for medication orders, the MAR entry (and its administrations) it created. */
export async function deleteOrderWithMedication(order: DoctorsOrder): Promise<void> {
  const linked = await fetchLinkedMedication(order);
  if (linked) await deleteMedication(linked.id);
  await deleteDoctorsOrder(order.id);
}
