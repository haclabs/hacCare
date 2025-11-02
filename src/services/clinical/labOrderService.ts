/**
 * Lab Orders Service
 * Handles CRUD operations for lab specimen orders
 */

import { supabase } from '../../lib/api/supabase';
import type { LabOrder, CreateLabOrderInput } from '../../features/clinical/types/labOrders';

/**
 * Create a new lab order
 */
export const createLabOrder = async (
  input: CreateLabOrderInput,
  tenantId: string
): Promise<{ data: LabOrder | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('lab_orders')
      .insert([{
        ...input,
        tenant_id: tenantId,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating lab order:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create lab order';
    return { 
      data: null, 
      error: message
    };
  }
};

/**
 * Get all lab orders for a patient
 */
export const getLabOrders = async (
  patientId: string,
  tenantId: string
): Promise<{ data: LabOrder[] | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('lab_orders')
      .select('*')
      .eq('patient_id', patientId)
      .eq('tenant_id', tenantId)
      .order('order_date', { ascending: false })
      .order('order_time', { ascending: false });

    if (error) {
      console.error('Error fetching lab orders:', error);
      return { data: null, error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch lab orders';
    return { 
      data: null, 
      error: message
    };
  }
};

/**
 * Get a single lab order by ID
 */
export const getLabOrder = async (
  orderId: string
): Promise<{ data: LabOrder | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('lab_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) {
      console.error('Error fetching lab order:', error);
      return { data: null, error: error.message };
    }

    return { data: data || null, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch lab order';
    return { 
      data: null, 
      error: message
    };
  }
};

/**
 * Update lab order status
 */
export const updateLabOrderStatus = async (
  orderId: string,
  status: string
): Promise<{ data: LabOrder | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('lab_orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('Error updating lab order status:', error);
      return { data: null, error: error.message };
    }

    return { data: data || null, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update lab order status';
    return { 
      data: null, 
      error: message
    };
  }
};

/**
 * Mark label as printed
 */
export const markLabelPrinted = async (
  orderId: string
): Promise<{ data: LabOrder | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('lab_orders')
      .update({
        label_printed: true,
        label_printed_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('Error marking label as printed:', error);
      return { data: null, error: error.message };
    }

    return { data: data || null, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to mark label as printed';
    return { 
      data: null, 
      error: message
    };
  }
};

/**
 * Delete a lab order
 */
export const deleteLabOrder = async (
  orderId: string
): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase
      .from('lab_orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      console.error('Error deleting lab order:', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete lab order';
    return { 
      error: message
    };
  }
};
