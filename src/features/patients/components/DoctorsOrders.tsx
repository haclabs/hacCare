/**
 * Doctors Orders Component
 * 
 * Manages physician orders with role-based permissions:
 * - Admin/Super Admin/Coordinator: Full CRUD access
 * - Instructors: Full CRUD in template tenants; add + release delay in simulations
 * - Nurses and students: View, Add (Phone/Verbal orders), and Acknowledge
 * - Outside templates: staff can mark any order entered in error; students only orders a
 *   student or nurse login entered (enforced by the guard_doctors_order_change trigger)
 */

import React, { useState, useEffect } from 'react';
import { Plus, FileText } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DoctorsOrder } from '../../../types';
import { fetchDoctorsOrders, acknowledgeDoctorsOrder, markDoctorsOrderEnteredInError } from '../../../services/clinical/doctorsOrdersService';
import { deleteOrderWithMedication } from '../../../services/clinical/medicationOrderService';
import { StudentAcknowledgeModal } from '../../../components/modals/StudentAcknowledgeModal';
import { PatientActionBar } from '../../../components/PatientActionBar';
import { secureLogger } from '../../../lib/security/secureLogger';
import { useTenant } from '../../../contexts/TenantContext';
import { useSimulationStartsAt } from '../../simulation/hooks/useSimulationStartsAt';
import { DoctorsOrderForm } from './DoctorsOrderForm';
import { DoctorsOrderCard } from './DoctorsOrderCard';
import { OrderEnteredInErrorModal } from './OrderEnteredInErrorModal';
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
  const [markingOrder, setMarkingOrder] = useState<DoctorsOrder | null>(null);

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

  const confirmMarkInError = async (studentName: string, reason: string) => {
    if (!markingOrder) return;
    await markDoctorsOrderEnteredInError(markingOrder, studentName, reason);
    setOrders(await fetchDoctorsOrders(patientId));
    if (markingOrder.order_link_key) {
      queryClient.invalidateQueries({ queryKey: queryKeys.patientMedicationOrders(patientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.patientMedications(patientId) });
    }
    setMarkingOrder(null);
    onOrdersChange?.();
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingOrder(null);
    setError('');
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
                <DoctorsOrderCard
                  key={order.id}
                  order={order}
                  showReleaseDelay={isStaff}
                  simulationStartsAt={simulationStartsAt}
                  canManage={canManageOrders}
                  canMarkInError={
                    !isTemplateTenant &&
                    (isStaff || order.created_by_role === 'student' || order.created_by_role === 'nurse')
                  }
                  onAcknowledge={() => handleAcknowledge(order.id)}
                  onEdit={() => handleEdit(order)}
                  onDelete={() => handleDelete(order)}
                  onMarkInError={() => setMarkingOrder(order)}
                />
              ))}
            </div>
          )}

      {markingOrder && (
        <OrderEnteredInErrorModal
          order={markingOrder}
          onConfirm={confirmMarkInError}
          onCancel={() => setMarkingOrder(null)}
        />
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