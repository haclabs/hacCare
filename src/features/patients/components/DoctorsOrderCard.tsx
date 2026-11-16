/**
 * One doctor's order in the orders list. Orders marked entered in error stay
 * visible, struck through, with who marked them and why, and lose their
 * actions.
 */

import React from 'react';
import { AlertTriangle, Check, Clock, Edit, FileText, MessageSquare, Phone, Pill, Trash2 } from 'lucide-react';
import type { DoctorsOrder } from '../../../types';
import { ReleaseDelayBadge } from './DoctorsOrderRelease';
import { stripDoctorTitle } from '../utils/doctorName';
import { formatLocalDate } from '../utils/localDate';

interface DoctorsOrderCardProps {
  order: DoctorsOrder;
  showReleaseDelay: boolean;
  simulationStartsAt: string | null | undefined;
  canManage: boolean;
  canMarkInError: boolean;
  onAcknowledge: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMarkInError: () => void;
}

const TYPE_STYLE: Record<string, { icon: React.ReactNode; className: string }> = {
  'Phone Order': { icon: <Phone className="h-4 w-4 text-blue-600" />, className: 'bg-blue-100 text-blue-800 border-blue-200' },
  'Verbal Order': { icon: <MessageSquare className="h-4 w-4 text-green-600" />, className: 'bg-green-100 text-green-800 border-green-200' },
};
const DEFAULT_TYPE_STYLE = { icon: <FileText className="h-4 w-4 text-gray-600" />, className: 'bg-gray-100 text-gray-800 border-gray-200' };

export const DoctorsOrderCard: React.FC<DoctorsOrderCardProps> = ({
  order,
  showReleaseDelay,
  simulationStartsAt,
  canManage,
  canMarkInError,
  onAcknowledge,
  onEdit,
  onDelete,
  onMarkInError,
}) => {
  const inError = !!order.entered_in_error_at;
  const typeStyle = TYPE_STYLE[order.order_type] ?? DEFAULT_TYPE_STYLE;
  const strike = inError ? 'line-through decoration-red-400 text-gray-500' : '';

  return (
    <div
      className={`border rounded-lg p-4 ${
        inError ? 'bg-red-50 border-red-200' : order.is_acknowledged ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-900">
                {formatLocalDate(order.order_date)} at {order.order_time}
              </span>
            </div>

            <div className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-medium space-x-1 ${typeStyle.className}`}>
              {typeStyle.icon}
              <span>{order.order_type}</span>
            </div>

            {showReleaseDelay && (
              <ReleaseDelayBadge releaseAfterMinutes={order.release_after_minutes} simulationStartsAt={simulationStartsAt} />
            )}

            {order.order_link_key && (
              <div className="inline-flex items-center px-2 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-800 text-xs font-medium space-x-1">
                <Pill className="h-3 w-3" />
                <span>{inError ? 'Medication order · discontinued on MAR' : 'Medication order · on MAR'}</span>
              </div>
            )}

            {inError ? (
              <div className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold space-x-1">
                <AlertTriangle className="h-3 w-3" />
                <span>ENTERED IN ERROR</span>
              </div>
            ) : !order.is_acknowledged ? (
              <div className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold animate-pulse">
                NEW
              </div>
            ) : (
              <div className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium space-x-1">
                <Check className="h-3 w-3" />
                <span>ACKNOWLEDGED</span>
              </div>
            )}
          </div>

          <div className="mb-2">
            <span className={`text-sm font-medium text-gray-700 ${strike}`}>Dr. {stripDoctorTitle(order.ordering_doctor)}</span>
          </div>

          <div className="mb-3">
            <p className={`text-gray-900 leading-relaxed whitespace-pre-line ${strike}`}>{order.order_text}</p>
          </div>

          {order.notes && (
            <div className="mb-3">
              <p className={`text-sm text-gray-600 ${strike}`}>
                <span className="font-medium">Notes:</span> {order.notes}
              </p>
            </div>
          )}

          {inError && (
            <div className="mb-3 rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-red-800">
              Entered in error by <span className="font-semibold">{order.entered_in_error_by}</span> on{' '}
              {new Date(order.entered_in_error_at!).toLocaleString()}. Reason: {order.entered_in_error_reason}
            </div>
          )}

          <div className="text-xs text-gray-500 space-y-1">
            <div>
              Created by {order.doctor_name ? `${order.doctor_name} (via ${order.created_by_name})` : order.created_by_name} on{' '}
              {new Date(order.created_at).toLocaleString()}
            </div>
            {order.is_acknowledged && order.acknowledged_by_name && (
              <div>
                Acknowledged by {order.acknowledged_by_name} on {new Date(order.acknowledged_at!).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {!inError && (
          <div className="flex flex-col items-end gap-2 ml-4">
            <div className="flex items-center space-x-2">
              {!order.is_acknowledged && (
                <button
                  onClick={onAcknowledge}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                  title="Acknowledge Order"
                >
                  <Check className="h-3 w-3" />
                  <span>Acknowledge</span>
                </button>
              )}
              {canManage && (
                <button onClick={onEdit} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Edit Order">
                  <Edit className="h-4 w-4" />
                </button>
              )}
              {canManage && (
                <button onClick={onDelete} className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors" title="Delete Order">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            {canMarkInError && (
              <button onClick={onMarkInError} className="text-xs font-medium text-red-700 hover:text-red-900 underline underline-offset-2">
                Mark as entered in error
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
