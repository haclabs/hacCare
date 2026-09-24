/**
 * Doctors Orders Service
 * Handles CRUD operations for physician orders with role-based permissions
 */

import { supabase } from '../../lib/api/supabase';
import { DoctorsOrder } from '../../types';
import { secureLogger } from '../../lib/security/secureLogger';
import type { Row } from '../../lib/api/tables';
import { orUndefined } from '../../lib/api/tables';

/**
 * A `doctors_orders` row with the two `user_profiles` joins the queries select.
 *
 * PostgREST returns a to-one embed as a single object or null, not an array,
 * and only the columns named in the select -- hence Pick rather than the whole
 * profile row.
 */
type ProfileName = Pick<Row<'user_profiles'>, 'first_name' | 'last_name'>;
type OrderWithProfiles = Row<'doctors_orders'> & {
  created_by_profile: ProfileName | null;
  acknowledged_by_profile: ProfileName | null;
};

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
      secureLogger.error('Error fetching doctors orders:', error);
      throw error;
    }

    // Transform the data to include user names
    return (data || []).map((order: OrderWithProfiles) => ({
      id: order.id,
      patient_id: order.patient_id,
      tenant_id: order.tenant_id,
      order_date: order.order_date,
      order_time: order.order_time,
      order_text: order.order_text,
      ordering_doctor: order.ordering_doctor,
      notes: orUndefined(order.notes),
      // Postgres types this `text`; the domain narrows it to the three
      // values the UI offers. A row outside that set is a data problem, so
      // fall back to 'Direct' rather than widening the domain type.
      order_type: (order.order_type as DoctorsOrder['order_type']) ?? 'Direct',
      is_acknowledged: order.is_acknowledged ?? false,
      acknowledged_by: orUndefined(order.acknowledged_by),
      acknowledged_by_name: order.acknowledged_by_profile 
        ? `${order.acknowledged_by_profile.first_name} ${order.acknowledged_by_profile.last_name}`
        : undefined,
      acknowledged_at: orUndefined(order.acknowledged_at),
      doctor_name: orUndefined(order.doctor_name),
      created_by: order.created_by,
      created_by_name: order.created_by_profile 
        ? `${order.created_by_profile.first_name} ${order.created_by_profile.last_name}`
        : 'Unknown',
      created_at: order.created_at ?? '',
      updated_by: orUndefined(order.updated_by),
      updated_at: orUndefined(order.updated_at)
    }));
  } catch (error) {
    secureLogger.error('Error in fetchDoctorsOrders:', error);
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
      secureLogger.error('Error creating doctors order:', error);
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
    secureLogger.error('Error in createDoctorsOrder:', error);
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
      secureLogger.error('Error updating doctors order:', error);
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
    secureLogger.error('Error in updateDoctorsOrder:', error);
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
      secureLogger.error('Error deleting doctors order:', error);
      throw error;
    }
  } catch (error) {
    secureLogger.error('Error in deleteDoctorsOrder:', error);
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
      secureLogger.error('Error acknowledging doctors order:', error);
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
    secureLogger.error('Error in acknowledgeDoctorsOrder:', error);
    throw error;
  }
};