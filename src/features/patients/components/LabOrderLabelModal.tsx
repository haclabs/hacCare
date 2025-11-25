/**
 * Lab Order Label Modal
 * Displays a virtual specimen label for a lab order
 */

import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { LabOrder } from '../../clinical/types/labOrders';
import { formatDate } from '../../../utils/time';

interface LabOrderLabelModalProps {
  order: LabOrder;
  patientName: string;
  patientNumber: string;
  patientDOB: string;
  onClose: () => void;
}

export const LabOrderLabelModal: React.FC<LabOrderLabelModalProps> = ({
  order,
  patientName,
  patientNumber,
  patientDOB,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Specimen Label</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Important Notice */}
        <div className="p-6 border-b bg-blue-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-900 text-lg">
                Please see your instructor for the specimen collection label
              </p>
            </div>
          </div>
        </div>

        {/* Virtual Label Display */}
        <div className="p-6">
          <div className="border-4 border-black p-6 bg-white rounded-lg">
            {/* Patient Name - Large and Bold */}
            <div className="mb-4 pb-3 border-b-2 border-gray-300">
              <div className="text-2xl font-black text-gray-900 uppercase">
                {patientName}
              </div>
            </div>

            {/* Patient Details */}
            <div className="space-y-2 mb-4">
              <div className="flex gap-2 text-base">
                <span className="font-bold text-gray-700">MRN:</span>
                <span className="text-gray-900">{patientNumber}</span>
              </div>
              <div className="flex gap-2 text-base">
                <span className="font-bold text-gray-700">DOB:</span>
                <span className="text-gray-900">{formatDate(patientDOB)}</span>
              </div>
              <div className="flex gap-2 text-base">
                <span className="font-bold text-gray-700">Date:</span>
                <span className="text-gray-900">{order.order_date}</span>
              </div>
              <div className="flex gap-2 text-base">
                <span className="font-bold text-gray-700">Time:</span>
                <span className="text-gray-900">{order.order_time}</span>
              </div>
            </div>

            {/* Procedure - Highlighted */}
            <div className="mt-4 pt-4 border-t-2 border-gray-300">
              <div className="bg-gray-100 p-3 rounded text-center">
                <div className="text-xl font-black text-gray-900 uppercase">
                  {order.procedure_type}
                </div>
              </div>
            </div>

            {/* Source */}
            <div className="mt-4 text-base">
              <div className="flex gap-2">
                <span className="font-bold text-gray-700">Source:</span>
                <span className="text-gray-900">{order.source_type}</span>
              </div>
            </div>

            {/* Verification */}
            <div className="mt-4 pt-4 border-t border-gray-300 text-sm text-gray-600">
              <div className="flex gap-2">
                <span className="font-bold">Verified by:</span>
                <span>{order.student_name}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Order ID: {order.id}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
