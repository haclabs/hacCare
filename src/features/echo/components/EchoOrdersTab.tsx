import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CheckCircle2, Loader2, MessageSquare, Phone, Pill } from 'lucide-react';
import { useTenant } from '../../../contexts/TenantContext';
import { queryKeys } from '../../../lib/api/queryClient';
import { acknowledgeDoctorsOrder, fetchDoctorsOrders } from '../../../services/clinical/doctorsOrdersService';
import { StudentAcknowledgeModal } from '../../../components/modals/StudentAcknowledgeModal';
import { stripDoctorTitle } from '../../patients/utils/doctorName';
import { formatLocalDate } from '../../patients/utils/localDate';
import type { DoctorsOrder } from '../../../types';

// Matches the desktop module: held orders appear once released, so keep checking in a simulation
const SIMULATION_POLL_MS = 30_000;

const TYPE_BADGE: Record<DoctorsOrder['order_type'], { label: string; className: string; Icon?: typeof Phone }> = {
  Direct: { label: 'Direct', className: 'bg-gray-100 text-gray-700' },
  'Phone Order': { label: 'Phone', className: 'bg-blue-100 text-blue-800', Icon: Phone },
  'Verbal Order': { label: 'Verbal', className: 'bg-green-100 text-green-800', Icon: MessageSquare },
};

const OrderCard: React.FC<{ order: DoctorsOrder; onAcknowledge: () => void }> = ({ order, onAcknowledge }) => {
  const type = TYPE_BADGE[order.order_type] ?? TYPE_BADGE.Direct;
  return (
    <li
      className={`rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-md border-l-4 ${
        order.is_acknowledged ? 'border-green-500' : 'border-red-500'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className="text-gray-500 dark:text-gray-400">
          {formatLocalDate(order.order_date)} · {order.order_time}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${type.className}`}>
          {type.Icon && <type.Icon className="h-3 w-3" />}
          {type.label}
        </span>
        {order.order_link_key && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-blue-800">
            <Pill className="h-3 w-3" /> On MAR
          </span>
        )}
        {!order.is_acknowledged && <span className="rounded-full bg-red-600 px-2 py-0.5 text-white">NEW</span>}
      </div>
      <p className="mt-2 whitespace-pre-line text-lg leading-snug text-gray-900 dark:text-white">{order.order_text}</p>
      {order.notes && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Notes: {order.notes}</p>}
      <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-300">Dr. {stripDoctorTitle(order.ordering_doctor)}</p>

      {order.is_acknowledged ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          Acknowledged{order.acknowledged_at ? ` ${new Date(order.acknowledged_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
        </p>
      ) : (
        <button
          onClick={onAcknowledge}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-haccare-teal py-3 font-semibold text-white hover:bg-haccare-teal-dark"
        >
          <Check className="h-5 w-5" />
          Acknowledge
        </button>
      )}
    </li>
  );
};

/** Phone layout for doctors' orders: new orders first, acknowledge with one tap. */
export const EchoOrdersTab: React.FC<{ patientId: string }> = ({ patientId }) => {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'new' | 'all'>('new');
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const key = queryKeys.patientDoctorsOrders(patientId);

  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: key,
    queryFn: () => fetchDoctorsOrders(patientId),
    refetchInterval: currentTenant?.tenant_type === 'simulation_active' ? SIMULATION_POLL_MS : false,
  });

  const newCount = orders.filter((o) => !o.is_acknowledged).length;
  const shown = filter === 'new' ? orders.filter((o) => !o.is_acknowledged) : orders;

  const confirmAcknowledge = async (studentName: string) => {
    if (!acknowledging) return;
    await acknowledgeDoctorsOrder(acknowledging, studentName);
    setAcknowledging(null);
    queryClient.invalidateQueries({ queryKey: key });
  };

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex rounded-xl bg-gray-200 dark:bg-gray-700 p-1" role="group" aria-label="Filter orders">
        {(['new', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold ${
              filter === f ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow' : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            {f === 'new' ? 'New' : 'All'}
            <span className={`rounded-full px-2 text-xs ${f === 'new' && newCount ? 'bg-red-600 text-white' : 'bg-gray-300 dark:bg-gray-600'}`}>
              {f === 'new' ? newCount : orders.length}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-7 w-7 animate-spin text-haccare-teal" /></div>
      ) : isError ? (
        <p className="rounded-2xl bg-red-50 p-4 text-red-800">Could not load orders.</p>
      ) : shown.length === 0 ? (
        <p className="rounded-2xl bg-white dark:bg-gray-800 p-6 text-center text-gray-500 dark:text-gray-400 shadow-sm">
          {filter === 'new' ? 'All orders acknowledged.' : 'No orders yet.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((order) => (
            <OrderCard key={order.id} order={order} onAcknowledge={() => setAcknowledging(order.id)} />
          ))}
        </ul>
      )}

      {acknowledging && (
        <StudentAcknowledgeModal
          title="Acknowledge Doctor's Order"
          message="Please enter your name to acknowledge that you have reviewed and understood this doctor's order."
          actionText="Acknowledge Order"
          onConfirm={confirmAcknowledge}
          onCancel={() => setAcknowledging(null)}
        />
      )}
    </div>
  );
};
