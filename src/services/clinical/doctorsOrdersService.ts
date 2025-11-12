/**
 * Doctors Orders Service
 * Handles CRUD operations for physician orders with role-based permissions
 */

import { supabase } from '../../lib/api/supabase';
import { DoctorsOrder } from '../../types';

export interface CreateDoctorsOrderData {
  patient_id: string;
  order_date: string;
  order_time: string;
  order_text: string;
  ordering_doctor: string;
  notes?: string;
  order_type: 'Direct' | 'Phone Order' | 'Verbal Order';
  doctor_name?: string; // Doctor who created the order (for admin/super admin)
}

export interface UpdateDoctorsOrderData {
  order_date?: string;
  order_time?: string;
  order_text?: string;
  ordering_doctor?: string;
  notes?: string;
  order_type?: 'Direct' | 'Phone Order' | 'Verbal Order';
  doctor_name?: string; // Doctor who created the order (for admin/super admin)
}

/**
 * Fetch doctors orders for a specific patient
 */
export const fetchDoctorsOrders = async (patientId: string): Promise<DoctorsOrder[]> => {
  try {
    const { data, error } = await supabase
      .from('doctors_orders')
      .select(`
        *,
        created_by_profile:user_profiles!doctors_orders_created_by_fkey(first_name, last_name),
        acknowledged_by_profile:user_profiles!doctors_orders_acknowledged_by_fkey(first_name, last_name)
      `)
      .eq('patient_id', patientId)
      .order('order_date', { ascending: false })
      .order('order_time', { ascending: false });

    if (error) {
      console.error('Error fetching doctors orders:', error);
      throw error;
    }

    // Transform the data to include user names
    return (data || []).map(order => ({
      id: order.id,
      patient_id: order.patient_id,
      tenant_id: order.tenant_id,
      order_date: order.order_date,
      order_time: order.order_time,
      order_text: order.order_text,
      ordering_doctor: order.ordering_doctor,
      notes: order.notes,
      order_type: order.order_type,
      is_acknowledged: order.is_acknowledged,
      acknowledged_by: order.acknowledged_by,
      acknowledged_by_name: order.acknowledged_by_profile 
        ? `${order.acknowledged_by_profile.first_name} ${order.acknowledged_by_profile.last_name}`
        : undefined,
      acknowledged_at: order.acknowledged_at,
      doctor_name: order.doctor_name,
      created_by: order.created_by,
      created_by_name: order.created_by_profile 
        ? `${order.created_by_profile.first_name} ${order.created_by_profile.last_name}`
        : 'Unknown',
      created_at: order.created_at,
      updated_by: order.updated_by,
      updated_at: order.updated_at
    }));
  } catch (error) {
    console.error('Error in fetchDoctorsOrders:', error);
    throw error;
  }
};

/**
 * Create a new doctors order
 */
export const createDoctorsOrder = async (orderData: CreateDoctorsOrderData): Promise<DoctorsOrder> => {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    // Get patient's tenant_id
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('tenant_id')
      .eq('id', orderData.patient_id)
      .single();

    if (patientError || !patient) {
      throw new Error('Patient not found');
    }

    const { data, error } = await supabase
      .from('doctors_orders')
      .insert({
        ...orderData,
        tenant_id: patient.tenant_id,
        created_by: user.id,
        updated_by: user.id
      })
      .select(`
        *,
        created_by_profile:user_profiles!doctors_orders_created_by_fkey(first_name, last_name)
      `)
      .single();

    if (error) {
      console.error('Error creating doctors order:', error);
      throw error;
    }

    return {
      id: data.id,
      patient_id: data.patient_id,
      tenant_id: data.tenant_id,
      order_date: data.order_date,
      order_time: data.order_time,
      order_text: data.order_text,
      ordering_doctor: data.ordering_doctor,
      notes: data.notes,
      order_type: data.order_type,
      is_acknowledged: data.is_acknowledged,
      acknowledged_by: data.acknowledged_by,
      acknowledged_at: data.acknowledged_at,
      doctor_name: data.doctor_name,
      created_by: data.created_by,
      created_by_name: data.created_by_profile 
        ? `${data.created_by_profile.first_name} ${data.created_by_profile.last_name}`
        : 'Unknown',
      created_at: data.created_at,
      updated_by: data.updated_by,
      updated_at: data.updated_at
    };
  } catch (error) {
    console.error('Error in createDoctorsOrder:', error);
    throw error;
  }
};

/**
 * Update an existing doctors order (admin/super admin only)
 */
export const updateDoctorsOrder = async (orderId: string, orderData: UpdateDoctorsOrderData): Promise<DoctorsOrder> => {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    const { data, error } = await supabase
      .from('doctors_orders')
      .update({
        ...orderData,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select(`
        *,
        created_by_profile:user_profiles!doctors_orders_created_by_fkey(first_name, last_name),
        acknowledged_by_profile:user_profiles!doctors_orders_acknowledged_by_fkey(first_name, last_name)
      `)
      .single();

    if (error) {
      console.error('Error updating doctors order:', error);
      throw error;
    }

    return {
      id: data.id,
      patient_id: data.patient_id,
      tenant_id: data.tenant_id,
      order_date: data.order_date,
      order_time: data.order_time,
      order_text: data.order_text,
      ordering_doctor: data.ordering_doctor,
      notes: data.notes,
      order_type: data.order_type,
      is_acknowledged: data.is_acknowledged,
      acknowledged_by: data.acknowledged_by,
      acknowledged_by_name: data.acknowledged_by_profile 
        ? `${data.acknowledged_by_profile.first_name} ${data.acknowledged_by_profile.last_name}`
        : undefined,
      acknowledged_at: data.acknowledged_at,
      created_by: data.created_by,
      created_by_name: data.created_by_profile 
        ? `${data.created_by_profile.first_name} ${data.created_by_profile.last_name}`
        : 'Unknown',
      created_at: data.created_at,
      updated_by: data.updated_by,
      updated_at: data.updated_at
    };
  } catch (error) {
    console.error('Error in updateDoctorsOrder:', error);
    throw error;
  }
};

/**
 * Delete a doctors order (admin/super admin only)
 */
export const deleteDoctorsOrder = async (orderId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('doctors_orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      console.error('Error deleting doctors order:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteDoctorsOrder:', error);
    throw error;
  }
};

/**
 * Acknowledge a doctors order (nurses can do this)
 */
export const acknowledgeDoctorsOrder = async (orderId: string, studentName?: string): Promise<DoctorsOrder> => {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    const { data, error } = await supabase
      .from('doctors_orders')
      .update({
        is_acknowledged: true,
        acknowledged_by: user.id,
        acknowledged_by_student: studentName || null,
        acknowledged_at: new Date().toISOString(),
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select(`
        *,
        created_by_profile:user_profiles!doctors_orders_created_by_fkey(first_name, last_name),
        acknowledged_by_profile:user_profiles!doctors_orders_acknowledged_by_fkey(first_name, last_name)
      `)
      .single();

    if (error) {
      console.error('Error acknowledging doctors order:', error);
      throw error;
    }

    return {
      id: data.id,
      patient_id: data.patient_id,
      tenant_id: data.tenant_id,
      order_date: data.order_date,
      order_time: data.order_time,
      order_text: data.order_text,
      ordering_doctor: data.ordering_doctor,
      notes: data.notes,
      order_type: data.order_type,
      is_acknowledged: data.is_acknowledged,
      acknowledged_by: data.acknowledged_by,
      acknowledged_by_name: data.acknowledged_by_profile 
        ? `${data.acknowledged_by_profile.first_name} ${data.acknowledged_by_profile.last_name}`
        : undefined,
      acknowledged_at: data.acknowledged_at,
      created_by: data.created_by,
      created_by_name: data.created_by_profile 
        ? `${data.created_by_profile.first_name} ${data.created_by_profile.last_name}`
        : 'Unknown',
      created_at: data.created_at,
      updated_by: data.updated_by,
      updated_at: data.updated_at
    };
  } catch (error) {
    console.error('Error in acknowledgeDoctorsOrder:', error);
    throw error;
  }
};