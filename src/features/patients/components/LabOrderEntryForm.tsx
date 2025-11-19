/**
 * Lab Order Entry Form
 * Form for creating new lab specimen orders with cascading dropdowns
 */

import React, { useState } from 'react';
import { useTenant } from '../../../contexts/TenantContext';
import { useAuth } from '../../../hooks/useAuth';
import { createLabOrder, markLabelPrinted } from '../../../services/clinical/labOrderService';
import type { CreateLabOrderInput } from '../../clinical/types/labOrders';
import {
  getProcedureCategories,
  getProcedureTypes,
  getSourceCategories,
  getSourceTypes
} from '../../clinical/types/labOrders';
import { formatDate } from '../../../utils/time';

interface LabOrderEntryFormProps {
  patientId: string;
  patientName: string;
  patientNumber: string;
  patientDOB: string;
  onSuccess?: () => void;
}

export const LabOrderEntryForm: React.FC<LabOrderEntryFormProps> = ({
  patientId,
  patientName,
  patientNumber,
  patientDOB,
  onSuccess
}) => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Get current date and time
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; // HH:mm

  const [formData, setFormData] = useState<CreateLabOrderInput>({
    patient_id: patientId,
    order_date: currentDate,
    order_time: currentTime,
    procedure_category: '',
    procedure_type: '',
    source_category: '',
    source_type: '',
    student_name: '',
    verified_by: user?.id || '',
    notes: ''
  });

  const [procedureTypes, setProcedureTypes] = useState<string[]>([]);
  const [sourceTypes, setSourceTypes] = useState<string[]>([]);

  const handleProcedureCategoryChange = (category: string) => {
    setFormData({
      ...formData,
      procedure_category: category,
      procedure_type: '' // Reset type when category changes
    });
    setProcedureTypes(getProcedureTypes(category));
  };

  const handleSourceCategoryChange = (category: string) => {
    setFormData({
      ...formData,
      source_category: category,
      source_type: '' // Reset type when category changes
    });
    setSourceTypes(getSourceTypes(category));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentTenant || !user) {
      setError('Not authenticated');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    const { data, error: err } = await createLabOrder(
      { ...formData, verified_by: user.id },
      currentTenant.id
    );

    if (err) {
      setError(err);
      setLoading(false);
      return;
    }

    if (data) {
      setSuccess('Lab order created successfully!');
      // Generate and print label
      printLabel(data.id);
      // Mark as printed
      await markLabelPrinted(data.id);
      
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    }

    setLoading(false);
  };

  /**
   * Escape HTML special characters to prevent XSS attacks
   * Converts characters like <, >, &, ", ' to their HTML entity equivalents
   */
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const printLabel = (orderId: string) => {
    // Sanitize all user-controlled data before inserting into HTML
    const safePatientName = escapeHtml(patientName);
    const safePatientNumber = escapeHtml(patientNumber);
    const safePatientDOB = escapeHtml(formatDate(patientDOB));
    const safeOrderDate = escapeHtml(formData.order_date);
    const safeOrderTime = escapeHtml(formData.order_time);
    const safeProcedureType = escapeHtml(formData.procedure_type);
    const safeSourceType = escapeHtml(formData.source_type);
    const safeStudentName = escapeHtml(formData.student_name);
    const safeOrderId = escapeHtml(orderId);

    const labelContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lab Specimen Label</title>
        <style>
          @page {
            size: 4in 4in;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            width: 4in;
            height: 4in;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .label {
            border: 2px solid #000;
            padding: 15px;
            text-align: left;
          }
          .patient-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .field {
            margin: 8px 0;
            font-size: 14px;
          }
          .field-label {
            font-weight: bold;
          }
          .procedure {
            margin-top: 15px;
            padding: 10px;
            background: #f0f0f0;
            font-size: 16px;
            font-weight: bold;
          }
          .verification {
            margin-top: 15px;
            font-size: 12px;
            border-top: 1px solid #ccc;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="patient-name">${safePatientName}</div>
          <div class="field"><span class="field-label">MRN:</span> ${safePatientNumber}</div>
          <div class="field"><span class="field-label">DOB:</span> ${safePatientDOB}</div>
          <div class="field"><span class="field-label">Date:</span> ${safeOrderDate}</div>
          <div class="field"><span class="field-label">Time:</span> ${safeOrderTime}</div>
          <div class="procedure">
            ${safeProcedureType}
          </div>
          <div class="field" style="margin-top: 10px;">
            <span class="field-label">Source:</span> ${safeSourceType}
          </div>
          <div class="verification">
            <div><span class="field-label">Verified by:</span> ${safeStudentName}</div>
            <div style="margin-top: 5px; font-size: 10px;">Order ID: ${safeOrderId}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(labelContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Laboratory Order</h2>
        <p className="text-gray-600 mt-1">Enter specimen order details for collection and processing</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        )}

        {/* Patient Info - Read Only */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-blue-900 mb-3">Patient Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-800">Name:</span>
              <span className="ml-2 text-blue-900">{patientName}</span>
            </div>
            <div>
              <span className="font-medium text-blue-800">MRN:</span>
              <span className="ml-2 text-blue-900">{patientNumber}</span>
            </div>
            <div>
              <span className="font-medium text-blue-800">DOB:</span>
              <span className="ml-2 text-blue-900">{formatDate(patientDOB)}</span>
            </div>
          </div>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={formData.order_date}
              onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time (24-hour)
            </label>
            <input
              type="time"
              value={formData.order_time}
              onChange={(e) => setFormData({ ...formData, order_time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        {/* Procedure - Cascading Dropdowns */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Procedure Category <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.procedure_category}
              onChange={(e) => handleProcedureCategoryChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">-- Select Category --</option>
              {getProcedureCategories().map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {formData.procedure_category && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specific Procedure <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.procedure_type}
                onChange={(e) => setFormData({ ...formData, procedure_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">-- Select Procedure --</option>
                {procedureTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Source - Cascading Dropdowns */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source Category <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.source_category}
              onChange={(e) => handleSourceCategoryChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">-- Select Category --</option>
              {getSourceCategories().map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {formData.source_category && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specific Source <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.source_type}
                onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">-- Select Source --</option>
                {sourceTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            placeholder="Any additional notes..."
          />
        </div>

        {/* Verification */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-yellow-900 mb-2">
            Student Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.student_name}
            onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
            className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            placeholder="Enter your full name"
            minLength={2}
            required
          />
          <p className="text-xs text-yellow-700 mt-2">
            By entering your name, you verify that all information above is correct and you performed this lab order.
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Creating Order...' : 'Create Order & Print Label'}
          </button>
        </div>
      </form>
    </div>
  );
};
