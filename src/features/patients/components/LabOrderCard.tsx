/**
 * Lab Order Card Component
 * Displays a single lab order in the list
 */

import React from 'react';
import { FileText, Clock } from 'lucide-react';
import type { LabOrder } from '../../clinical/types/labOrders';
import { formatDate } from '../../../utils/time';

interface LabOrderCardProps {
  order: LabOrder;
  onClick?: () => void;
}

export const LabOrderCard: React.FC<LabOrderCardProps> = ({ order, onClick }) => {
  const handleClick = () => {
    onClick?.();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'collected':
        return 'bg-blue-100 text-blue-800';
      case 'sent':
        return 'bg-purple-100 text-purple-800';
      case 'resulted':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div
      onClick={handleClick}
      className="p-6 hover:bg-blue-50 hover:shadow-md transition-all cursor-pointer border-l-4 border-green-500"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <FileText className="w-5 h-5 text-green-600" />
            <h4 className="text-lg font-medium text-gray-900">
              Lab Order - {order.procedure_type}
            </h4>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                order.status
              )}`}
            >
              {getStatusLabel(order.status)}
            </span>
            {order.status === 'pending' && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                Order Submitted
              </span>
            )}
          </div>

          {order.status === 'pending' && (
            <p className="text-sm text-blue-600 font-medium mt-2 flex items-center gap-1">
              <FileText className="w-4 h-4" />
              Click to view specimen label
            </p>
          )}


          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mt-3">
            <div>
              <span className="font-medium">Date:</span> {formatDate(order.order_date)}
            </div>
            <div>
              <span className="font-medium">Time:</span> {order.order_time}
            </div>
            <div>
              <span className="font-medium">Procedure:</span> {order.procedure_category}
            </div>
            <div>
              <span className="font-medium">Source:</span> {order.source_type}
            </div>
          </div>

          {order.notes && (
            <p className="mt-2 text-sm text-gray-500 italic">{order.notes}</p>
          )}
        </div>

        <div className="text-right ml-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Ordered: {formatDate(order.created_at)}</span>
          </div>
          <p className="text-sm font-medium text-gray-900 mt-1">By: {order.student_name || order.initials || 'Unknown'}</p>
        </div>
      </div>
    </div>
  );
};
