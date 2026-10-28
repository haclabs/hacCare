/**
 * Add / edit form for a doctors' order. A "Medication order" also creates (or updates) the
 * linked MAR entry, and its order text is pre-filled from the medication details.
 */

import React, { useEffect, useState } from 'react';
import { FileText, Pill, RotateCcw } from 'lucide-react';

import type { DoctorsOrder, Medication } from '../../../types';
import { createDoctorsOrder, updateDoctorsOrder } from '../../../services/clinical/doctorsOrdersService';
import {
  createMedicationOrder,
  fetchLinkedMedication,
  updateMedicationOrder,
} from '../../../services/clinical/medicationOrderService';
import { secureLogger } from '../../../lib/security/secureLogger';
import { parseReleaseAfterMinutes } from '../utils/orderRelease';
import { composeMedicationOrderText } from '../utils/medicationOrderText';
import { stripDoctorTitle } from '../utils/doctorName';
import { todayLocalISODate } from '../utils/localDate';
import { ReleaseDelayField } from './DoctorsOrderRelease';
import { MedicationEntryFields } from './mar/MedicationEntryFields';
import { useMedicationEntryForm } from './mar/useMedicationEntryForm';

type OrderType = DoctorsOrder['order_type'];

interface DoctorsOrderFormProps {
  patientId: string;
  role: string;
  editingOrder: DoctorsOrder | null;
  /** Admins may record which provider entered the order */
  showDoctorName: boolean;
  canSetReleaseDelay: boolean;
  onSaved: (order: DoctorsOrder, addedToMar: boolean) => void;
  onCancel: () => void;
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

export const DoctorsOrderForm: React.FC<DoctorsOrderFormProps> = (props) => {
  const linkKey = props.editingOrder?.order_link_key;
  const [linked, setLinked] = useState<{ medication: Medication | null } | null>(linkKey ? null : { medication: null });

  useEffect(() => {
    if (!linkKey || !props.editingOrder) return;
    fetchLinkedMedication(props.editingOrder)
      .then((medication) => setLinked({ medication }))
      .catch((err) => {
        secureLogger.error('Failed to load the medication linked to this order:', err);
        setLinked({ medication: null });
      });
  }, [linkKey, props.editingOrder]);

  if (!linked) {
    return <p className="text-sm text-gray-500 py-4">Loading medication order…</p>;
  }
  return <OrderFormBody {...props} initialMedication={linked.medication} />;
};

const OrderFormBody: React.FC<DoctorsOrderFormProps & { initialMedication: Medication | null }> = ({
  patientId,
  role,
  editingOrder,
  showDoctorName,
  canSetReleaseDelay,
  onSaved,
  onCancel,
  initialMedication,
}) => {
  const isNurse = role === 'nurse';
  const isLinkedOrder = !!editingOrder?.order_link_key;
  const [isMedicationOrder, setIsMedicationOrder] = useState(isLinkedOrder);
  const [orderType, setOrderType] = useState<OrderType>(editingOrder?.order_type ?? (isNurse ? 'Phone Order' : 'Direct'));
  const [orderDate, setOrderDate] = useState(editingOrder?.order_date ?? todayLocalISODate());
  const [orderTime, setOrderTime] = useState(editingOrder?.order_time ?? new Date().toTimeString().slice(0, 5));
  const [orderingDoctor, setOrderingDoctor] = useState(stripDoctorTitle(editingOrder?.ordering_doctor ?? ''));
  const [doctorName, setDoctorName] = useState(editingOrder?.doctor_name ?? '');
  const [notes, setNotes] = useState(editingOrder?.notes ?? '');
  const [releaseInput, setReleaseInput] = useState(
    editingOrder?.release_after_minutes ? String(editingOrder.release_after_minutes) : ''
  );
  // Medication orders track the medication fields until the instructor edits the wording
  const [orderText, setOrderText] = useState(editingOrder?.order_text ?? '');
  const [orderTextEdited, setOrderTextEdited] = useState(!!editingOrder);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [orderedDose, setOrderedDose] = useState(editingOrder?.ordered_dose ?? '');
  const entry = useMedicationEntryForm(initialMedication, { labelStrength: true });
  const composedText = composeMedicationOrderText({
    ...entry.form,
    dosage: orderedDose,
    category: entry.form.category as Medication['category'],
  });
  const displayedText = isMedicationOrder && !orderTextEdited ? composedText : orderText;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');

    const releaseAfterMinutes = parseReleaseAfterMinutes(releaseInput);
    const orderFields = {
      order_date: orderDate,
      order_time: orderTime,
      order_text: displayedText.trim(),
      ordering_doctor: stripDoctorTitle(orderingDoctor),
      notes,
      order_type: orderType,
      doctor_name: doctorName,
      // Only send the column when it carries a value (or clears one), so saving ordinary orders
      // keeps working if the client ships before the release-delay migration is applied.
      ...(releaseAfterMinutes !== null || editingOrder?.release_after_minutes
        ? { release_after_minutes: releaseAfterMinutes }
        : {}),
    };
    if (!orderFields.order_text) {
      setError('Please enter the order');
      return;
    }

    let medication = null;
    if (isMedicationOrder) {
      if (!orderedDose.trim()) {
        setError('Please enter the ordered dose');
        return;
      }
      const built = entry.buildFields();
      if (built.error !== null) {
        setError(built.error);
        return;
      }
      medication = { ...built.fields, next_due: entry.initialNextDue() };
    }

    try {
      setSubmitting(true);
      let saved: DoctorsOrder;
      if (medication) {
        const medOrderFields = { ...orderFields, ordered_dose: orderedDose.trim() };
        saved = editingOrder
          ? (await updateMedicationOrder(editingOrder, medOrderFields, medication)).order
          : (await createMedicationOrder({ patient_id: patientId, ...medOrderFields }, medication)).order;
      } else {
        saved = editingOrder
          ? await updateDoctorsOrder(editingOrder.id, orderFields)
          : await createDoctorsOrder({ patient_id: patientId, ...orderFields });
      }
      onSaved(saved, !!medication);
    } catch (err) {
      secureLogger.error('Error saving doctors order:', err);
      setError(isMedicationOrder ? 'Failed to save medication order' : 'Failed to save doctors order');
    } finally {
      setSubmitting(false);
    }
  };

  const typeButton = (medication: boolean, label: string, Icon: typeof Pill) => (
    <button
      type="button"
      onClick={() => setIsMedicationOrder(medication)}
      disabled={isLinkedOrder}
      aria-pressed={isMedicationOrder === medication}
      className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors disabled:cursor-not-allowed ${
        isMedicationOrder === medication
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 disabled:opacity-50'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  return (
    <div className="bg-gray-50 rounded-lg p-6 border">
      <h4 className="text-md font-medium text-gray-900 mb-4">{editingOrder ? 'Edit Order' : 'Add New Order'}</h4>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-2">
          {typeButton(false, 'General order', FileText)}
          {typeButton(true, 'Medication order', Pill)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(isNurse || editingOrder) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Type</label>
              <select value={orderType} onChange={(e) => setOrderType(e.target.value as OrderType)} className={inputClass} required>
                {!isNurse && <option value="Direct">Direct Order</option>}
                <option value="Phone Order">Phone Order</option>
                <option value="Verbal Order">Verbal Order</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time (24hr)</label>
            <input type="time" value={orderTime} onChange={(e) => setOrderTime(e.target.value)} className={inputClass} required />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ordering Doctor <span className="font-normal text-gray-400">(without "Dr." — added automatically)</span>
          </label>
          <input type="text" value={orderingDoctor} onChange={(e) => setOrderingDoctor(e.target.value)} className={inputClass} placeholder="A. Patel" required />
        </div>

        {showDoctorName && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Doctor/Provider Name (Order Created By)</label>
            <input type="text" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} className={inputClass} placeholder="Dr. Johnson (who is entering this order)" />
            <p className="text-xs text-gray-500 mt-1">Optional: Name of the doctor/provider who is creating this order entry</p>
          </div>
        )}

        {isMedicationOrder && (
          <fieldset className="rounded-lg border border-blue-200 bg-white p-4 space-y-4">
            <legend className="px-1 text-sm font-semibold text-blue-800">Medication — added to the MAR</legend>
            {isLinkedOrder && !initialMedication && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                This order's MAR entry was removed. Saving will add it to the MAR again.
              </p>
            )}
            <MedicationEntryFields entry={entry} />
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <label className="block text-sm font-semibold text-blue-900 mb-1">Ordered dose *</label>
              <input
                type="text"
                value={orderedDose}
                onChange={(e) => setOrderedDose(e.target.value)}
                className={inputClass}
                placeholder="e.g., 50 mg"
                required
              />
              <p className="text-xs text-blue-800 mt-1">
                Shown only in the doctor's order — the MAR and medication label keep the label strength
                {entry.form.dosage ? ` (${entry.form.dosage})` : ''}.
              </p>
            </div>
          </fieldset>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Order</label>
            {isMedicationOrder && orderTextEdited && composedText && (
              <button type="button" onClick={() => setOrderTextEdited(false)} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                <RotateCcw className="h-3 w-3" /> Rebuild from medication details
              </button>
            )}
          </div>
          <textarea
            value={displayedText}
            onChange={(e) => {
              setOrderText(e.target.value);
              setOrderTextEdited(true);
            }}
            className={`${inputClass} whitespace-pre-wrap`}
            rows={isMedicationOrder ? 4 : 6}
            placeholder={
              isMedicationOrder
                ? 'Filled in from the medication above — add the dose instructions, hold parameters, etc.'
                : "Enter the physician's order (use Enter for new lines)..."
            }
            required
          />
          {isMedicationOrder && (
            <p className="text-xs text-gray-500 mt-1">Shown to students on the MAR and during barcode administration.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} rows={2} placeholder="Additional notes or clarifications..." />
        </div>

        {canSetReleaseDelay && (
          <ReleaseDelayField value={releaseInput} onChange={setReleaseInput} itemLabel={isMedicationOrder ? 'order and medication' : 'order'} />
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onCancel} disabled={submitting} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="px-4 py-2 bg-haccare-teal hover:bg-haccare-teal-dark text-white rounded-lg transition-colors disabled:opacity-50">
            {submitting ? 'Saving...' : editingOrder ? 'Update Order' : isMedicationOrder ? 'Add Order & MAR Entry' : 'Add Order'}
          </button>
        </div>
      </form>
    </div>
  );
};
