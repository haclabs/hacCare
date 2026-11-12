import type { VitalSigns } from '../patients/types/patient';

export interface VitalsDraft {
  temperature: string;
  heartRate: string;
  systolic: string;
  diastolic: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  oxygenDelivery: string;
  oxygenFlowRate: string;
  studentName: string;
}

export const EMPTY_VITALS_DRAFT: VitalsDraft = {
  temperature: '',
  heartRate: '',
  systolic: '',
  diastolic: '',
  respiratoryRate: '',
  oxygenSaturation: '',
  oxygenDelivery: 'Room Air',
  oxygenFlowRate: 'N/A',
  studentName: '',
};

export const OXYGEN_DELIVERY_OPTIONS = [
  'Room Air', 'Nasal Prongs', 'Simple Mask', 'Non-Rebreather', 'Partial Rebreather',
  'High Flow', 'BiPAP', 'Bag Valve Mask', 'Tracheostomy', 'Aerosol Mask',
];
export const OXYGEN_FLOW_OPTIONS = [
  'N/A', '<1L', ...Array.from({ length: 15 }, (_, i) => `${i + 1}L`), '>15L',
];

// Same input limits as the desktop VitalSignsField (RR widened for newborns)
const LIMITS = {
  temperature: { label: 'Temperature', min: 35, max: 42 },
  heartRate: { label: 'Pulse', min: 30, max: 200 },
  systolic: { label: 'Systolic BP', min: 50, max: 250 },
  diastolic: { label: 'Diastolic BP', min: 30, max: 150 },
  respiratoryRate: { label: 'Respirations', min: 5, max: 80 },
  oxygenSaturation: { label: 'SpO₂', min: 70, max: 100 },
} as const;

export type VitalsDraftResult =
  | { ok: true; vitals: VitalSigns; studentName: string }
  | { ok: false; error: string };

/**
 * Validate a bedside vitals entry. Any subset of vitals may be recorded (a newborn may have no
 * BP), but at least one is required, BP must be a pair, and the student's name is required so
 * the reading is credited in the debrief.
 */
export function parseVitalsDraft(draft: VitalsDraft): VitalsDraftResult {
  const values: Partial<Record<keyof typeof LIMITS, number>> = {};
  for (const key of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    const raw = draft[key].trim();
    if (!raw) continue;
    const n = Number(raw);
    const { label, min, max } = LIMITS[key];
    if (!Number.isFinite(n) || n < min || n > max) {
      return { ok: false, error: `${label} must be between ${min} and ${max}.` };
    }
    values[key] = n;
  }

  if ((values.systolic === undefined) !== (values.diastolic === undefined)) {
    return { ok: false, error: 'Enter both systolic and diastolic, or leave blood pressure blank.' };
  }
  if (Object.keys(values).length === 0) {
    return { ok: false, error: 'Enter at least one vital sign.' };
  }
  const studentName = draft.studentName.trim();
  if (!studentName) {
    return { ok: false, error: 'Enter your name so this reading is credited to you.' };
  }

  return {
    ok: true,
    studentName,
    vitals: {
      temperature: values.temperature,
      heartRate: values.heartRate,
      respiratoryRate: values.respiratoryRate,
      oxygenSaturation: values.oxygenSaturation,
      bloodPressure:
        values.systolic !== undefined && values.diastolic !== undefined
          ? { systolic: values.systolic, diastolic: values.diastolic }
          : undefined,
      oxygenDelivery: draft.oxygenDelivery,
      oxygenFlowRate: draft.oxygenFlowRate,
      lastUpdated: new Date().toISOString(),
    },
  };
}
