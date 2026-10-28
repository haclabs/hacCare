import React from 'react';
import { FileText } from 'lucide-react';

import type { LinkedMedicationOrder } from '../../../../services/clinical/medicationOrderService';
import { stripDoctorTitle } from '../../utils/doctorName';

interface LinkedOrderNoteProps {
  order: LinkedMedicationOrder;
  compact?: boolean;
}

/** The doctors' order behind a MAR entry, shown on the MAR row and during BCMA. */
export const LinkedOrderNote: React.FC<LinkedOrderNoteProps> = ({ order, compact = false }) => (
  <div className={`rounded-lg border border-blue-200 bg-blue-50 ${compact ? 'px-3 py-2 mt-2' : 'p-3'}`}>
    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-blue-800">
      <FileText className="h-3.5 w-3.5" />
      Doctor's order
    </p>
    <p className={`mt-1 text-gray-900 whitespace-pre-line ${compact ? 'text-sm' : 'text-sm font-medium'}`}>
      {order.order_text}
    </p>
    {order.notes && <p className="mt-1 text-xs text-gray-600">Notes: {order.notes}</p>}
    <p className="mt-1 text-xs text-blue-700">
      Dr. {stripDoctorTitle(order.ordering_doctor)} · {order.order_type} ·{' '}
      {new Date(`${order.order_date}T00:00:00`).toLocaleDateString()} {order.order_time.slice(0, 5)}
    </p>
  </div>
);
