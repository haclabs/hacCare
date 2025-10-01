/**
 * Doctors Orders Component
 * 
 * Manages physician orders with role-based permissions:
 * - Admin/Super Admin: Full CRUD access
 * - Nurses: View, Add (Phone/Verbal orders), and Acknowledge
 */

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Check, Clock, Phone, MessageSquare, FileText, X } from 'lucide-react';
import { DoctorsOrder } from '../../types';
import { 
  fetchDoctorsOrders, 
  createDoctorsOrder, 
  updateDoctorsOrder, 
  deleteDoctorsOrder,
  acknowledgeDoctorsOrder
} from '../../lib/doctorsOrdersService';

interface DoctorsOrdersProps {
  patientId: string;
  currentUser: {
    id: string;
    name: string;
    role: 'nurse' | 'admin' | 'super_admin';
  };
  onClose: () => void;
}

interface OrderFormData {
  order_date: string;
  order_time: string;
  order_text: string;
  ordering_doctor: string;
  notes: string;
  order_type: 'Direct' | 'Phone Order' | 'Verbal Order';
  doctor_name: string; // Doctor who created the order (for admin/super admin)
}

export const DoctorsOrders: React.FC<DoctorsOrdersProps> = ({
  patientId,
  currentUser,
  onClose
}) => {
  const [orders, setOrders] = useState<DoctorsOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<DoctorsOrder | null>(null);
  const [formData, setFormData] = useState<OrderFormData>({
    order_date: new Date().toISOString().split('T')[0],
    order_time: new Date().toTimeString().slice(0, 5),
    order_text: '',
    ordering_doctor: '',
    notes: '',
    order_type: currentUser.role === 'nurse' ? 'Phone Order' : 'Direct',
    doctor_name: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Check if user has admin privileges
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  // Load orders on component mount
  useEffect(() => {
    loadOrders();
  }, [patientId]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const ordersData = await fetchDoctorsOrders(patientId);
      setOrders(ordersData);
    } catch (error) {
      console.error('Error loading doctors orders:', error);
      setError('Failed to load doctors orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setError('');

      if (editingOrder) {
        // Update existing order
        const updatedOrder = await updateDoctorsOrder(editingOrder.id, formData);
        setOrders(orders.map(order => order.id === editingOrder.id ? updatedOrder : order));
        setEditingOrder(null);
      } else {
        // Create new order
        const newOrder = await createDoctorsOrder({
          patient_id: patientId,
          ...formData
        });
        setOrders([newOrder, ...orders]);
        setShowAddForm(false);
      }

      // Reset form
      setFormData({
        order_date: new Date().toISOString().split('T')[0],
        order_time: new Date().toTimeString().slice(0, 5),
        order_text: '',
        ordering_doctor: '',
        notes: '',
        order_type: currentUser.role === 'nurse' ? 'Phone Order' : 'Direct',
        doctor_name: ''
      });
    } catch (error) {
      console.error('Error saving doctors order:', error);
      setError('Failed to save doctors order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (order: DoctorsOrder) => {
    setEditingOrder(order);
    setFormData({
      order_date: order.order_date,
      order_time: order.order_time,
      order_text: order.order_text,
      ordering_doctor: order.ordering_doctor,
      notes: order.notes || '',
      order_type: order.order_type,
      doctor_name: order.doctor_name || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this doctors order?')) {
      return;
    }

    try {
      await deleteDoctorsOrder(orderId);
      setOrders(orders.filter(order => order.id !== orderId));
    } catch (error) {
      console.error('Error deleting doctors order:', error);
      setError('Failed to delete doctors order');
    }
  };

  const handleAcknowledge = async (orderId: string) => {
    try {
      const updatedOrder = await acknowledgeDoctorsOrder(orderId);
      setOrders(orders.map(order => order.id === orderId ? updatedOrder : order));
    } catch (error) {
      console.error('Error acknowledging doctors order:', error);
      setError('Failed to acknowledge doctors order');
    }
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingOrder(null);
    setFormData({
      order_date: new Date().toISOString().split('T')[0],
      order_time: new Date().toTimeString().slice(0, 5),
      order_text: '',
      ordering_doctor: '',
      notes: '',
      order_type: currentUser.role === 'nurse' ? 'Phone Order' : 'Direct',
      doctor_name: ''
    });
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <FileText className="h-6 w-6" />
            <span>Doctors Orders</span>
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {/* Add Order Button */}
          <div className="mb-6 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Patient Orders ({orders.length})
            </h3>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add {currentUser.role === 'nurse' ? 'Phone/Verbal' : 'Order'}</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="mb-6 bg-gray-50 rounded-lg p-6 border">
              <h4 className="text-md font-medium text-gray-900 mb-4">
                {editingOrder ? 'Edit Order' : 'Add New Order'}
              </h4>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Order Type - Only show for nurses or when editing */}
                  {(currentUser.role === 'nurse' || editingOrder) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Order Type
                      </label>
                      <select
                        value={formData.order_type}
                        onChange={(e) => setFormData({ ...formData, order_type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        {currentUser.role === 'nurse' ? (
                          <>
                            <option value="Phone Order">Phone Order</option>
                            <option value="Verbal Order">Verbal Order</option>
                          </>
                        ) : (
                          <>
                            <option value="Direct">Direct Order</option>
                            <option value="Phone Order">Phone Order</option>
                            <option value="Verbal Order">Verbal Order</option>
                          </>
                        )}
                      </select>
                    </div>
                  )}

                  {/* Date */}
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

                  {/* Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time (24hr)
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

                {/* Ordering Doctor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ordering Doctor
                  </label>
                  <input
                    type="text"
                    value={formData.ordering_doctor}
                    onChange={(e) => setFormData({ ...formData, ordering_doctor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Dr. Smith"
                    required
                  />
                </div>

                {/* Doctor/Provider Name - Only show for admin/super admin */}
                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Doctor/Provider Name (Order Created By)
                    </label>
                    <input
                      type="text"
                      value={formData.doctor_name}
                      onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Dr. Johnson (who is entering this order)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Optional: Name of the doctor/provider who is creating this order entry
                    </p>
                  </div>
                )}

                {/* Order Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order
                  </label>
                  <textarea
                    value={formData.order_text}
                    onChange={(e) => setFormData({ ...formData, order_text: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Enter the physician's order..."
                    required
                  />
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
                    rows={2}
                    placeholder="Additional notes or clarifications..."
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={cancelForm}
                    disabled={submitting}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : (editingOrder ? 'Update Order' : 'Add Order')}
                  </button>
                </div>
              </form>
            </div>
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
                            {new Date(order.order_date).toLocaleDateString()} at {order.order_time}
                          </span>
                        </div>
                        
                        <div className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-medium space-x-1 ${getOrderTypeColor(order.order_type)}`}>
                          {getOrderTypeIcon(order.order_type)}
                          <span>{order.order_type}</span>
                        </div>

                        {order.is_acknowledged && (
                          <div className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 border-green-200 text-xs font-medium space-x-1">
                            <Check className="h-3 w-3" />
                            <span>Acknowledged</span>
                          </div>
                        )}
                      </div>

                      {/* Doctor */}
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-700">Dr. {order.ordering_doctor}</span>
                      </div>

                      {/* Order text */}
                      <div className="mb-3">
                        <p className="text-gray-900 leading-relaxed">{order.order_text}</p>
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
                          className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                          title="Acknowledge Order"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}

                      {/* Edit Button - Only for admin/super admin */}
                      {isAdmin && (
                        <button
                          onClick={() => handleEdit(order)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Edit Order"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}

                      {/* Delete Button - Only for admin/super admin */}
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(order.id)}
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
        </div>
      </div>
    </div>
  );
};