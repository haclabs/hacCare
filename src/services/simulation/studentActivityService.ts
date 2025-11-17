/**
 * ===========================================================================
 * STUDENT ACTIVITY TRACKING SERVICE
 * ===========================================================================
 * Aggregate all student entries across clinical tables for debrief reports
 * ===========================================================================
 */

import { supabase } from '../../lib/api/supabase';

export interface StudentActivity {
  studentName: string;
  totalEntries: number;
  activities: {
    vitals: VitalsEntry[];
    medications: MedicationAdministrationEntry[];
    labOrders: LabOrderEntry[];
    labAcknowledgements: LabAcknowledgementEntry[];
    doctorsOrders: DoctorsOrderEntry[];
    patientNotes: PatientNoteEntry[];
    handoverNotes: HandoverNoteEntry[];
    hacmapDevices: HacMapDeviceEntry[];
    hacmapWounds: HacMapWoundEntry[];
    deviceAssessments: DeviceAssessmentEntry[]; // ✅ NEW: hacMap v2
    woundAssessments: WoundAssessmentEntry[]; // ✅ NEW: hacMap v2
    bowelAssessments: BowelAssessmentEntry[];
    intakeOutput: IntakeOutputEntry[];
  };
}

interface VitalsEntry {
  id: string;
  recorded_at: string;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  heart_rate: number | null;
  respiratory_rate: number | null;
  temperature: number | null;
  oxygen_saturation: number | null;
  pain_score: number | null;
}

interface MedicationAdministrationEntry {
  id: string;
  timestamp: string;
  medication_name: string | null;
  dosage: string | null;
  route: string | null;
  status: string | null;
  notes: string | null;
  barcode_scanned?: boolean | null; // ✅ True if all BCMA checks passed
  patient_barcode_scanned?: string | null; // ✅ Actual patient barcode scanned
  medication_barcode_scanned?: string | null; // ✅ Actual medication barcode scanned
  override_reason?: string | null; // ✅ Reason if checks were overridden
  witness_name?: string | null; // ✅ Witness for manual overrides
}

interface LabOrderEntry {
  id: string;
  ordered_at: string;
  test_name: string;
  priority: string;
  specimen_type: string;
  status: string;
}

interface LabAcknowledgementEntry {
  id: string;
  acknowledged_at: string;
  test_name: string;
  result_value: string;
  abnormal_flag: boolean;
}

interface DoctorsOrderEntry {
  id: string;
  acknowledged_at: string;
  order_type: string;
  order_text: string | null;
  order_details: any;
}

interface PatientNoteEntry {
  id: string;
  created_at: string;
  note_type: string;
  subject: string;
  content: string;
}

interface HandoverNoteEntry {
  id: string;
  created_at: string;
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  student_name: string | null;
}

interface HacMapDeviceEntry {
  id: string;
  created_at: string;
  type: string;
  placement_date: string | null;
  inserted_by: string | null;
  location: string | null;
  site: string | null;
  tube_size_fr?: string | null;
  reservoir_type?: string | null;
  reservoir_size_ml?: number | null;
  orientation?: string[] | null;
  tube_number?: number | null;
  number_of_sutures_placed?: number | null;
  securement_method?: string[] | null;
  patient_tolerance?: string | null;
}

interface HacMapWoundEntry {
  id: string;
  created_at: string;
  wound_type: string;
  wound_description: string | null;
  wound_length_cm: number | null;
  wound_width_cm: number | null;
  wound_depth_cm: number | null;
  wound_stage: string | null;
  wound_appearance: string | null;
  drainage_type: string[] | null;
  drainage_amount: string | null;
  location: string | null;
}

interface DeviceAssessmentEntry {
  id: string;
  assessed_at: string;
  device_type: string;
  status: string | null;
  output_amount_ml: number | null;
  notes: string | null;
  assessment_data: any; // JSONB with device-specific fields
}

interface WoundAssessmentEntry {
  id: string;
  assessed_at: string;
  site_condition: string | null;
  pain_level: number | null;
  wound_appearance: string | null;
  drainage_type: string | null;
  drainage_amount: string | null;
  treatment_applied: string | null;
  dressing_type: string | null;
  notes: string | null;
}

interface BowelAssessmentEntry {
  id: string;
  created_at: string;
  bowel_incontinence: string;
  stool_appearance: string;
  stool_consistency: string;
  stool_colour: string;
  stool_amount: string;
}

interface IntakeOutputEntry {
  id: string;
  event_timestamp: string;
  direction: 'intake' | 'output';
  category: string;
  route: string | null;
  description: string | null;
  amount_ml: number;
}

/**
 * Get all activities for a specific simulation grouped by student
 */
export async function getStudentActivitiesBySimulation(
  simulationId: string
): Promise<StudentActivity[]> {
  try {
    console.log('🎯 getStudentActivitiesBySimulation called with simulation ID:', simulationId);
    
    // Try to get tenant_id from simulation_active first, then simulation_history
    let tenantId: string | null = null;
    
    const { data: activeSim, error: activeError } = await supabase
      .from('simulation_active')
      .select('tenant_id')
      .eq('id', simulationId)
      .maybeSingle();

    console.log('📋 Active simulation query result:', { activeSim, activeError });

    if (activeSim?.tenant_id) {
      tenantId = activeSim.tenant_id;
      console.log('✅ Found in simulation_active with tenant_id:', tenantId);
    } else {
      // Not in active, check history
      console.log('🔍 Not in active, checking simulation_history...');
      const { data: historySim, error: historyError } = await supabase
        .from('simulation_history')
        .select('tenant_id')
        .eq('id', simulationId)
        .maybeSingle();
      
      console.log('📜 History simulation query result:', { historySim, historyError });
      
      if (historySim?.tenant_id) {
        tenantId = historySim.tenant_id;
        console.log('✅ Found in simulation_history with tenant_id:', tenantId);
      }
    }

    if (!tenantId) {
      console.warn('❌ Could not determine tenant for simulation:', simulationId);
      return [];
    }

    console.log('🔍 Looking for patient(s) with tenant_id:', tenantId);

    // Get the patient_id for this tenant (limit 1 in case there are duplicates)
    const { data: patients, error: patientError } = await supabase
      .from('patients')
      .select('id, first_name, last_name')
      .eq('tenant_id', tenantId)
      .limit(1);

    if (patientError) {
      console.error('Error fetching patient:', patientError);
    }

    const patient = patients?.[0];
    console.log('👤 Patient found:', patient);

    if (!patient?.id) {
      // No patient found - return empty results instead of error
      console.warn('⚠️ No patient found for tenant_id:', tenantId, '- returning empty activities');
      return [];
    }

    const patientId = patient.id;
    console.log('✅ Using patient_id:', patientId, 'for student activity queries');

    // Fetch all activities in parallel
    const [
      vitalsData,
      medicationsData,
      labOrdersData,
      labAcksData,
      doctorsOrdersData,
      patientNotesData,
      handoverNotesData,
      bowelData,
      devicesData,
      woundsData,
      deviceAssessmentsData, // ✅ NEW: hacMap v2
      woundAssessmentsData, // ✅ NEW: hacMap v2
      intakeOutputData,
    ] = await Promise.all([
      // Vitals
      supabase
        .from('patient_vitals')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('patient_id', patientId)
        .not('student_name', 'is', null)
        .order('recorded_at', { ascending: false }),

      // Medication Administrations (BCMA)
      supabase
        .from('medication_administrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('patient_id', patientId)
        .not('student_name', 'is', null)
        .order('timestamp', { ascending: false })
        .then(result => {
          console.log('💊 Medications query result:', { 
            count: result.data?.length || 0, 
            error: result.error,
            data: result.data 
          });
          return result;
        }),

      // Lab Orders
      supabase
        .from('lab_orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('patient_id', patientId)
        .not('student_name', 'is', null)
        .order('created_at', { ascending: false }),

      // Lab Acknowledgements  
      supabase
        .from('lab_results')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('patient_id', patientId)
        .not('acknowledged_by_student', 'is', null)
        .order('ack_at', { ascending: false }),

      // Doctor's Orders Acknowledgements (with full order details)
      supabase
        .from('doctors_orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('patient_id', patientId)
        .not('acknowledged_by_student', 'is', null)
        .order('acknowledged_at', { ascending: false }),

      // Patient Notes
      supabase
        .from('patient_notes')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('patient_id', patientId)
        .not('student_name', 'is', null)
        .order('created_at', { ascending: false }),

      // Handover Notes (no tenant_id column in this table)
      supabase
        .from('handover_notes')
        .select('*')
        .eq('patient_id', patientId)
        .not('student_name', 'is', null)
        .order('created_at', { ascending: false }),

      // Bowel Records
      supabase
        .from('bowel_records')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('patient_id', patientId)
        .not('student_name', 'is', null)
        .order('created_at', { ascending: false }),

      // Devices (from HAC Map) - query devices table directly
      supabase
        .from('devices')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('patient_id', patientId)
        .not('inserted_by', 'is', null)
        .order('created_at', { ascending: false })
        .then(result => {
          console.log('🔧 Devices query result:', {
            count: result.data?.length || 0,
            error: result.error,
            data: result.data
          });
          return result;
        }),

      // Wounds (from HAC Map) - query wounds table directly
      supabase
        .from('wounds')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('patient_id', patientId)
        .not('entered_by', 'is', null)
        .order('created_at', { ascending: false })
        .then(result => {
          console.log('🩹 Wounds query result:', {
            count: result.data?.length || 0,
            error: result.error,
            data: result.data
          });
          return result;
        }),

      // Device Assessments (hacMap v2) - NEW
      supabase
        .from('device_assessments')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('patient_id', patientId)
        .not('student_name', 'is', null)
        .order('assessed_at', { ascending: false })
        .then(result => {
          console.log('🔧📋 Device Assessments query result:', {
            count: result.data?.length || 0,
            error: result.error,
            data: result.data
          });
          return result;
        }),

      // Wound Assessments (hacMap v2) - NEW
      supabase
        .from('wound_assessments')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('patient_id', patientId)
        .not('student_name', 'is', null)
        .order('assessed_at', { ascending: false })
        .then(result => {
          console.log('🩹📋 Wound Assessments query result:', {
            count: result.data?.length || 0,
            error: result.error,
            data: result.data
          });
          return result;
        }),

      // Intake & Output Events
      supabase
        .from('patient_intake_output_events')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('patient_id', patientId)
        .not('student_name', 'is', null)
        .order('event_timestamp', { ascending: false }),
    ]);

    // Group all activities by student name
    const studentMap = new Map<string, StudentActivity>();

    // Helper to initialize student entry
    const getOrCreateStudent = (name: string): StudentActivity => {
      if (!studentMap.has(name)) {
        studentMap.set(name, {
          studentName: name,
          totalEntries: 0,
          activities: {
            vitals: [],
            medications: [],
            labOrders: [],
            labAcknowledgements: [],
            doctorsOrders: [],
            patientNotes: [],
            handoverNotes: [],
            hacmapDevices: [],
            hacmapWounds: [],
            deviceAssessments: [], // ✅ NEW: hacMap v2
            woundAssessments: [], // ✅ NEW: hacMap v2
            bowelAssessments: [],
            intakeOutput: [],
          },
        });
      }
      return studentMap.get(name)!;
    };

    // Process vitals
    vitalsData.data?.forEach((vital: any) => {
      const student = getOrCreateStudent(vital.student_name);
      student.activities.vitals.push({
        id: vital.id,
        recorded_at: vital.recorded_at,
        blood_pressure_systolic: vital.blood_pressure_systolic,
        blood_pressure_diastolic: vital.blood_pressure_diastolic,
        heart_rate: vital.heart_rate,
        respiratory_rate: vital.respiratory_rate,
        temperature: vital.temperature,
        oxygen_saturation: vital.oxygen_saturation,
        pain_score: vital.pain_score,
      });
      student.totalEntries++;
    });

    // Process medication administrations (BCMA)
    console.log('💊 Processing medications:', medicationsData.data?.length || 0);
    medicationsData.data?.forEach((med: any) => {
      console.log('💊 Med student_name:', med.student_name, 'medication:', med.medication_name);
      if (!med.student_name) {
        console.warn('⚠️ Medication missing student_name:', med);
        return;
      }
      const student = getOrCreateStudent(med.student_name);
      student.activities.medications.push({
        id: med.id,
        timestamp: med.timestamp,
        medication_name: med.medication_name,
        dosage: med.dosage,
        route: med.route,
        status: med.status,
        notes: med.notes,
        // ✅ BCMA compliance tracking
        barcode_scanned: med.barcode_scanned,
        patient_barcode_scanned: med.patient_barcode_scanned,
        medication_barcode_scanned: med.medication_barcode_scanned,
        override_reason: med.override_reason,
        witness_name: med.witness_name,
      });
      student.totalEntries++;
    });

    // Process lab orders
    labOrdersData.data?.forEach((lab: any) => {
      const student = getOrCreateStudent(lab.student_name);
      student.activities.labOrders.push({
        id: lab.id,
        ordered_at: lab.created_at,  // Use created_at as the order timestamp
        test_name: lab.procedure_type,  // Use procedure_type as test name
        priority: 'ROUTINE',  // Default priority since not in schema
        specimen_type: lab.source_type,  // Use source_type as specimen
        status: lab.status,
      });
      student.totalEntries++;
    });

    // Process lab acknowledgements
    labAcksData.data?.forEach((lab: any) => {
      if (!lab.acknowledged_by_student) return; // Skip if no student name
      const student = getOrCreateStudent(lab.acknowledged_by_student);
      student.activities.labAcknowledgements.push({
        id: lab.id,
        acknowledged_at: lab.ack_at,
        test_name: lab.test_name,
        result_value: lab.value + (lab.units ? ' ' + lab.units : ''),
        abnormal_flag: lab.flag?.includes('abnormal') || lab.flag?.includes('critical') || false,
      });
      student.totalEntries++;
    });

    // Process doctor's orders acknowledgements
    doctorsOrdersData.data?.forEach((order: any) => {
      const student = getOrCreateStudent(order.acknowledged_by_student);
      student.activities.doctorsOrders.push({
        id: order.id,
        acknowledged_at: order.acknowledged_at,
        order_type: order.order_type,
        order_text: order.order_text,
        order_details: order.order_details,
      });
      student.totalEntries++;
    });

    // Process patient notes
    patientNotesData.data?.forEach((note: any) => {
      const student = getOrCreateStudent(note.student_name);
      student.activities.patientNotes.push({
        id: note.id,
        created_at: note.created_at,
        note_type: note.note_type,
        subject: note.subject,
        content: note.content,
      });
      student.totalEntries++;
    });

    // Process handover notes (only acknowledged ones)
    handoverNotesData.data?.forEach((note: any) => {
      // Only count handover notes that were acknowledged by a student
      if (note.student_name) {
        const student = getOrCreateStudent(note.student_name);
        student.activities.handoverNotes.push({
          id: note.id,
          created_at: note.created_at,
          situation: note.situation,
          background: note.background,
          assessment: note.assessment,
          recommendation: note.recommendation,
          student_name: note.student_name,
        });
        student.totalEntries++;
      }
    });

    // Process devices (from HAC Map)
    devicesData.data?.forEach((device: any) => {
      // Use inserted_by as student name (text field from form)
      const studentName = device.inserted_by;
      if (studentName) {
        const student = getOrCreateStudent(studentName);
        student.activities.hacmapDevices.push({
          id: device.id,
          created_at: device.created_at,
          type: device.type,
          placement_date: device.placement_date,
          inserted_by: device.inserted_by,
          location: device.location_id,
          site: device.notes,
          tube_size_fr: device.tube_size_fr,
          reservoir_type: device.reservoir_type,
          reservoir_size_ml: device.reservoir_size_ml,
          orientation: device.orientation,
          tube_number: device.tube_number,
          number_of_sutures_placed: device.number_of_sutures_placed,
          securement_method: device.securement_method,
          patient_tolerance: device.patient_tolerance,
        });
        student.totalEntries++;
      }
    });

    // Process wounds (from HAC Map)
    woundsData.data?.forEach((wound: any) => {
      // Use entered_by as student name (text field from form)
      const studentName = wound.entered_by;
      if (studentName) {
        const student = getOrCreateStudent(studentName);
        student.activities.hacmapWounds.push({
          id: wound.id,
          created_at: wound.created_at,
          wound_type: wound.wound_type,
          wound_description: wound.wound_description,
          wound_length_cm: wound.wound_length_cm,
          wound_width_cm: wound.wound_width_cm,
          wound_depth_cm: wound.wound_depth_cm,
          wound_stage: wound.wound_stage,
          wound_appearance: wound.wound_appearance,
          drainage_type: wound.drainage_description,
          drainage_amount: wound.drainage_amount,
          location: wound.location_id,
        });
        student.totalEntries++;
      }
    });

    // Process device assessments (hacMap v2) - NEW
    deviceAssessmentsData.data?.forEach((assessment: any) => {
      const student = getOrCreateStudent(assessment.student_name);
      student.activities.deviceAssessments.push({
        id: assessment.id,
        assessed_at: assessment.assessed_at,
        device_type: assessment.device_type,
        status: assessment.status,
        output_amount_ml: assessment.output_amount_ml,
        notes: assessment.notes,
        assessment_data: assessment.assessment_data, // JSONB with IV/Foley/Feeding Tube specific fields
      });
      student.totalEntries++;
    });

    // Process wound assessments (hacMap v2) - NEW
    woundAssessmentsData.data?.forEach((assessment: any) => {
      const student = getOrCreateStudent(assessment.student_name);
      student.activities.woundAssessments.push({
        id: assessment.id,
        assessed_at: assessment.assessed_at,
        site_condition: assessment.site_condition,
        pain_level: assessment.pain_level,
        wound_appearance: assessment.wound_appearance,
        drainage_type: assessment.drainage_type,
        drainage_amount: assessment.drainage_amount,
        treatment_applied: assessment.treatment_applied,
        dressing_type: assessment.dressing_type,
        notes: assessment.notes,
      });
      student.totalEntries++;
    });

    // Process bowel assessments
    bowelData.data?.forEach((bowel: any) => {
      const student = getOrCreateStudent(bowel.student_name);
      student.activities.bowelAssessments.push({
        id: bowel.id,
        created_at: bowel.created_at,
        bowel_incontinence: bowel.bowel_incontinence,
        stool_appearance: bowel.stool_appearance,
        stool_consistency: bowel.stool_consistency,
        stool_colour: bowel.stool_colour,
        stool_amount: bowel.stool_amount,
      });
      student.totalEntries++;
    });

    // Process intake & output events
    intakeOutputData.data?.forEach((io: any) => {
      const student = getOrCreateStudent(io.student_name);
      student.activities.intakeOutput.push({
        id: io.id,
        event_timestamp: io.event_timestamp,
        direction: io.direction,
        category: io.category,
        route: io.route,
        description: io.description,
        amount_ml: io.amount_ml,
      });
      student.totalEntries++;
    });

    // Convert map to array and sort by total entries
    return Array.from(studentMap.values()).sort((a, b) => b.totalEntries - a.totalEntries);
  } catch (error: any) {
    console.error('Error fetching student activities:', error);
    throw error;
  }
}

/**
 * Get activity summary for a specific student in a simulation
 */
export async function getStudentActivitySummary(
  simulationId: string,
  studentName: string
): Promise<StudentActivity | null> {
  const allActivities = await getStudentActivitiesBySimulation(simulationId);
  return allActivities.find(activity => activity.studentName === studentName) || null;
}
