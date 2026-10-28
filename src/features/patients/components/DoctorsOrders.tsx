/**
 * Doctors Orders Component
 * 
 * Manages physician orders with role-based permissions:
 * - Admin/Super Admin/Coordinator: Full CRUD access
 * - Instructors: Full CRUD in template tenants; add + release delay in simulations
 * - Nurses and students: View, Add (Phone/Verbal orders), and Acknowledge
 */

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Check, Clock, Phone, MessageSquare, FileText, Pill } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DoctorsOrder } from '../../../types';
import { fetchDoctorsOrders, acknowledgeDoctorsOrder } from '../../../services/clinical/doctorsOrdersService';
import { deleteOrderWithMedication } from '../../../services/clinical/medicationOrderService';
import { StudentAcknowledgeModal } from '../../../components/modals/StudentAcknowledgeModal';
import { PatientActionBar } from '../../../components/PatientActionBar';
import { secureLogger } from '../../../lib/security/secureLogger';
import { useTenant } from '../../../contexts/TenantContext';
import { useSimulationStartsAt } from '../../simulation/hooks/useSimulationStartsAt';
import { ReleaseDelayBadge } from './DoctorsOrderRelease';
import { DoctorsOrderForm } from './DoctorsOrderForm';
import { stripDoctorTitle } from '../utils/doctorName';
import { formatLocalDate } from '../utils/localDate';
import { queryKeys } from '../../../lib/api/queryClient';
import { canManageMedicationOrders } from './mar/medicationPermissions';

const STAFF_ROLES = ['super_admin', 'coordinator', 'admin', 'instructor'];
// Held orders are released by the database clock; students' screens pick them up on this cadence.
const SIMULATION_POLL_MS = 30_000;

interface DoctorsOrdersProps {
  patientId: string;
  currentUser: {
    id: string;
    name: string;
    role: 'nurse' | 'student' | 'instructor' | 'coordinator' | 'admin' | 'super_admin';
  };
  onOrdersChange?: () => void; // Callback to notify parent of order changes
  // Top PatientActionBar nav — same props every other module receives
  onChartClick?: () => void;
  onVitalsClick?: () => void;
  onMedsClick?: () => void;
  onLabsClick?: () => void;
  onOrdersClick?: () => void;
  onHacMapClick?: () => void;
  onIOClick?: () => void;
  onNotesClick?: () => void;
  onFlowsheetsClick?: () => void;
  vitalsCount?: number;
  medsCount?: number;
  hasNewLabs?: boolean;
  hasNewOrders?: boolean;
  hasNewNotes?: boolean;
}

export const DoctorsOrders: React.FC<DoctorsOrdersProps> = ({
  patientId,
  currentUser,
  onOrdersChange,
  onChartClick,
  onVitalsClick,
  onMedsClick,
  onLabsClick,
  onOrdersClick,
  onHacMapClick,
  onIOClick,
  onNotesClick,
  onFlowsheetsClick,
  vitalsCount = 0,
  medsCount = 0,
  hasNewLabs = false,
  hasNewOrders = false,
  hasNewNotes = false,
}) => {
  const [orders, setOrders] = useState<DoctorsOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<DoctorsOrder | null>(null);
  const [error, setError] = useState('');
  const [acknowledgingOrderId, setAcknowledgingOrderId] = useState<string | null>(null);

  // Check if user has admin privileges
  const isAdmin = ['admin', 'coordinator', 'super_admin'].includes(currentUser.role);

  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const { data: simulationStartsAt, isSimulationTenant } = useSimulationStartsAt();
  const isTemplateTenant =
    currentTenant?.tenant_type === 'simulation_template' ||
    currentTenant?.tenant_type === 'patient_template';
  const isStaff = STAFF_ROLES.includes(currentUser.role);
  const canSetReleaseDelay = isStaff && (isTemplateTenant || isSimulationTenant);
  const canManageOrders = canManageMedicationOrders(currentUser.role, isTemplateTenant);

  // Load orders on mount; in a simulation keep polling so held orders appear once released
  useEffect(() => {
    let cancelled = false;
    async function loadOrders(showSpinner: boolean) {
      try {
        if (showSpinner) setLoading(true);
        const ordersData = await fetchDoctorsOrders(patientId);
        if (!cancelled) setOrders(ordersData);
      } catch (error) {
        secureLogger.error('Error loading doctors orders:', error);
        if (!cancelled && showSpinner) setError('Failed to load doctors orders');
      } finally {
        if (!cancelled && showSpinner) setLoading(false);
      }
    }
    loadOrders(true);
    const interval = isSimulationTenant ? setInterval(() => loadOrders(false), SIMULATION_POLL_MS) : undefined;
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [patientId, isSimulationTenant]);

  const handleSaved = (saved: DoctorsOrder, addedToMar: boolean) => {
    setOrders((prev) =>
      editingOrder ? prev.map((order) => (order.id === saved.id ? saved : order)) : [saved, ...prev]
    );
    setShowAddForm(false);
    setEditingOrder(null);
    setError('');
    if (addedToMar || saved.order_link_key) {
      queryClient.invalidateQueries({ queryKey: queryKeys.patientMedicationOrders(patientId) });
    }
    onOrdersChange?.();
  };

  const handleEdit = (order: DoctorsOrder) => {
    setEditingOrder(order);
    setShowAddForm(true);
  };

  const handleDelete = async (order: DoctorsOrder) => {
    const message = order.order_link_key
      ? 'Delete this medication order? Its medication will also be removed from the MAR, along with any recorded administrations.'
      : 'Are you sure you want to delete this doctors order?';
    if (!confirm(message)) return;

    try {
      await deleteOrderWithMedication(order);
      setOrders(orders.filter((o) => o.id !== order.id));
      if (order.order_link_key) {
        queryClient.invalidateQueries({ queryKey: queryKeys.patientMedicationOrders(patientId) });
        onOrdersChange?.();
      }
    } catch (error) {
      secureLogger.error('Error deleting doctors order:', error);
      setError('Failed to delete doctors order');
    }
  };

  const handleAcknowledge = (orderId: string) => {
    setAcknowledgingOrderId(orderId);
  };

  const confirmAcknowledge = async (studentName: string) => {
    if (!acknowledgingOrderId) return;

    try {
      await acknowledgeDoctorsOrder(acknowledgingOrderId, studentName);
      
      // Update the order in the local state
      setOrders(orders.map(order => 
        order.id === acknowledgingOrderId 
          ? { 
              ...order, 
              is_acknowledged: true, 
              acknowledged_by: currentUser.id,
              acknowledged_by_name: currentUser.name,
              acknowledged_by_student: studentName,
              acknowledged_at: new Date().toISOString()
            }
          : order
      ));
      
      setAcknowledgingOrderId(null);
      
      // Notify parent component of the change
      onOrdersChange?.();
    } catch (error) {
      secureLogger.error('Error acknowledging order:', error);
      setError('Failed to acknowledge order');
      throw error; // Re-throw to let modal handle error display
    }
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingOrder(null);
    setError('');
  };

  const getOrderTypeIcon = (orderType: string) => {
    switch (orderType) {
      case 'Phone Order':
        return <Phone className="h-4 w-4 text-blue-600" />;
      case 'Verbal Order':
        return <MessageSquare className="h-4 w-4 text-green-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getOrderTypeColor = (orderType: string) => {
    switch (orderType) {
      case 'Phone Order':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Verbal Order':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PatientActionBar
        onChartClick={onChartClick}
        onVitalsClick={onVitalsClick}
        onMedsClick={onMedsClick}
        onLabsClick={onLabsClick}
        onOrdersClick={onOrdersClick}
        onHacMapClick={onHacMapClick}
        onIOClick={onIOClick}
        onNotesClick={onNotesClick}
        onFlowsheetsClick={onFlowsheetsClick}
        vitalsCount={vitalsCount}
        medsCount={medsCount}
        hasNewLabs={hasNewLabs}
        hasNewOrders={hasNewOrders}
        hasNewNotes={hasNewNotes}
        activeAction="orders"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Doctors Orders</h2>
          </div>
          <p className="text-gray-600 mt-1">
            Patient Orders ({orders.length})
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add {currentUser.role === 'nurse' || currentUser.role === 'student' ? 'Phone/Verbal' : 'Order'}</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <DoctorsOrderForm
          key={editingOrder?.id ?? 'new'}
          patientId={patientId}
          role={currentUser.role}
          editingOrder={editingOrder}
          showDoctorName={isAdmin}
          canSetReleaseDelay={canSetReleaseDelay}
          onSaved={handleSaved}
          onCancel={cancelForm}
        />
      )}

          {/* Orders List */}
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No doctors orders found</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add First Order</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className={`border rounded-lg p-4 ${
                    order.is_acknowledged 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header with date/time and type */}
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900">
                            {formatLocalDate(order.order_date)} at {order.order_time}
                          </span>
                        </div>
                        
                        <div className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-medium space-x-1 ${getOrderTypeColor(order.order_type)}`}>
                          {getOrderTypeIcon(order.order_type)}
                          <span>{order.order_type}</span>
                        </div>

                        {isStaff && (
                          <ReleaseDelayBadge
                            releaseAfterMinutes={order.release_after_minutes}
                            simulationStartsAt={simulationStartsAt}
                          />
                        )}

                        {order.order_link_key && (
                          <div className="inline-flex items-center px-2 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-800 text-xs font-medium space-x-1">
                            <Pill className="h-3 w-3" />
                            <span>Medication order · on MAR</span>
                          </div>
                        )}

                        {!order.is_acknowledged ? (
                          <div className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800 border-red-200 text-xs font-bold space-x-1 animate-pulse">
                            <span>NEW</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 border-green-200 text-xs font-medium space-x-1">
                            <Check className="h-3 w-3" />
                            <span>ACKNOWLEDGED</span>
                          </div>
                        )}
                      </div>

                      {/* Doctor */}
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-700">Dr. {stripDoctorTitle(order.ordering_doctor)}</span>
                      </div>

                      {/* Order text */}
                      <div className="mb-3">
                        <p className="text-gray-900 leading-relaxed whitespace-pre-line">{order.order_text}</p>
                      </div>

                      {/* Notes */}
                      {order.notes && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Notes:</span> {order.notes}
                          </p>
                        </div>
                      )}

                      {/* Footer info */}
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>
                          Created by {order.doctor_name ? `${order.doctor_name} (via ${order.created_by_name})` : order.created_by_name} on {new Date(order.created_at).toLocaleString()}
                        </div>
                        {order.is_acknowledged && order.acknowledged_by_name && (
                          <div>
                            Acknowledged by {order.acknowledged_by_name} on {new Date(order.acknowledged_at!).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      {/* Acknowledge Button - Only for nurses on unacknowledged orders */}
                      {!order.is_acknowledged && (
                        <button
                          onClick={() => handleAcknowledge(order.id)}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                          title="Acknowledge Order"
                        >
                          <Check className="h-3 w-3" />
                          <span>Acknowledge</span>
                        </button>
                      )}

                      {/* Edit Button */}
                      {canManageOrders && (
                        <button
                          onClick={() => handleEdit(order)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Edit Order"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}

                      {/* Delete Button */}
                      {canManageOrders && (
                        <button
                          onClick={() => handleDelete(order)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="Delete Order"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

      {/* Student Acknowledge Modal */}
      {acknowledgingOrderId && (
        <StudentAcknowledgeModal
          title="Acknowledge Doctor's Order"
          message="Please enter your name to acknowledge that you have reviewed and understood this doctor's order."
          actionText="Acknowledge Order"
          onConfirm={confirmAcknowledge}
          onCancel={() => setAcknowledgingOrderId(null)}
        />
      )}
    </div>
  );
};