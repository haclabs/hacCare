import { Activity, ClipboardList, Droplets, Pill, type LucideIcon } from 'lucide-react';
import { ECHO_PATH } from './echoMode';

/** Bedside modules Echo offers for a patient, in tab-bar order. Meds is the default. */
export const ECHO_TABS = ['meds', 'vitals', 'io', 'orders'] as const;
export type EchoTab = (typeof ECHO_TABS)[number];

export const ECHO_TAB_ITEMS: { tab: EchoTab; label: string; Icon: LucideIcon }[] = [
  { tab: 'meds', label: 'Meds', Icon: Pill },
  { tab: 'vitals', label: 'Vitals', Icon: Activity },
  { tab: 'io', label: 'I&O', Icon: Droplets },
  { tab: 'orders', label: 'Orders', Icon: ClipboardList },
];

export function parseEchoTab(value: string | undefined): EchoTab {
  return (ECHO_TABS as readonly string[]).includes(value ?? '') ? (value as EchoTab) : 'meds';
}

export function echoPatientPath(patientId: string, tab: EchoTab = 'meds'): string {
  const base = `${ECHO_PATH}/patient/${patientId}`;
  return tab === 'meds' ? base : `${base}/${tab}`;
}
