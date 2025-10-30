// Simulation Hooks for the new clean architecture
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// Types for the new simulation system
export interface SimTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  specialty?: string;
  difficulty_level: number;
  estimated_duration: number;
  learning_objectives: string[];
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SimSnapshot {
  id: string;
  template_id: string;
  version: number;
  name: string;
  description?: string;
  snapshot_data: any;
  created_by: string;
  created_at: string;
}

export interface SimRun {
  id: string;
  snapshot_id: string;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  started_at: string;
  ended_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SimRunPatient {
  id: string;
  run_id: string;
  template_patient_id: string;
  public_patient_id: string; // The printed wristband ID
  room?: string;
  bed?: string;
  demographics: any;
  baseline_vitals: any;
  baseline_alerts: any[];
  recent_vitals?: any[];
  recent_med_admin?: any[];
  acknowledged_alerts?: any[];
}

export interface SimRunBarcodePool {
  id: string;
  run_id: string;
  template_barcode_id: string;
  public_barcode_id: string; // The printed barcode
  medication_name: string;
  assigned_to_patient_id?: string;
  assigned_at?: string;
}

// Initialize Supabase client (you'll need to configure this)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ===============================================
// MAIN SIMULATION RUN HOOK
// ===============================================
export function useSimRun(runId: string) {
  const [run, setRun] = useState<SimRun | null>(null);
  const [patients, setPatients] = useState<SimRunPatient[]>([]);
  const [barcodePool, setBarcodePool] = useState<SimRunBarcodePool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch run data
  const fetchRunData = useCallback(async () => {
    if (!runId) return;

    try {
      setLoading(true);
      setError(null);

      // Get run details
      const { data: runData, error: runError } = await supabase
        .from('sim_runs')
        .select('*')
        .eq('id', runId)
        .single();

      if (runError) throw runError;
      setRun(runData);

      // Get patients with current state using the view
      const { data: patientsData, error: patientsError } = await supabase
        .from('sim_run_patient_current_state')
        .select('*')
        .eq('run_id', runId);

      if (patientsError) throw patientsError;
      setPatients(patientsData || []);

      // Get barcode pool
      const { data: barcodeData, error: barcodeError } = await supabase
        .from('sim_run_barcode_pool')
        .select('*')
        .eq('run_id', runId);

      if (barcodeError) throw barcodeError;
      setBarcodePool(barcodeData || []);

    } catch (err) {
      console.error('Error fetching run data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch run data');
    } finally {
      setLoading(false);
    }
  }, [runId]);

  // Reset simulation - the bulletproof function
  const resetSimulation = useCallback(async () => {
    if (!runId) return;

    try {
      setLoading(true);
      setError(null);

      // Call the reset RPC function
      const { data, error } = await supabase.rpc('reset_run', {
        p_run_id: runId
      });

      if (error) throw error;

      console.log('Reset completed:', data);
      
      // Refetch all data to show baseline state
      await fetchRunData();

      return data;
    } catch (err) {
      console.error('Error resetting simulation:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset simulation');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [runId, fetchRunData]);

  // Record vitals
  const recordVitals = useCallback(async (
    patientId: string,
    vitalType: string,
    value: any
  ) => {
    try {
      const { error } = await supabase
        .from('sim_run_vitals_events')
        .insert({
          run_id: runId,
          run_patient_id: patientId,
          vital_type: vitalType,
          value: value,
          recorded_by: supabase.auth.getUser().then(u => u.data.user?.id)
        });

      if (error) throw error;

      // Refresh patients to show new vitals
      await fetchRunData();
    } catch (err) {
      console.error('Error recording vitals:', err);
      setError(err instanceof Error ? err.message : 'Failed to record vitals');
      throw err;
    }
  }, [runId, fetchRunData]);

  // Administer medication
  const administerMedication = useCallback(async (
    patientId: string,
    barcodeScanned: string,
    medicationName: string,
    doseGiven: any,
    notes?: string
  ) => {
    try {
      const { error } = await supabase
        .from('sim_run_med_admin_events')
        .insert({
          run_id: runId,
          run_patient_id: patientId,
          barcode_scanned: barcodeScanned,
          medication_name: medicationName,
          dose_given: doseGiven,
          notes: notes,
          administered_by: supabase.auth.getUser().then(u => u.data.user?.id)
        });

      if (error) throw error;

      // Update barcode assignment if needed
      await supabase
        .from('sim_run_barcode_pool')
        .update({
          assigned_to_patient_id: patientId,
          assigned_at: new Date().toISOString()
        })
        .eq('run_id', runId)
        .eq('public_barcode_id', barcodeScanned);

      await fetchRunData();
    } catch (err) {
      console.error('Error administering medication:', err);
      setError(err instanceof Error ? err.message : 'Failed to administer medication');
      throw err;
    }
  }, [runId, fetchRunData]);

  // Acknowledge alert
  const acknowledgeAlert = useCallback(async (
    patientId: string,
    alertKey: string,
    alertType: string,
    alertMessage: string,
    severity: string
  ) => {
    try {
      const { error } = await supabase
        .from('sim_run_alert_acks')
        .insert({
          run_id: runId,
          run_patient_id: patientId,
          alert_key: alertKey,
          alert_type: alertType,
          alert_message: alertMessage,
          severity: severity,
          acknowledged_by: supabase.auth.getUser().then(u => u.data.user?.id)
        });

      if (error) throw error;
      await fetchRunData();
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      setError(err instanceof Error ? err.message : 'Failed to acknowledge alert');
      throw err;
    }
  }, [runId, fetchRunData]);

  // Add note
  const addNote = useCallback(async (
    patientId: string,
    noteType: string,
    title: string,
    content: string,
    authorRole: string = 'student'
  ) => {
    try {
      const { error } = await supabase
        .from('sim_run_notes')
        .insert({
          run_id: runId,
          run_patient_id: patientId,
          note_type: noteType,
          author_id: supabase.auth.getUser().then(u => u.data.user?.id),
          author_role: authorRole,
          title: title,
          content: content
        });

      if (error) throw error;
      await fetchRunData();
    } catch (err) {
      console.error('Error adding note:', err);
      setError(err instanceof Error ? err.message : 'Failed to add note');
      throw err;
    }
  }, [runId, fetchRunData]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!runId) return;

    // Subscribe to reset notifications
    const resetChannel = supabase
      .channel('sim_run_reset')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'sim_runs',
          filter: `id=eq.${runId}`
        }, 
        () => {
          console.log('Run updated, refetching data');
          fetchRunData();
        }
      )
      .subscribe();

    // Subscribe to event table changes
    const eventsChannel = supabase
      .channel('sim_run_events')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sim_run_vitals_events',
          filter: `run_id=eq.${runId}`
        },
        () => fetchRunData()
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'sim_run_med_admin_events',
          filter: `run_id=eq.${runId}`
        },
        () => fetchRunData()
      )
      .subscribe();

    return () => {
      resetChannel.unsubscribe();
      eventsChannel.unsubscribe();
    };
  }, [runId, fetchRunData]);

  // Initial data fetch
  useEffect(() => {
    fetchRunData();
  }, [fetchRunData]);

  return {
    run,
    patients,
    barcodePool,
    loading,
    error,
    // Actions
    resetSimulation,
    recordVitals,
    administerMedication,
    acknowledgeAlert,
    addNote,
    // Utilities
    refetch: fetchRunData
  };
}

// ===============================================
// TEMPLATE MANAGEMENT HOOKS  
// ===============================================
export function useSimTemplates() {
  const [templates, setTemplates] = useState<SimTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sim_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return { templates, loading, error, refetch: fetchTemplates };
}

// ===============================================
// SNAPSHOT MANAGEMENT HOOKS
// ===============================================
export function useSimSnapshots(templateId?: string) {
  const [snapshots, setSnapshots] = useState<SimSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshots = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('sim_snapshots')
        .select('*')
        .order('created_at', { ascending: false });

      if (templateId) {
        query = query.eq('template_id', templateId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSnapshots(data || []);
    } catch (err) {
      console.error('Error fetching snapshots:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch snapshots');
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  const createSnapshot = useCallback(async (
    templateId: string,
    name: string,
    description?: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('create_snapshot', {
        p_template_id: templateId,
        p_name: name,
        p_description: description
      });

      if (error) throw error;
      await fetchSnapshots();
      return data;
    } catch (err) {
      console.error('Error creating snapshot:', err);
      throw err;
    }
  }, [fetchSnapshots]);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  return { snapshots, loading, error, createSnapshot, refetch: fetchSnapshots };
}

// ===============================================
// RUN MANAGEMENT HOOKS
// ===============================================
export function useSimRuns() {
  const [runs, setRuns] = useState<SimRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sim_runs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRuns(data || []);
    } catch (err) {
      console.error('Error fetching runs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch runs');
    } finally {
      setLoading(false);
    }
  }, []);

  const launchRun = useCallback(async (
    snapshotId: string,
    runName: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('launch_run', {
        p_snapshot_id: snapshotId,
        p_run_name: runName
      });

      if (error) throw error;
      await fetchRuns();
      return data;
    } catch (err) {
      console.error('Error launching run:', err);
      throw err;
    }
  }, [fetchRuns]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  return { runs, loading, error, launchRun, refetch: fetchRuns };
}