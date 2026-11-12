import type { VitalSigns } from '../patients/types/patient';
import { assessVitalSign, type VitalStatus } from '../../utils/vitalRanges';

export interface VitalsGlanceRow {
  key: 'temperature' | 'heartRate' | 'bloodPressure' | 'respiratoryRate' | 'oxygenSaturation';
  label: string;
  latest: string;
  /** One line per series (BP has systolic and diastolic), oldest → newest */
  series: number[][];
  status: VitalStatus;
}

const SPARK_POINTS = 12;
const SEVERITY: Record<VitalStatus, number> = { normal: 0, abnormal: 1, critical: 2 };
const worst = (a: VitalStatus, b: VitalStatus) => (SEVERITY[a] >= SEVERITY[b] ? a : b);

/**
 * Turn a patient's vitals history (newest first) into one row per vital: the latest reading,
 * its age-based status and the recent trend. Readings without that vital are skipped, so a
 * partial set (e.g. a newborn without BP) never blanks out the other rows.
 */
export function buildVitalsGlance(vitals: VitalSigns[], dateOfBirth?: string): VitalsGlanceRow[] {
  const pick = <T,>(get: (v: VitalSigns) => T | undefined): T[] =>
    vitals
      .map(get)
      .filter((x): x is T => x !== undefined && x !== null)
      .slice(0, SPARK_POINTS)
      .reverse();
  const status = (type: Parameters<typeof assessVitalSign>[0], value: number): VitalStatus =>
    dateOfBirth ? assessVitalSign(type, value, dateOfBirth).status : 'normal';

  const rows: VitalsGlanceRow[] = [];
  const single = (
    key: Exclude<VitalsGlanceRow['key'], 'bloodPressure'>,
    label: string,
    unit: string
  ) => {
    const values = pick((v) => v[key]);
    if (!values.length) return;
    const last = values[values.length - 1];
    rows.push({ key, label, latest: `${last}${unit}`, series: [values], status: status(key, last) });
  };

  single('temperature', 'Temp', ' °C');
  single('heartRate', 'Pulse', '');

  const bp = pick((v) => v.bloodPressure);
  if (bp.length) {
    const last = bp[bp.length - 1];
    rows.push({
      key: 'bloodPressure',
      label: 'BP',
      latest: `${last.systolic}/${last.diastolic}`,
      series: [bp.map((b) => b.systolic), bp.map((b) => b.diastolic)],
      status: worst(status('systolic', last.systolic), status('diastolic', last.diastolic)),
    });
  }

  single('respiratoryRate', 'Resp', '');
  single('oxygenSaturation', 'SpO₂', '%');
  return rows;
}
