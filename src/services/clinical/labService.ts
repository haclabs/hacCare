// Lab Service
// Handles CRUD operations and flag computation for lab results

import { supabase } from '../../lib/api/supabase';
import type {
  LabPanel,
  LabResult,
  LabResultRef,
  LabAckEvent,
  CreateLabPanelInput,
  CreateLabResultInput,
  AcknowledgeLabsInput,
  LabFlag,
  PatientSex,
  SexSpecificRange,
  RefOperator,
  EffectiveRange,
  AbnormalResultSummary,
  LabCategory,
} from '../../features/clinical/types/labs';

// ============================================================================
// FLAG COMPUTATION
// ============================================================================

/**
 * Compute the lab flag based on value and reference ranges
 */
export function computeLabFlag(
  value: number | null,
  ref_low: number | null,
  ref_high: number | null,
  ref_operator: RefOperator,
  sex_ref: SexSpecificRange | null,
  patient_sex: PatientSex | null,
  critical_low: number | null,
  critical_high: number | null
): LabFlag {
  if (value === null) return 'normal';

  // Get effective bounds based on operator and sex
  const { low, high } = getEffectiveBounds(
    ref_low,
    ref_high,
    ref_operator,
    sex_ref,
    patient_sex
  );

  // Debug logging
  console.log('🔬 Lab Flag Computation:', {
    value,
    ref_operator,
    patient_sex,
    sex_ref,
    effectiveBounds: { low, high },
    critical_low,
    critical_high,
    ref_low,
    ref_high
  });

  // Check critical thresholds first
  if (critical_low !== null && value < critical_low) {
    console.log('✅ Flagged as CRITICAL_LOW');
    return 'critical_low';
  }
  if (critical_high !== null && value > critical_high) {
    console.log('✅ Flagged as CRITICAL_HIGH');
    return 'critical_high';
  }

  // Check abnormal thresholds
  if (ref_operator === '>=') {
    if (low !== null && value < low) {
      console.log('✅ Flagged as ABNORMAL_LOW (>= operator)');
      return 'abnormal_low';
    }
  } else if (ref_operator === '<=') {
    if (high !== null && value > high) {
      console.log('✅ Flagged as ABNORMAL_HIGH (<= operator)');
      return 'abnormal_high';
    }
  } else {
    // 'between' or 'sex-specific'
    if (low !== null && value < low) {
      console.log('✅ Flagged as ABNORMAL_LOW');
      return 'abnormal_low';
    }
    if (high !== null && value > high) {
      console.log('✅ Flagged as ABNORMAL_HIGH');
      return 'abnormal_high';
    }
  }

  console.log('✅ Flagged as NORMAL');
  return 'normal';
}

/**
 * Get effective reference bounds based on operator and sex
 */
export function getEffectiveBounds(
  ref_low: number | null,
  ref_high: number | null,
  ref_operator: RefOperator,
  sex_ref: SexSpecificRange | null,
  patient_sex: PatientSex | null
): { low: number | null; high: number | null } {
  if (ref_operator === 'sex-specific' && sex_ref && patient_sex) {
    const sexData = sex_ref[patient_sex as 'male' | 'female'];
    if (sexData) {
      return {
        low: sexData.low ?? null,
        high: sexData.high ?? null,
      };
    }
    // Fallback: use widest bounds if sex unknown
    const maleLow = sex_ref.male?.low;
    const femaleLow = sex_ref.female?.low;
    const maleHigh = sex_ref.male?.high;
    const femaleHigh = sex_ref.female?.high;
    
    return {
      low: maleLow !== undefined && femaleLow !== undefined 
        ? Math.min(maleLow, femaleLow) 
        : maleLow ?? femaleLow ?? null,
      high: maleHigh !== undefined && femaleHigh !== undefined
        ? Math.max(maleHigh, femaleHigh)
        : maleHigh ?? femaleHigh ?? null,
    };
  }

  return { low: ref_low, high: ref_high };
}

/**
 * Get display string for reference range
 */
export function getEffectiveRangeDisplay(
  ref_low: number | null,
  ref_high: number | null,
  ref_operator: RefOperator,
  sex_ref: SexSpecificRange | null,
  patient_sex: PatientSex | null
): EffectiveRange {
  if (ref_operator === 'sex-specific' && sex_ref) {
    const parts: string[] = [];
    if (sex_ref.male) {
      const m = sex_ref.male;
      if (m.low !== undefined && m.high !== undefined) {
        parts.push(`M: ${m.low}–${m.high}`);
      } else if (m.low !== undefined) {
        parts.push(`M: ≥${m.low}`);
      } else if (m.high !== undefined) {
        parts.push(`M: ≤${m.high}`);
      }
    }
    if (sex_ref.female) {
      const f = sex_ref.female;
      if (f.low !== undefined && f.high !== undefined) {
        parts.push(`F: ${f.low}–${f.high}`);
      } else if (f.low !== undefined) {
        parts.push(`F: ≥${f.low}`);
      } else if (f.high !== undefined) {
        parts.push(`F: ≤${f.high}`);
      }
    }
    
    const { low, high } = getEffectiveBounds(ref_low, ref_high, ref_operator, sex_ref, patient_sex);
    return {
      low,
      high,
      display: parts.join(', '),
    };
  }

  if (ref_operator === '>=') {
    return {
      low: ref_low,
      high: null,
      display: ref_low !== null ? `≥${ref_low}` : '',
    };
  }

  if (ref_operator === '<=') {
    return {
      low: null,
      high: ref_high,
      display: ref_high !== null ? `≤${ref_high}` : '',
    };
  }

  // 'between'
  if (ref_low !== null && ref_high !== null) {
    return {
      low: ref_low,
      high: ref_high,
      display: `${ref_low}–${ref_high}`,
    };
  } else if (ref_low !== null) {
    return {
      low: ref_low,
      high: null,
      display: `≥${ref_low}`,
    };
  } else if (ref_high !== null) {
    return {
      low: null,
      high: ref_high,
      display: `≤${ref_high}`,
    };
  }

  return { low: null, high: null, display: '' };
}

// ============================================================================
// REFERENCE RANGES
// ============================================================================

/**
 * Get all reference ranges
 */
export async function getLabResultRefs(): Promise<{ data: LabResultRef[] | null; error: any }> {
  const { data, error } = await supabase
    .from('lab_result_refs')
    .select('*')
    .order('category')
    .order('display_order');

  return { data, error };
}

/**
 * Get reference ranges by category
 */
export async function getLabResultRefsByCategory(
  category: LabCategory
): Promise<{ data: LabResultRef[] | null; error: any }> {
  const { data, error } = await supabase
    .from('lab_result_refs')
    .select('*')
    .eq('category', category)
    .order('display_order');

  return { data, error };
}

/**
 * Get a single reference by test code
 */
export async function getLabResultRef(
  test_code: string
): Promise<{ data: LabResultRef | null; error: any }> {
  const { data, error } = await supabase
    .from('lab_result_refs')
    .select('*')
    .eq('test_code', test_code)
    .single();

  return { data, error };
}

// ============================================================================
// LAB PANELS
// ============================================================================

/**
 * Get lab panels for a patient
 */
export async function getLabPanels(
  patientId: string,
  tenantId: string
): Promise<{ data: LabPanel[] | null; error: any }> {
  const { data, error } = await supabase
    .from('lab_panels')
    .select(`
      *,
      entered_by_name:user_profiles!lab_panels_entered_by_fkey(first_name, last_name)
    `)
    .eq('patient_id', patientId)
    .eq('tenant_id', tenantId)
    .order('panel_time', { ascending: false });

  // Flatten entered_by_name
  const panels = data?.map(panel => ({
    ...panel,
    entered_by_name: panel.entered_by_name
      ? `${panel.entered_by_name.first_name} ${panel.entered_by_name.last_name}`.trim()
      : null,
  }));

  return { data: panels as LabPanel[] | null, error };
}

/**
 * Get a single lab panel with results
 */
export async function getLabPanel(
  panelId: string
): Promise<{ data: LabPanel | null; error: any }> {
  const { data, error } = await supabase
    .from('lab_panels')
    .select(`
      *,
      entered_by_name:user_profiles!lab_panels_entered_by_fkey(first_name, last_name)
    `)
    .eq('id', panelId)
    .single();

  if (data) {
    const panel = {
      ...data,
      entered_by_name: data.entered_by_name
        ? `${data.entered_by_name.first_name} ${data.entered_by_name.last_name}`.trim()
        : null,
    };
    return { data: panel as LabPanel, error: null };
  }

  return { data: null, error };
}

/**
 * Create a new lab panel
 */
export async function createLabPanel(
  input: CreateLabPanelInput,
  tenantId: string
): Promise<{ data: LabPanel | null; error: any }> {
  const { data: userData } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('lab_panels')
    .insert({
      tenant_id: tenantId,
      patient_id: input.patient_id,
      panel_time: input.panel_time,
      source: input.source || 'manual entry',
      notes: input.notes,
      ack_required: input.ack_required ?? true,
      entered_by: userData.user?.id,
      status: 'new',
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Update a lab panel
 */
export async function updateLabPanel(
  panelId: string,
  updates: Partial<LabPanel>
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('lab_panels')
    .update(updates)
    .eq('id', panelId);

  return { error };
}

/**
 * Delete a lab panel (cascades to results)
 */
export async function deleteLabPanel(panelId: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('lab_panels')
    .delete()
    .eq('id', panelId);

  return { error };
}

// ============================================================================
// LAB RESULTS
// ============================================================================

/**
 * Get lab results for a panel
 */
export async function getLabResults(
  panelId: string
): Promise<{ data: LabResult[] | null; error: any }> {
  const { data, error } = await supabase
    .from('lab_results')
    .select(`
      *,
      entered_by_name:user_profiles!lab_results_entered_by_fkey(first_name, last_name),
      ack_by_name:user_profiles!lab_results_ack_by_fkey(first_name, last_name)
    `)
    .eq('panel_id', panelId)
    .order('category')
    .order('test_code');

  // Flatten names
  const results = data?.map(result => ({
    ...result,
    entered_by_name: result.entered_by_name
      ? `${result.entered_by_name.first_name} ${result.entered_by_name.last_name}`.trim()
      : null,
    ack_by_name: result.ack_by_name
      ? `${result.ack_by_name.first_name} ${result.ack_by_name.last_name}`.trim()
      : null,
  }));

  return { data: results as LabResult[] | null, error };
}

/**
 * Get previous lab result for the same test (from earlier panels)
 * NOTE: Only finds results within the SAME tenant (simulation session)
 * This prevents showing results from previous simulation sessions
 */
export async function getPreviousLabResult(
  patientId: string,
  testCode: string,
  currentResultCreatedAt: string,
  tenantId: string
): Promise<{ data: LabResult | null; error: any }> {
  // Join through lab_panels to filter by patient_id
  // lab_results doesn't have patient_id, only panel_id
  const { data, error } = await supabase
    .from('lab_results')
    .select(`
      *,
      lab_panels!inner(patient_id, tenant_id)
    `)
    .eq('lab_panels.patient_id', patientId)
    .eq('lab_panels.tenant_id', tenantId)
    .eq('test_code', testCode)
    .lt('created_at', currentResultCreatedAt)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Remove the joined panel data before returning
  if (data) {
    const { lab_panels, ...result } = data as any;
    return { data: result as LabResult, error: null };
  }

  return { data: null, error };
}

/**
 * Create a new lab result
 */
export async function createLabResult(
  input: CreateLabResultInput,
  patientId: string,
  tenantId: string
): Promise<{ data: LabResult | null; error: any }> {
  const { data: userData } = await supabase.auth.getUser();

  // Get patient sex for flag computation
  const { data: patientData } = await supabase
    .from('patients')
    .select('gender')
    .eq('id', patientId)
    .single();

  const patientSex = patientData?.gender?.toLowerCase() as PatientSex || null;

  // Compute flag
  const flag = computeLabFlag(
    input.value,
    input.ref_low ?? null,
    input.ref_high ?? null,
    input.ref_operator || 'between',
    input.sex_ref || null,
    patientSex,
    input.critical_low ?? null,
    input.critical_high ?? null
  );

  const { data, error } = await supabase
    .from('lab_results')
    .insert({
      tenant_id: tenantId,
      patient_id: patientId,
      panel_id: input.panel_id,
      category: input.category,
      test_code: input.test_code,
      test_name: input.test_name,
      value: input.value,
      units: input.units,
      ref_low: input.ref_low,
      ref_high: input.ref_high,
      ref_operator: input.ref_operator || 'between',
      sex_ref: input.sex_ref,
      critical_low: input.critical_low,
      critical_high: input.critical_high,
      flag,
      comments: input.comments,
      entered_by: userData.user?.id,
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Update a lab result and recompute flag
 */
export async function updateLabResult(
  resultId: string,
  updates: Partial<LabResult>,
  patientId: string
): Promise<{ error: any }> {
  // If value changed, recompute flag
  if (updates.value !== undefined) {
    const { data: result } = await supabase
      .from('lab_results')
      .select('*')
      .eq('id', resultId)
      .single();

    if (result) {
      const { data: patientData } = await supabase
        .from('patients')
        .select('gender')
        .eq('id', patientId)
        .single();

      const patientSex = patientData?.gender?.toLowerCase() as PatientSex || null;

      updates.flag = computeLabFlag(
        updates.value ?? result.value,
        updates.ref_low ?? result.ref_low,
        updates.ref_high ?? result.ref_high,
        updates.ref_operator ?? result.ref_operator,
        updates.sex_ref ?? result.sex_ref,
        patientSex,
        updates.critical_low ?? result.critical_low,
        updates.critical_high ?? result.critical_high
      );
    }
  }

  const { error } = await supabase
    .from('lab_results')
    .update(updates)
    .eq('id', resultId);

  return { error };
}

/**
 * Delete a lab result
 */
export async function deleteLabResult(resultId: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('lab_results')
    .delete()
    .eq('id', resultId);

  return { error };
}

// ============================================================================
// ACKNOWLEDGEMENT
// ============================================================================

/**
 * Acknowledge lab results
 */
export async function acknowledgeLabs(
  input: AcknowledgeLabsInput,
  patientId: string,
  tenantId: string,
  studentName?: string
): Promise<{ error: any }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    return { error: { message: 'User not authenticated' } };
  }

  // Get results to acknowledge
  let query = supabase
    .from('lab_results')
    .select('*')
    .eq('panel_id', input.panel_id);

  if (input.scope === 'result' && input.result_ids) {
    query = query.in('id', input.result_ids);
  }

  const { data: results, error: fetchError } = await query;

  if (fetchError) return { error: fetchError };

  // Build abnormal summary
  const abnormal_summary: AbnormalResultSummary[] = results
    ?.filter(r => r.flag !== 'normal')
    .map(r => ({
      test_code: r.test_code,
      test_name: r.test_name,
      value: r.value!,
      units: r.units,
      ref_range: getEffectiveRangeDisplay(
        r.ref_low,
        r.ref_high,
        r.ref_operator,
        r.sex_ref,
        null
      ).display,
      flag: r.flag,
    })) || [];

  // Update results
  const resultIds = results?.map(r => r.id) || [];
  const { error: updateError } = await supabase
    .from('lab_results')
    .update({
      ack_by: userId,
      acknowledged_by_student: studentName || null,
      ack_at: new Date().toISOString(),
    })
    .in('id', resultIds);

  if (updateError) return { error: updateError };

  // Log acknowledgement event
  const { error: logError } = await supabase
    .from('lab_ack_events')
    .insert({
      tenant_id: tenantId,
      patient_id: patientId,
      panel_id: input.panel_id,
      ack_scope: input.scope,
      ack_by: userId,
      abnormal_summary: abnormal_summary.length > 0 ? abnormal_summary : null,
      note: input.note,
    });

  if (logError) return { error: logError };

  // Panel status will be updated by trigger

  return { error: null };
}

/**
 * Check if there are unacknowledged labs for a patient
 */
export async function hasUnacknowledgedLabs(
  patientId: string,
  tenantId: string
): Promise<{ hasUnacked: boolean; error: any }> {
  const { data, error } = await supabase
    .from('lab_panels')
    .select('id')
    .eq('patient_id', patientId)
    .eq('tenant_id', tenantId)
    .in('status', ['new', 'partial_ack'])
    .limit(1);

  return { hasUnacked: (data?.length || 0) > 0, error };
}

/**
 * Create standard test set from reference data
 */
export async function createStandardLabSet(
  panelId: string,
  category: LabCategory,
  patientId: string,
  tenantId: string
): Promise<{ error: any }> {
  // Get reference tests for category
  const { data: refs, error: refError } = await getLabResultRefsByCategory(category);
  
  if (refError || !refs) return { error: refError || { message: 'No reference data found' } };

  // Create results for each test (with null values initially)
  const results = refs.map(ref => ({
    panel_id: panelId,
    category: ref.category,
    test_code: ref.test_code,
    test_name: ref.test_name,
    value: null,
    units: ref.units,
    ref_low: ref.ref_low,
    ref_high: ref.ref_high,
    ref_operator: ref.ref_operator,
    sex_ref: ref.sex_ref,
    critical_low: ref.critical_low,
    critical_high: ref.critical_high,
  }));

  // Insert all results
  const errors = [];
  for (const result of results) {
    const { error } = await createLabResult(result, patientId, tenantId);
    if (error) errors.push(error);
  }

  return { error: errors.length > 0 ? errors[0] : null };
}
