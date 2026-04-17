import React, { useState } from 'react';
import { X, Printer } from 'lucide-react';
import { BarcodeGenerator } from '../../patients/components/BarcodeGenerator';
import type { PatientLabelData, MedicationLabelData } from '../../../services/operations/bulkLabelService';

// 5 fluorescent colors for per-patient label color-coding
export const PATIENT_COLORS = [
  { bg: '#d4f97a', border: '#8ab800', text: '#1a2600' },  // Pastel yellow-green
  { bg: '#a0fdf7', border: '#00b8a8', text: '#003530' },  // Pastel cyan
  { bg: '#f5fd8f', border: '#b8c200', text: '#2a2a00' },  // Pastel yellow
  { bg: '#f9a0d4', border: '#c4006a', text: '#1a0010' },  // Pastel pink
  { bg: '#ffc299', border: '#cc5500', text: '#1a0a00' },  // Pastel orange
];

// Sort patient IDs for deterministic color assignment across bracelets and medication labels
export function buildPatientColorMap(patientIds: string[]): Record<string, number> {
  const sorted = [...new Set(patientIds)].sort();
  const map: Record<string, number> = {};
  sorted.forEach((id, i) => { map[id] = i % PATIENT_COLORS.length; });
  return map;
}

export interface WindowWithJsBarcode extends Window {
  JsBarcode: (canvas: HTMLElement, text: string, options: Record<string, unknown>) => void;
}

export type SimulationParticipant = {
  user_profiles?: { first_name?: string; last_name?: string } | null;
  role?: string;
};

export function getInstructorNames(participants: SimulationParticipant[]): string {
  const names = participants
    .filter(p => p.role === 'instructor')
    .map(p => {
      const profile = p.user_profiles;
      if (!profile) return 'Unknown Instructor';
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Instructor';
    });
  return names.length > 0 ? names.join(', ') : 'No Instructor Assigned';
}
