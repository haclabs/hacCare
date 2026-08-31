/**
 * Medication Checklist Printer
 *
 * Pure utility — opens a new window and prints a checklist of medications
 * required for a simulation template, grouped by patient. Instructors use
 * this to gather physical medication stock before running a simulation.
 */

import { supabase } from '../lib/api/supabase';
import { secureLogger } from '../lib/security/secureLogger';
import { escapeHtml as e } from './sanitization';

interface ChecklistPatient {
  id: string;
  name: string;
  medications: { name: string; dosage: string; route: string; frequency: string }[];
}

export async function printMedicationChecklist(template: { id: string; name: string; tenant_id: string }): Promise<void> {
  if (!template?.tenant_id) {
    alert('Template tenant data not available.');
    return;
  }

  try {
    const [{ data: patients, error: patientsError }, { data: medications, error: medsError }] = await Promise.all([
      supabase
        .from('patients')
        .select('id, first_name, last_name')
        .eq('tenant_id', template.tenant_id)
        .order('last_name'),
      supabase
        .from('patient_medications')
        .select('name, dosage, route, frequency, patient_id, status')
        .eq('tenant_id', template.tenant_id)
        .order('name'),
    ]);

    if (patientsError) throw patientsError;
    if (medsError) throw medsError;

    const checklistPatients: ChecklistPatient[] = (patients || []).map((p) => ({
      id: p.id,
      name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
      medications: (medications || [])
        .filter((m) => m.patient_id === p.id && m.status !== 'Discontinued')
        .map((m) => ({ name: m.name, dosage: m.dosage, route: m.route, frequency: m.frequency })),
    }));

    const printWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
    if (!printWindow) {
      alert('Please allow popups to generate the checklist.');
      return;
    }

    const patientSections = checklistPatients.length > 0
      ? checklistPatients.map((p) => `
          <div class="patient-section">
            <div class="patient-name">${e(p.name) || 'Unnamed Patient'}</div>
            ${p.medications.length > 0
              ? `<table class="med-table">
                  <thead>
                    <tr><th class="check-col"></th><th>Medication</th><th>Dosage</th><th>Route</th><th>Frequency</th></tr>
                  </thead>
                  <tbody>
                    ${p.medications.map((m) => `
                      <tr>
                        <td class="check-col"><span class="checkbox"></span></td>
                        <td>${e(m.name)}</td>
                        <td>${e(m.dosage)}</td>
                        <td>${e(m.route)}</td>
                        <td>${e(m.frequency)}</td>
                      </tr>`).join('')}
                  </tbody>
                </table>`
              : '<p class="no-meds">No medications on file for this patient.</p>'
            }
          </div>`).join('')
      : '<p class="no-meds">No patients found in this template.</p>';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Medication Checklist - ${e(template.name)}</title>
          <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700&display=swap" rel="stylesheet" />
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #111827; background: #fff; }
            .container { max-width: 8.5in; margin: 0 auto; padding: 0.6in; }
            .header { text-align: center; border-bottom: 3px double #111827; padding-bottom: 12px; margin-bottom: 18px; }
            .logo { display: flex; align-items: stretch; justify-content: center; gap: 8px; margin-bottom: 8px; }
            .logo-bar { width: 3px; background: #3fbf9a; }
            .logo-text { font-family: 'Archivo', Helvetica, Arial, sans-serif; font-weight: 700; font-size: 24px; letter-spacing: -0.015em; line-height: 1; }
            .logo-hac { color: #4a4a46; }
            .logo-care { color: #3fbf9a; }
            .sim-name { font-size: 18px; font-weight: bold; }
            .doc-title { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #4b5563; margin-top: 2px; }
            .patient-section { margin-bottom: 22px; page-break-inside: avoid; }
            .patient-name { font-size: 14px; font-weight: bold; background: #f3f4f6; border-left: 4px solid #2563eb; padding: 6px 10px; margin-bottom: 8px; }
            .med-table { width: 100%; border-collapse: collapse; }
            .med-table th, .med-table td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; font-size: 12px; }
            .med-table th { background: #f9fafb; text-transform: uppercase; font-size: 10px; color: #4b5563; }
            .check-col { width: 30px; text-align: center; }
            .checkbox { display: inline-block; width: 14px; height: 14px; border: 2px solid #111827; }
            .no-meds { font-style: italic; color: #6b7280; padding: 6px 10px; }
            .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #d1d5db; font-size: 10px; color: #6b7280; text-align: center; }
            .action-buttons { position: fixed; top: 16px; right: 16px; display: flex; gap: 8px; }
            .btn { padding: 8px 14px; border: none; border-radius: 5px; cursor: pointer; font-size: 12px; font-weight: bold; }
            .btn-print { background: #2563eb; color: white; }
            .btn-close { background: #6b7280; color: white; }
            @media print {
              .action-buttons { display: none; }
              @page { margin: 0.5in; size: letter; }
            }
          </style>
        </head>
        <body>
          <div class="action-buttons">
            <button class="btn btn-print" onclick="window.print()">Print</button>
            <button class="btn btn-close" onclick="window.close()">Close</button>
          </div>
          <div class="container">
            <div class="header">
              <div class="logo">
                <span class="logo-bar"></span>
                <span class="logo-text"><span class="logo-hac">hac</span><span class="logo-care">Care</span></span>
              </div>
              <div class="sim-name">${e(template.name)}</div>
              <div class="doc-title">Medication Checklist</div>
            </div>
            ${patientSections}
            <div class="footer">Generated ${new Date().toLocaleString()} &middot; hacCare Simulation Platform</div>
          </div>
        </body>
      </html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } catch (error) {
    secureLogger.error('Error generating medication checklist:', error);
    alert('Failed to generate medication checklist.');
  }
}
